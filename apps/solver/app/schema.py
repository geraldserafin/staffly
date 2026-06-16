"""Solve request/response contract — mirrors core-api's SolveRequestBuilder output."""

from __future__ import annotations

from pydantic import BaseModel


class Requirement(BaseModel):
    type: str  # "headcount" | "coverage"
    skillId: str | None = None
    count: int | None = None


class Shift(BaseModel):
    id: str
    startAt: str  # ISO 8601
    endAt: str
    category: str | None = None  # e.g. "day"/"night" — matched by preferred_shift_type
    restHoursAfter: int | None = None  # rest required before the member's next shift
    requirements: list[Requirement] = []


class Preference(BaseModel):
    type: str
    params: dict = {}
    weight: int = 3
    effectiveHard: bool = False


class Member(BaseModel):
    id: str
    priority: int = 1
    skills: list[str] = []
    eligibleShiftIds: list[str] = []
    preferences: list[Preference] = []
    # Decayed dissatisfaction carried from recent published periods (history-based
    # fairness). Same fixed-point scale as the per-period WD[m] the solver builds.
    priorDissatisfaction: int = 0


class Lock(BaseModel):
    shiftId: str
    memberId: str


class Rules(BaseModel):
    minRestHours: int | None = None
    maxHoursPerWeek: int | None = None
    maxConsecutiveDays: int | None = None


class SolveRequest(BaseModel):
    scheduleId: str
    payrollPeriod: str = "month"  # week | biweekly | month
    shifts: list[Shift] = []
    members: list[Member] = []
    locked: list[Lock] = []
    rules: Rules = Rules()
    objective: dict = {}  # { "lambda": 0..1 equity dial }


class Assignment(BaseModel):
    shiftId: str
    memberId: str


class SolveResponse(BaseModel):
    assignments: list[Assignment] = []
    diagnostics: dict = {}
