"""CP-SAT model for staff scheduling.

Hard: eligibility, headcount (slot vars — distinct people, multi-skilled counts
once), rest/no-double-booking, locked assignments, effective-hard preferences.

Soft: coverage + understaffing (always minimised first), then preferences with
per-member weight normalisation, seniority priority, and a lambda equity dial.
"""

from __future__ import annotations

from datetime import datetime

from ortools.sat.python import cp_model

from .schema import Assignment, Member, Shift, SolveRequest, SolveResponse

SOLVE_TIME_LIMIT_SECONDS = 10.0
COVERAGE_PENALTY = 5
SCALE = 100_000          # fixed-point scale for normalised penalties
STAFF_WEIGHT = 10 ** 12  # staffing dominates preferences


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _bucket(dt: datetime, period: str) -> tuple:
    iso = dt.isocalendar()
    if period == "week":
        return (iso.year, iso.week)
    if period == "biweekly":
        return (iso.year, iso.week // 2)
    return (dt.year, dt.month)  # month


def solve_schedule(req: SolveRequest) -> SolveResponse:
    model = cp_model.CpModel()

    member_skills = {m.id: set(m.skills) for m in req.members}
    eligible = {m.id: set(m.eligibleShiftIds) for m in req.members}
    start = {s.id: _parse(s.startAt) for s in req.shifts}
    end = {s.id: _parse(s.endAt) for s in req.shifts}
    rest = {s.id: (s.restHoursAfter or 0) for s in req.shifts}
    weekend = {s.id: start[s.id].isoweekday() >= 6 for s in req.shifts}
    weekday = {s.id: start[s.id].isoweekday() for s in req.shifts}
    category = {s.id: s.category for s in req.shifts}
    # Duration in deci-hours (0.1h) keeps hour penalties integer with precision.
    dur = {s.id: round((end[s.id] - start[s.id]).total_seconds() / 360) for s in req.shifts}
    bucket = {s.id: _bucket(start[s.id], req.payrollPeriod) for s in req.shifts}

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
                if w is None or not _hard_forbids(pref, sid, category, weekday, weekend):
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
        wd = _member_dissatisfaction(model, m, works, dur, bucket, weekend, weekday, category)
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
        obj += (100 - lam) * sum(member_wd.values()) + lam * n * worst

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


def _hard_forbids(pref, sid, category, weekday, weekend) -> bool:
    p = pref.params
    if pref.type == "preferred_shift_type":
        return category[sid] != p.get("type")
    if pref.type == "preferred_days_off":
        return weekday[sid] in (p.get("days") or [])
    if pref.type == "weekend":
        return weekend[sid] if p.get("mode") == "avoid" else not weekend[sid]
    return False


def _member_dissatisfaction(model, member: Member, works, dur, bucket, weekend, weekday, category):
    """Linear expr = priority * Σ_p (normalised weight · normalised penalty). None if no soft prefs."""
    soft = [p for p in member.preferences if not p.effectiveHard]
    total_weight = sum(p.weight for p in soft)
    if total_weight == 0:
        return None

    my_shifts = [sid for (mid, sid) in works if mid == member.id]
    terms = []

    for pref in soft:
        raw, norm = _penalty(model, pref, member, my_shifts, works, dur, bucket, weekend, weekday, category)
        if raw is None or norm <= 0:
            continue
        # coef folds priority, normalised weight and the per-type normaliser.
        coef = round(SCALE * member.priority * (pref.weight / total_weight) / norm)
        if coef > 0:
            terms.append(coef * raw)

    return sum(terms) if terms else None


def _penalty(model, pref, member, my_shifts, works, dur, bucket, weekend, weekday, category):
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
        t = p.get("type")
        hit = [sid for sid in my_shifts if category[sid] != t]
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

    return (None, 0)
