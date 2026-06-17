# Staffly solver

OR-Tools CP-SAT scheduling service. Consumes the solve request built by
`core-api` (`SolveRequestBuilder`) and returns assignments + diagnostics.

## Run

Requires the devenv Python venv (added in `devenv.nix`). After a `direnv reload`
(or re-entering the shell so the venv builds):

```bash
uvicorn app.main:app --reload --port 8001   # from apps/solver (:8000 is core-api)
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

Point core-api at it with `SOLVER_URL=http://127.0.0.1:8001` (the port it uses in
the devenv stack, where core-api owns `:8000`). `SOLVER_URL` must not equal
core-api's own port, or a synchronous `/solve/preview` deadlocks the single-process
`artisan serve` until the timeout. core-api always solves via this service — there
is no in-process fallback, so it must be running, including for the core-api test
suite.
