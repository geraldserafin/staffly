"""Solver tests. Run from apps/solver:  python -m pytest  (or  python tests/test_solver.py)."""

from app.schema import Lock, Member, Preference, Requirement, Shift, SolveRequest
from app.solver import solve_schedule

DAY = ("2026-06-15T09:00:00", "2026-06-15T17:00:00")          # Monday
EVENING = ("2026-06-15T16:00:00", "2026-06-16T00:30:00")     # overlaps DAY 16:00-17:00
SATURDAY = ("2026-06-20T09:00:00", "2026-06-20T17:00:00")


def _shift(sid, window, reqs):
    return Shift(id=sid, startAt=window[0], endAt=window[1], requirements=reqs)


def test_headcount_fills_from_eligible_skilled_members():
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("sh1", DAY, [Requirement(type="headcount", skillId="cook", count=2)])],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["sh1"]),
            Member(id="m2", skills=["cook"], eligibleShiftIds=["sh1"]),
            Member(id="m3", skills=["cook"], eligibleShiftIds=[]),      # not available
            Member(id="m4", skills=["waiter"], eligibleShiftIds=["sh1"]),  # wrong skill
        ],
    )
    res = solve_schedule(req)
    assert {a.memberId for a in res.assignments} == {"m1", "m2"}
    assert res.diagnostics["unfilled"] == []


def test_reports_unfilled_when_short():
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("sh1", DAY, [Requirement(type="headcount", skillId="cook", count=3)])],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["sh1"]),
            Member(id="m2", skills=["cook"], eligibleShiftIds=["sh1"]),
        ],
    )
    res = solve_schedule(req)
    assert len(res.assignments) == 2
    assert res.diagnostics["unfilled"] == [{"shiftId": "sh1", "skillId": "cook", "short": 1}]


def test_multi_skilled_person_counts_once_per_shift():
    # One person, two single-headcount reqs on the same shift -> can only fill one.
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("sh1", DAY, [
            Requirement(type="headcount", skillId="cook", count=1),
            Requirement(type="headcount", skillId="waiter", count=1),
        ])],
        members=[Member(id="m1", skills=["cook", "waiter"], eligibleShiftIds=["sh1"])],
    )
    res = solve_schedule(req)
    # m1 fills exactly one slot; the other stays unfilled.
    assert len([a for a in res.assignments if a.memberId == "m1"]) == 1
    assert len(res.diagnostics["unfilled"]) == 1


def test_no_double_booking_on_overlapping_shifts():
    req = SolveRequest(
        scheduleId="s",
        shifts=[
            _shift("day", DAY, [Requirement(type="headcount", skillId="cook", count=1)]),
            _shift("eve", EVENING, [Requirement(type="headcount", skillId="cook", count=1)]),
        ],
        members=[Member(id="m1", skills=["cook"], eligibleShiftIds=["day", "eve"])],
    )
    res = solve_schedule(req)
    # m1 can cover only one of the overlapping shifts.
    assert len(res.assignments) == 1
    assert len(res.diagnostics["unfilled"]) == 1


def test_rest_between_shifts():
    # Two adjacent shifts; the first requires 11h rest -> a member can't do both.
    early = Shift(id="early", startAt="2026-06-15T09:00:00", endAt="2026-06-15T17:00:00",
                  restHoursAfter=11, requirements=[Requirement(type="headcount", skillId="cook", count=1)])
    late = Shift(id="late", startAt="2026-06-15T17:00:00", endAt="2026-06-15T21:00:00",
                 requirements=[Requirement(type="headcount", skillId="cook", count=1)])
    req = SolveRequest(
        scheduleId="s",
        shifts=[early, late],
        members=[Member(id="m1", skills=["cook"], eligibleShiftIds=["early", "late"])],
    )
    res = solve_schedule(req)
    assert len(res.assignments) == 1
    assert len(res.diagnostics["unfilled"]) == 1


def test_locked_assignment_is_kept():
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("sh1", DAY, [Requirement(type="headcount", skillId="cook", count=2)])],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["sh1"]),
            Member(id="m2", skills=["cook"], eligibleShiftIds=["sh1"]),
        ],
        locked=[Lock(shiftId="sh1", memberId="m1")],
    )
    res = solve_schedule(req)
    assert ("m1", "sh1") in {(a.memberId, a.shiftId) for a in res.assignments}
    assert len(res.assignments) == 2


def test_soft_preference_steers_choice():
    # Saturday shift, one slot, two cooks; m1 dislikes weekends -> m2 chosen.
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("sat", SATURDAY, [Requirement(type="headcount", skillId="cook", count=1)])],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["sat"],
                   preferences=[Preference(type="weekend", params={"mode": "avoid"}, weight=5)]),
            Member(id="m2", skills=["cook"], eligibleShiftIds=["sat"]),
        ],
    )
    res = solve_schedule(req)
    assert {a.memberId for a in res.assignments} == {"m2"}


def test_hard_preference_forbids_assignment():
    # m1's only candidate, but hard "days off Monday" -> shift left unfilled.
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("mon", DAY, [Requirement(type="headcount", skillId="cook", count=1)])],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["mon"],
                   preferences=[Preference(type="preferred_days_off", params={"days": [1]},
                                           weight=3, effectiveHard=True)]),
        ],
    )
    res = solve_schedule(req)
    assert res.assignments == []
    assert len(res.diagnostics["unfilled"]) == 1


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("all passed")
