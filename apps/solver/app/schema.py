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
    restHoursAfter: int | None = None  # rest required before the member's next shift
    requirements: list[Requirement] = []


class Member(BaseModel):
    id: str
    skills: list[str] = []
    maxHoursPerWeek: int | None = None
    eligibleShiftIds: list[str] = []


class Lock(BaseModel):
    shiftId: str
    memberId: str


class Rules(BaseModel):
    minRestHours: int | None = None
    maxHoursPerWeek: int | None = None
    maxConsecutiveDays: int | None = None


class SolveRequest(BaseModel):
    scheduleId: str
    shifts: list[Shift] = []
    members: list[Member] = []
    locked: list[Lock] = []
    rules: Rules = Rules()


class Assignment(BaseModel):
    shiftId: str
    memberId: str


class SolveResponse(BaseModel):
    assignments: list[Assignment] = []
    diagnostics: dict = {}
