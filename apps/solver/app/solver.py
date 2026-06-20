"""CP-SAT model for staff scheduling.

Hard: eligibility, headcount (slot vars — distinct people, multi-skilled counts
once), rest/no-double-booking, locked assignments, effective-hard preferences.

Soft: coverage + understaffing (always minimised first), then preferences with
per-member weight normalisation, seniority priority, and a lambda equity dial.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from ortools.sat.python import cp_model

from .schema import Assignment, Member, Shift, SolveRequest, SolveResponse

SOLVE_TIME_LIMIT_SECONDS = 10.0
COVERAGE_PENALTY = 5
SCALE = 100_000          # fixed-point scale for normalised penalties
STAFF_WEIGHT = 10 ** 12  # staffing dominates preferences

# Fixed Monday that defines the biweekly fortnight phase. Buckets are true 14-day
# windows counted from here (contiguous, year-boundary-safe) rather than pairing
# ISO weeks. A future org-level payroll anchor can replace this constant.
BIWEEKLY_ANCHOR = date(2020, 1, 6)


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _bucket(dt: datetime) -> tuple:
    """Bucket a shift start by calendar month for hours_target averaging."""
    return (dt.year, dt.month)


def solve_schedule(req: SolveRequest) -> SolveResponse:
    model = cp_model.CpModel()

    member_skills = {m.id: set(m.skills) for m in req.members}
    eligible = {m.id: set(m.eligibleShiftIds) for m in req.members}
    start = {s.id: _parse(s.startAt) for s in req.shifts}
    end = {s.id: _parse(s.endAt) for s in req.shifts}
    rest = {s.id: (s.restHoursAfter or 0) for s in req.shifts}
    weekend = {s.id: start[s.id].isoweekday() >= 6 for s in req.shifts}
    weekday = {s.id: start[s.id].isoweekday() for s in req.shifts}
    template_id = {s.id: s.templateId for s in req.shifts}
    # Duration in deci-hours (0.1h) keeps hour penalties integer with precision.
    dur = {s.id: round((end[s.id] - start[s.id]).total_seconds() / 360) for s in req.shifts}
    bucket = {s.id: _bucket(start[s.id]) for s in req.shifts}

    def conflicts(a: str, b: str) -> bool:
        if start[a] <= start[b]:
            earlier_end, earlier_rest, later_start = end[a], rest[a], start[b]
        else:
            earlier_end, earlier_rest, later_start = end[b], rest[b], start[a]
        return (later_start - earlier_end).total_seconds() / 3600 < earlier_rest

    fill: dict[tuple[str, str, str], cp_model.IntVar] = {}
    works: dict[tuple[str, str], cp_model.IntVar] = {}
    headcount_slack: list[tuple[str, str | None, cp_model.IntVar]] = []
    coverage_slack: list[tuple[str, str | None, cp_model.IntVar]] = []

    for shift in req.shifts:
        for line in shift.requirements:
            if line.type != "headcount":
                continue
            key = line.skillId or ""
            count = line.count or 0
            qualified = [
                m for m in req.members
                if shift.id in eligible[m.id]
                and (line.skillId is None or line.skillId in member_skills[m.id])
            ]
            for m in qualified:
                fill[(m.id, shift.id, key)] = model.NewBoolVar(f"fill_{m.id}_{shift.id}_{key}")
            slack = model.NewIntVar(0, count, f"hslack_{shift.id}_{key}")
            model.Add(sum(fill[(m.id, shift.id, key)] for m in qualified) + slack == count)
            headcount_slack.append((shift.id, line.skillId, slack))

    for m in req.members:
        for shift in req.shifts:
            slots = [v for (mid, sid, _), v in fill.items() if mid == m.id and sid == shift.id]
            if not slots:
                continue
            w = model.NewIntVar(0, 1, f"works_{m.id}_{shift.id}")
            model.Add(w == sum(slots))
            works[(m.id, shift.id)] = w

    # No double-booking + rest.
    sids = [s.id for s in req.shifts]
    for i, s1 in enumerate(sids):
        for s2 in sids[i + 1:]:
            if conflicts(s1, s2):
                for m in req.members:
                    a, b = works.get((m.id, s1)), works.get((m.id, s2))
                    if a is not None and b is not None:
                        model.Add(a + b <= 1)

    for lock in req.locked:
        w = works.get((lock.memberId, lock.shiftId))
        if w is not None:
            model.Add(w == 1)
        if lock.shiftId not in start:
            continue
        for shift in req.shifts:
            if shift.id != lock.shiftId and conflicts(shift.id, lock.shiftId):
                other = works.get((lock.memberId, shift.id))
                if other is not None:
                    model.Add(other == 0)

    # Effective-hard preferences become constraints (forbid violating shifts).
    for m in req.members:
        for pref in m.preferences:
            if not pref.effectiveHard:
                continue
            for sid in (s.id for s in req.shifts):
                w = works.get((m.id, sid))
                if w is None or not _hard_forbids(pref, sid, template_id, weekday, weekend):
                    continue
                model.Add(w == 0)

    # Coverage (soft).
    for shift in req.shifts:
        for line in shift.requirements:
            if line.type != "coverage" or line.skillId is None:
                continue
            holders = [
                works[(m.id, shift.id)]
                for m in req.members
                if (m.id, shift.id) in works and line.skillId in member_skills[m.id]
            ]
            cov = model.NewBoolVar(f"cslack_{shift.id}_{line.skillId}")
            model.Add(sum(holders) + cov >= 1)
            coverage_slack.append((shift.id, line.skillId, cov))

    # Preference dissatisfaction per member (soft).
    member_wd = {}  # member id -> linear expression
    prior = {m.id: max(0, m.priorDissatisfaction) for m in req.members}
    for m in req.members:
        wd = _member_dissatisfaction(model, m, works, dur, bucket, weekend, weekday, template_id, start, end)
        if wd is not None:
            member_wd[m.id] = wd

    lam = max(0, min(100, round(float(req.objective.get("lambda", 0.3)) * 100)))
    n = max(1, len(member_wd))
    obj = STAFF_WEIGHT * (
        sum(s for _, _, s in headcount_slack) + COVERAGE_PENALTY * sum(c for _, _, c in coverage_slack)
    )
    if member_wd:
        # Equity protects the cumulative worst-off (this period + carried history),
        # so members shortchanged in past periods are favoured now.
        wd_bound = SCALE * 1000 + max(prior.values(), default=0)
        worst = model.NewIntVar(0, wd_bound, "worst")
        for mid, wd in member_wd.items():
            model.Add(worst >= prior.get(mid, 0) + wd)
        # max(1, ...) keeps a weight-1 ΣWD tiebreak even at λ=1 (pure equity). Without
        # it the sum term vanishes, leaving every non-worst member's dissatisfaction
        # unconstrained — the solver returns any max-min optimum, often inflating ΣWD.
        # The tiebreak picks the lowest-total solution among equal worst-off ones; the
        # worst term (weight λ·n) still dominates, so equity is unchanged.
        obj += max(1, 100 - lam) * sum(member_wd.values()) + lam * n * worst

    model.Minimize(obj)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = SOLVE_TIME_LIMIT_SECONDS
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolveResponse(assignments=[], diagnostics={"solver": "ortools", "status": "infeasible"})

    assignments = {(lock.memberId, lock.shiftId) for lock in req.locked}
    for (mid, sid), w in works.items():
        if solver.Value(w) == 1:
            assignments.add((mid, sid))

    unfilled = [
        {"shiftId": sid, "skillId": skill, "short": int(solver.Value(s))}
        for sid, skill, s in headcount_slack if solver.Value(s) > 0
    ]
    uncovered = [
        {"shiftId": sid, "skillId": skill}
        for sid, skill, c in coverage_slack if solver.Value(c) == 1
    ]

    # Realised per-member dissatisfaction — persisted on publish as next period's
    # history input (feeds priorDissatisfaction on future solves).
    member_dissatisfaction = {mid: int(solver.Value(wd)) for mid, wd in member_wd.items()}

    return SolveResponse(
        assignments=[Assignment(shiftId=sid, memberId=mid) for (mid, sid) in assignments],
        diagnostics={
            "solver": "ortools",
            "status": "optimal" if status == cp_model.OPTIMAL else "feasible",
            "objective": solver.ObjectiveValue(),
            "unfilled": unfilled,
            "uncovered": uncovered,
            "memberDissatisfaction": member_dissatisfaction,
        },
    )


def _hard_forbids(pref, sid, template_id, weekday, weekend) -> bool:
    p = pref.params
    if pref.type == "preferred_shift_type":
        return template_id[sid] not in (p.get("shiftIds") or [])
    if pref.type == "preferred_days_off":
        return weekday[sid] in (p.get("days") or [])
    if pref.type == "weekend":
        return weekend[sid] if p.get("mode") == "avoid" else not weekend[sid]
    return False


def _member_dissatisfaction(model, member: Member, works, dur, bucket, weekend, weekday, template_id, start, end):
    """Linear expr = priority * Σ_p (normalised weight · normalised penalty). None if no soft prefs."""
    soft = [p for p in member.preferences if not p.effectiveHard]
    total_weight = sum(p.weight for p in soft)
    if total_weight == 0:
        return None

    my_shifts = [sid for (mid, sid) in works if mid == member.id]
    terms = []

    for pref in soft:
        raw, norm = _penalty(model, pref, member, my_shifts, works, dur, bucket, weekend, weekday, template_id, start, end)
        if raw is None or norm <= 0:
            continue
        # coef folds priority, normalised weight and the per-type normaliser.
        coef = round(SCALE * member.priority * (pref.weight / total_weight) / norm)
        if coef > 0:
            terms.append(coef * raw)

    return sum(terms) if terms else None


def _penalty(model, pref, member, my_shifts, works, dur, bucket, weekend, weekday, template_id, start, end):
    """Return (raw_penalty_expr, normaliser) — raw is linear in the member's works vars."""
    p = pref.params
    w = lambda sid: works[(member.id, sid)]  # noqa: E731

    if pref.type == "weekend":
        avoid = p.get("mode") == "avoid"
        hit = [sid for sid in my_shifts if weekend[sid] == avoid]
        return (sum(w(sid) for sid in hit), len(hit)) if hit else (None, 0)

    if pref.type == "preferred_days_off":
        days = p.get("days") or []
        hit = [sid for sid in my_shifts if weekday[sid] in days]
        return (sum(w(sid) for sid in hit), len(hit)) if hit else (None, 0)

    if pref.type == "preferred_shift_type":
        wanted = set(p.get("shiftIds") or [])
        hit = [sid for sid in my_shifts if template_id[sid] not in wanted]
        return (sum(w(sid) for sid in hit), len(hit)) if hit else (None, 0)

    if pref.type == "hours_target":
        target = (p.get("target") or 0) * 10  # deci-hours
        if target <= 0 or not my_shifts:
            return (None, 0)
        buckets: dict[tuple, list[str]] = {}
        for sid in my_shifts:
            buckets.setdefault(bucket[sid], []).append(sid)
        devs = []
        for key, sids in buckets.items():
            actual = sum(dur[sid] * w(sid) for sid in sids)
            dev = model.NewIntVar(0, 10 ** 7, f"dev_{member.id}_{key}")
            model.Add(dev >= actual - target)
            model.Add(dev >= target - actual)
            devs.append(dev)
        return (sum(devs), target)

    if pref.type == "max_consecutive_days":
        cap = p.get("max") or 0
        if cap < 1 or not my_shifts:
            return (None, 0)
        worked = _worked_by_day(model, member, my_shifts, works, start)
        grid = _calendar_grid(worked.keys())
        window = cap + 1
        pens = []
        for i in range(len(grid) - window + 1):
            days = grid[i:i + window]
            # A gap day (no shift) can never be worked, so that window can't
            # exceed the cap — only count windows that are fully schedulable.
            if any(d not in worked for d in days):
                continue
            pen = model.NewBoolVar(f"consec_{member.id}_{i}")
            model.Add(pen >= sum(worked[d] for d in days) - cap)
            pens.append(pen)
        return (sum(pens), len(pens)) if pens else (None, 0)

    if pref.type == "avoid_fast_rotation":
        if not my_shifts:
            return (None, 0)
        # Penalise working a shift then another the *next* calendar day whose start
        # time swings hard on the clock (the day-after-night problem). Weight is a
        # precomputed constant per pair — bigger start-time swing = bigger penalty,
        # discounted when there is ample rest between the two shifts. See _rotation_weight.
        pens, total = [], 0
        for a in my_shifts:
            for b in my_shifts:
                if a == b or start[b].date() != start[a].date() + timedelta(days=1):
                    continue
                wgt = _rotation_weight(start[a], end[a], start[b])
                if wgt <= 0:
                    continue
                total += wgt
                pen = model.NewBoolVar(f"rot_{member.id}_{a}_{b}")
                model.Add(pen >= w(a) + w(b) - 1)
                pens.append(wgt * pen)
        return (sum(pens), total) if pens else (None, 0)

    return (None, 0)


