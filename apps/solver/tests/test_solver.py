"""Solver tests. Run from apps/solver:  python -m pytest  (or  python tests/test_solver.py)."""

from datetime import datetime, timedelta

from app.schema import Lock, Member, Preference, Requirement, Shift, SolveRequest
from app.solver import BIWEEKLY_ANCHOR, _bucket, solve_schedule

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


def test_reports_member_dissatisfaction():
    # The weekend-avoider forced onto Saturday has a positive realised penalty.
    req = SolveRequest(
        scheduleId="s",
        shifts=[_shift("sat", SATURDAY, [Requirement(type="headcount", skillId="cook", count=1)])],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["sat"],
                   preferences=[Preference(type="weekend", params={"mode": "avoid"}, weight=5)]),
        ],
    )
    res = solve_schedule(req)
    assert {a.memberId for a in res.assignments} == {"m1"}
    assert res.diagnostics["memberDissatisfaction"]["m1"] > 0


def test_history_bias_spares_the_previously_worst_off():
    # One weekend shift both cooks dislike equally; the member who suffered last
    # period (high priorDissatisfaction) is spared and the other takes the hit.
    # Flipping which member carries the history flips the assignment -> rotation.
    def build(prior_m1, prior_m2):
        return SolveRequest(
            scheduleId="s",
            shifts=[_shift("sat", SATURDAY, [Requirement(type="headcount", skillId="cook", count=1)])],
            members=[
                Member(id="m1", skills=["cook"], eligibleShiftIds=["sat"], priorDissatisfaction=prior_m1,
                       preferences=[Preference(type="weekend", params={"mode": "avoid"}, weight=5)]),
                Member(id="m2", skills=["cook"], eligibleShiftIds=["sat"], priorDissatisfaction=prior_m2,
                       preferences=[Preference(type="weekend", params={"mode": "avoid"}, weight=5)]),
            ],
            objective={"lambda": 1.0},
        )

    assert {a.memberId for a in solve_schedule(build(500_000, 0)).assignments} == {"m2"}
    assert {a.memberId for a in solve_schedule(build(0, 500_000)).assignments} == {"m1"}


def _cook():
    return [Requirement(type="headcount", skillId="cook", count=1)]


def _day_shift(sid, date, cat="day"):
    return Shift(id=sid, startAt=f"{date}T09:00:00", endAt=f"{date}T17:00:00",
                 category=cat, requirements=_cook())


def test_max_consecutive_days_penalty_reported_when_unavoidable():
    # Sole cook, two consecutive single-cook days, cap 1 -> staffing forces both,
    # the violation surfaces as dissatisfaction.
    req = SolveRequest(
        scheduleId="s",
        shifts=[_day_shift("mon", "2026-06-15"), _day_shift("tue", "2026-06-16")],
        members=[Member(id="m1", skills=["cook"], eligibleShiftIds=["mon", "tue"],
                        preferences=[Preference(type="max_consecutive_days", params={"max": 1}, weight=5)])],
    )
    res = solve_schedule(req)
    assert len(res.assignments) == 2
    assert res.diagnostics["memberDissatisfaction"]["m1"] > 0


def test_max_consecutive_days_steers_to_break_runs():
    # 3 consecutive single-cook days, two cooks; m1 capped at 1 -> m1 never lands
    # on two consecutive days (m2 absorbs the run).
    req = SolveRequest(
        scheduleId="s",
        shifts=[_day_shift("mon", "2026-06-15"), _day_shift("tue", "2026-06-16"), _day_shift("wed", "2026-06-17")],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["mon", "tue", "wed"],
                   preferences=[Preference(type="max_consecutive_days", params={"max": 1}, weight=5)]),
            Member(id="m2", skills=["cook"], eligibleShiftIds=["mon", "tue", "wed"]),
        ],
    )
    res = solve_schedule(req)
    assert len(res.assignments) == 3
    order = {"mon": 0, "tue": 1, "wed": 2}
    idx = sorted(order[a.shiftId] for a in res.assignments if a.memberId == "m1")
    assert all(b - a > 1 for a, b in zip(idx, idx[1:]))


def test_avoid_fast_rotation_penalty_reported_when_unavoidable():
    # Sole cook works a day shift then a night shift next day -> rotation penalty.
    night = Shift(id="tue", startAt="2026-06-16T17:00:00", endAt="2026-06-16T23:00:00",
                  category="night", requirements=_cook())
    req = SolveRequest(
        scheduleId="s",
        shifts=[_day_shift("mon", "2026-06-15"), night],
        members=[Member(id="m1", skills=["cook"], eligibleShiftIds=["mon", "tue"],
                        preferences=[Preference(type="avoid_fast_rotation", weight=5)])],
    )
    res = solve_schedule(req)
    assert len(res.assignments) == 2
    assert res.diagnostics["memberDissatisfaction"]["m1"] > 0


def test_avoid_fast_rotation_steers_to_split_categories():
    # A day shift and a next-day night shift, two cooks; m1 avoids rotation ->
    # m1 does not take both.
    night = Shift(id="tue", startAt="2026-06-16T17:00:00", endAt="2026-06-16T23:00:00",
                  category="night", requirements=_cook())
    req = SolveRequest(
        scheduleId="s",
        shifts=[_day_shift("mon", "2026-06-15"), night],
        members=[
            Member(id="m1", skills=["cook"], eligibleShiftIds=["mon", "tue"],
                   preferences=[Preference(type="avoid_fast_rotation", weight=5)]),
            Member(id="m2", skills=["cook"], eligibleShiftIds=["mon", "tue"]),
        ],
    )
    res = solve_schedule(req)
    m1 = {a.shiftId for a in res.assignments if a.memberId == "m1"}
    assert m1 != {"mon", "tue"}


def test_biweekly_buckets_are_contiguous_fortnights_from_the_anchor():
    base = datetime.combine(BIWEEKLY_ANCHOR, datetime.min.time())

    def idx(days):
        return _bucket(base + timedelta(days=days), "biweekly")[1]

    assert idx(0) == 0
    assert idx(13) == 0      # last day of the first fortnight
    assert idx(14) == 1      # next fortnight starts cleanly
    assert idx(27) == 1
    assert idx(28) == 2
    assert idx(-1) == -1     # the day before the anchor is the previous fortnight


def test_biweekly_does_not_split_a_fortnight_across_a_year_boundary():
    # Two dates 6 days apart spanning new year land in the same fortnight,
    # unlike the old (year, isoweek//2) scheme which reset at the boundary.
    a = datetime(2025, 12, 30)
    b = datetime(2026, 1, 5)
    assert _bucket(a, "biweekly") == _bucket(b, "biweekly")


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("all passed")
