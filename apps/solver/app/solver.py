"""CP-SAT model for staff scheduling.

v1 hard/soft scope:
  - eligibility: a member can only fill shifts in their eligibleShiftIds;
  - headcount requirements via slot variables — distinct people, a multi-skilled
    person fills at most one slot per shift (counts once);
  - no double-booking across overlapping shifts;
  - locked assignments are fixed;
  - coverage requirements + understaffing are soft (minimise unfilled).

Deferred to later phases: hours / rest / consecutive-day limits, fairness, preferences.
"""

from __future__ import annotations

from datetime import datetime

from ortools.sat.python import cp_model

from .schema import Assignment, SolveRequest, SolveResponse

SOLVE_TIME_LIMIT_SECONDS = 10.0
COVERAGE_PENALTY = 5  # cost of an uncovered capability vs one missing headcount


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def solve_schedule(req: SolveRequest) -> SolveResponse:
    model = cp_model.CpModel()

    member_skills = {m.id: set(m.skills) for m in req.members}
    eligible = {m.id: set(m.eligibleShiftIds) for m in req.members}
    start = {s.id: _parse(s.startAt) for s in req.shifts}
    end = {s.id: _parse(s.endAt) for s in req.shifts}

    fill: dict[tuple[str, str, str], cp_model.IntVar] = {}
    works: dict[tuple[str, str], cp_model.IntVar] = {}
    headcount_slack: list[tuple[str, str | None, cp_model.IntVar]] = []
    coverage_slack: list[tuple[str, str | None, cp_model.IntVar]] = []

    # Headcount requirements -> slot variables.
    for shift in req.shifts:
        for req_line in shift.requirements:
            if req_line.type != "headcount":
                continue
            key = req_line.skillId or ""
            count = req_line.count or 0
            qualified = [
                m for m in req.members
                if shift.id in eligible[m.id]
                and (req_line.skillId is None or req_line.skillId in member_skills[m.id])
            ]
            for m in qualified:
                fill[(m.id, shift.id, key)] = model.NewBoolVar(f"fill_{m.id}_{shift.id}_{key}")
            slack = model.NewIntVar(0, count, f"hslack_{shift.id}_{key}")
            model.Add(sum(fill[(m.id, shift.id, key)] for m in qualified) + slack == count)
            headcount_slack.append((shift.id, req_line.skillId, slack))

    # works[m, s] = whether member m is on shift s (at most one slot per shift).
    for m in req.members:
        for shift in req.shifts:
            slots = [v for (mid, sid, _), v in fill.items() if mid == m.id and sid == shift.id]
            if not slots:
                continue
            w = model.NewIntVar(0, 1, f"works_{m.id}_{shift.id}")
            model.Add(w == sum(slots))  # domain 0..1 forces "one slot per shift"
            works[(m.id, shift.id)] = w

    # No double-booking across overlapping shifts.
    shift_ids = [s.id for s in req.shifts]
    for i, s1 in enumerate(shift_ids):
        for s2 in shift_ids[i + 1:]:
            if start[s1] < end[s2] and end[s1] > start[s2]:
                for m in req.members:
                    a, b = works.get((m.id, s1)), works.get((m.id, s2))
                    if a is not None and b is not None:
                        model.Add(a + b <= 1)

    # Locked assignments: fix on, and keep overlapping shifts off for that member.
    for lock in req.locked:
        w = works.get((lock.memberId, lock.shiftId))
        if w is not None:
            model.Add(w == 1)
        locked_start, locked_end = start.get(lock.shiftId), end.get(lock.shiftId)
        if locked_start is None:
            continue
        for shift in req.shifts:
            if shift.id == lock.shiftId:
                continue
            if start[shift.id] < locked_end and end[shift.id] > locked_start:
                other = works.get((lock.memberId, shift.id))
                if other is not None:
                    model.Add(other == 0)

    # Coverage requirements (soft): some member on the shift must hold the skill.
    for shift in req.shifts:
        for req_line in shift.requirements:
            if req_line.type != "coverage" or req_line.skillId is None:
                continue
            holders = [
                works[(m.id, shift.id)]
                for m in req.members
                if (m.id, shift.id) in works and req_line.skillId in member_skills[m.id]
            ]
            cov = model.NewBoolVar(f"cslack_{shift.id}_{req_line.skillId}")
            model.Add(sum(holders) + cov >= 1)
            coverage_slack.append((shift.id, req_line.skillId, cov))

    model.Minimize(
        sum(s for _, _, s in headcount_slack)
        + COVERAGE_PENALTY * sum(c for _, _, c in coverage_slack)
    )

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
        for sid, skill, s in headcount_slack
        if solver.Value(s) > 0
    ]
    uncovered = [
        {"shiftId": sid, "skillId": skill}
        for sid, skill, c in coverage_slack
        if solver.Value(c) == 1
    ]

    return SolveResponse(
        assignments=[Assignment(shiftId=sid, memberId=mid) for (mid, sid) in assignments],
        diagnostics={
            "solver": "ortools",
            "status": "optimal" if status == cp_model.OPTIMAL else "feasible",
            "objective": solver.ObjectiveValue(),
            "unfilled": unfilled,
            "uncovered": uncovered,
        },
    )
