# Staffly solver

OR-Tools CP-SAT scheduling service. Consumes the solve request built by
`core-api` (`SolveRequestBuilder`) and returns assignments + diagnostics.

## Run

Requires the devenv Python venv (added in `devenv.nix`). After a `direnv reload`
(or re-entering the shell so the venv builds):

```bash
uvicorn app.main:app --reload --port 8000   # from apps/solver
```

- `GET  /health` → `{"status":"ok"}`
- `POST /solve`  → see `app/schema.py` for the contract

## Model (v1)

- eligibility (availability resolved upstream in core-api),
- headcount via slot variables — distinct people, multi-skilled counts once,
- no double-booking across overlapping shifts,
- locked assignments fixed,
- coverage + understaffing soft (minimise unfilled).

Deferred: hours / rest / consecutive limits, fairness, preferences.

## Wiring

Point core-api at it: `SOLVER_DRIVER=http` and `SOLVER_URL=http://127.0.0.1:8000`.
