from fastapi import FastAPI

from .schema import SolveRequest, SolveResponse
from .solver import solve_schedule

app = FastAPI(title="Staffly Solver")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/solve", response_model=SolveResponse)
def solve(request: SolveRequest) -> SolveResponse:
    return solve_schedule(request)