def _rotation_weight(start_a: datetime, end_a: datetime, start_b: datetime) -> int:
    """Constant penalty for working shift A then shift B the next calendar day.

    Driven by the clock-distance between the two start times (0..12h): a ~2h
    stagger is fine, larger swings escalate superlinearly (day->night style).
    Discounted by the rest gap between A's end and B's start — once there is a
    full day (24h+) of recovery the penalty disappears entirely.
    """
    h_a = start_a.hour + start_a.minute / 60
    h_b = start_b.hour + start_b.minute / 60
    d = abs(h_a - h_b)
    clock = min(d, 24 - d)            # 0..12, circular
    over = max(0.0, clock - 2)        # 2h grace
    base = over * over                # 4h->4, 8h->36, 12h->100

    rest = (start_b - end_a).total_seconds() / 3600
    if rest >= 24:
        factor = 0.0
    elif rest <= 8:
        factor = 1.0
    else:
        factor = (24 - rest) / 16     # linear fade 8h->24h

    return round(base * factor)


def _worked_by_day(model, member, my_shifts, works, start):
    """date -> Bool that is 1 iff the member works any shift starting that day."""
    by_day: dict = {}
    for sid in my_shifts:
        by_day.setdefault(start[sid].date(), []).append(sid)
    worked = {}
    for day, sids in by_day.items():
        v = model.NewBoolVar(f"worked_{member.id}_{day}")
        for sid in sids:
            model.Add(v >= works[(member.id, sid)])
        model.Add(v <= sum(works[(member.id, sid)] for sid in sids))
        worked[day] = v
    return worked


def _calendar_grid(days):
    """All calendar dates from the earliest to latest worked day, inclusive."""
    days = sorted(days)
    if not days:
        return []
    grid, d = [], days[0]
    while d <= days[-1]:
        grid.append(d)
        d += timedelta(days=1)
    return grid
