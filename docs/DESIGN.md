# Staffly — Design & Architecture

A SaaS shift-scheduling platform. An organization defines who works (members),
where (teams/locations), what coverage is needed (shift templates), and the
system generates a schedule — by hand or via an OR-Tools optimizer that respects
hard rules and balances soft preferences fairly across people.

This document records the system design and **the reasoning behind every choice**,
so the "why" survives. It ends with the roadmap (decided vs. still open).

---

## 1. Product idea

- An **organization** signs up. It has a payroll period and one or more **teams**
  (locations, e.g. two restaurant branches).
- **Members** are the people. A member belongs to one org; the same person at two
  different companies is two members. A member can be on **many teams** within an
  org (a worker covering two locations).
- Managers define **shift templates** (recurring demand: "Mon–Fri 09–17, need 2
  cooks"). A **schedule** for a team+period materializes those into concrete
  **shifts**, which get **assignments** (member ↔ shift).
- Members submit **availability** (time off + recurring patterns) and
  **preferences** (preferred shift type, hours target, weekends, days off…).
- The **solver** fills shifts honoring hard constraints (availability, skills,
  rest, locked picks) and optimizing soft preferences with a fairness dial.
- Managers iterate: solve, lock the good bits, tweak, re-solve, publish.

---

## 2. Architecture

Monorepo under `apps/`:

| App | Stack | Role |
|-----|-------|------|
| `apps/core-api` | Laravel 13, PHP 8.5, PostgreSQL | JSON API, domain model, orchestration |
| `apps/solver` | Python, FastAPI, OR-Tools CP-SAT | Stateless optimizer service |

- **core-api** is API-only — no Blade, no Vite/npm; all HTML stripped. Every
  response is JSON, including errors (`shouldRenderJsonWhen(fn () => true)` +
  explicit `NotFoundHttpException`/`HttpExceptionInterface` renders so even a 404
  is `{"message":"Not Found"}` with no stack trace leaking in prod).
- **Routing has no `/api` prefix** — the whole app *is* the API (`apiPrefix: ''`).
- `devenv.nix` provides PHP, Node (tooling), PostgreSQL, and a Python venv
  (ortools/fastapi/uvicorn). Frontend (Angular) is planned, not built.
- VCS: git (a `jj` workflow was considered). Commits are small and per-feature.

### The two services and their boundary

core-api owns all data and all *deterministic* logic (calendar expansion,
availability resolution, eligibility). The solver is a **pure, stateless
optimizer**: it receives a flat JSON request and returns assignments +
diagnostics. It knows nothing about the database, recurrence, or jurisdictions.
This boundary is deliberate (see §6).

---

## 3. Conventions & patterns (core-api)

**Vertical slice architecture.** Code is split by domain, not by technical layer.
Each slice lives in `app/<Slice>/` and is self-contained:

```
app/<Slice>/
  Models/            Eloquent models
  Factories/         model factories (co-located, not central)
  Actions/           one class per business operation (handle())
  Http/Controllers/  thin HTTP glue
  Http/Requests/     FormRequests = input contracts (validation + authorize)
  Http/Resources/    output contracts (JSON shape)
  Enums/             PHP backed enums
  Routes/api.php     this slice's routes
  <Slice>ServiceProvider.php   registers routes (+ bindings)
```

Namespace root `App\` maps to `app/`, so `app/Teams/...` = `App\Teams\...` — no
composer autoload changes per slice.

**Dependency direction.** Slices depend *toward the core*. Organization is most
core; nothing depends on Scheduling. The arrow:

```
Organizations ← Members ← Teams ← Skills ← ShiftTemplates ← Scheduling
                                  ↖ Availability, Preferences feed Scheduling
```

Many-to-many relations are owned by the **more dependent** slice (Teams owns
`member_team`, Skills owns `member_skill`) to keep the arrow one-way and avoid
slice cycles. To list "a member's teams/skills" we query from the owning side,
never adding a reverse relation on Member.

**Actions.** Business logic lives in single-purpose Action classes
(`CreateOrganization`, `AssignMember`, `GenerateScheduleShifts`…), each with a
`handle()`. Controllers stay thin: validate (FormRequest) → call Action → return
Resource. Actions are reusable from controllers, jobs, events, tests.

**FormRequests = input contracts.** They run *before* the controller (resolved
by the container's `afterResolving` hook on `FormRequest`). `authorize()` +
`rules()`; invalid input → automatic 422 JSON, controller never runs. We also do
cross-entity checks here (e.g. assignment double-book overlap, same-org guards).

**Resources = output contracts.** camelCase JSON keys (`createdAt`,
`organizationId`). Relations exposed via `whenLoaded`.

**Cross-slice side effects → events.** Org creation fires
`OrganizationCreated`; the Teams slice listens (`CreateDefaultTeam`) and seeds a
"Main" team. Organizations stays ignorant of Teams (one-way: Teams listens).

**Other conventions:**
- **UUID v7 primary keys** everywhere (`HasUuids`), ordered, no integer leakage.
- **FK cascade** for ownership (`->constrained()->cascadeOnDelete()`); snapshot
  FKs use `nullOnDelete`.
- **Factories co-located** in the slice. A global resolver in `AppServiceProvider`
  maps `App\<Slice>\Models\X` → `App\<Slice>\Factories\XFactory`, so models carry
  no factory reference.
- **phpactor-clean.** We avoid Eloquent's magic statics that static analysis
  can't follow (`Model::create()`, `Model::where()`). Use `(new Model)->newQuery()`
  + declared Builder methods (`where`, `whereHas`, `get`, `firstOrNew`), and
  `new Model(...); ->save()` instead of `::create()`. No ide-helper/larastan
  needed.
- **Route-model binding param order matters.** Laravel binds multiple
  route-model params *positionally* when types differ, so controller method
  params must be declared in the **same order as the route segments**
  (`members/{member}/skills/{skill}` → `fn(Member $member, Skill $skill)`).
  Getting this reversed throws a `TypeError`. (Bit us once on `SkillController`.)
- **Status-on-create.** Enum-status columns have a DB default, but the in-memory
  model doesn't pick it up — Actions set `status` explicitly (`ScheduleStatus::Draft`)
  so the create response isn't a null status.

---

## 4. Domain model (slice by slice, with decisions)

### Organizations
`organizations`: `id`, `name`, `payroll_period` (`week|biweekly|month`, default
`month`).
- **payroll_period is org-level**, not per-member — payroll is a company cycle.
  It buckets hours for the `hours_target` preference.
- Creating an org fires `OrganizationCreated` → a default "Main" team. **Why:**
  the "invisible single team" UX — a single-location org never sees the team
  concept; the data layer always has ≥1 team so scheduling is uniform.

### Members
`members`: `id`, `organization_id`, `name`, `priority`.
- **Org-scoped.** One person at two companies = two members. A person on two
  teams in one org = one member on a `member_team` pivot twice.
- **`priority`** = manager-set seniority tier. Scales the member's weight in the
  solver's global objective (senior preferences count more). Deliberate,
  sanctioned inequality — distinct from preference weights.
- `user_id` (login account) is **deliberately deferred** — modeling members
  without auth lets us iterate; one user → many members across orgs is the
  intended future shape.

### Teams
`teams`: `id`, `organization_id`, `name`. `member_team` pivot (unique
`(team_id, member_id)`, cascade both).
- Teams = locations / schedulable groups. Schedules belong to a team.
- M2M owned by Teams (`Team::members()`). Cross-org guard on attach (422). Attach
  is idempotent (`syncWithoutDetaching`).
- **Why teams at all (vs. flat org):** auth boundary (a location manager),
  per-team solver isolation, settings cascade, reporting axis. The shared-worker
  case (one person, two locations) means scheduling is *not* fully separable —
  aggregate hour limits and double-booking cross team lines (handled via the
  solver's `priorCommitments`).

### Skills
`skills`: `id`, `organization_id`, `name` (unique per org). `member_skill` pivot.
- **Org-wide catalog**, not per-team — "Cook" means the same everywhere. Member↔
  skill is org-wide (a person's qualification is independent of team).
- M2M owned by Skills (`Skill::members()`); same one-way pattern as Teams.

### ShiftTemplates
`shift_templates`: `id`, `organization_id`, `team_id` (nullable), `name`,
`category`, `start_time`, `end_time`, `rest_hours_after`, `recurrence_frequency`,
`recurrence_days`. `shift_template_requirements`: `skill_id`, `type`, `count`,
`days`.
- **Org-owned, optional `team_id`.** Null = shared across all the org's teams;
  set = scoped to one team. (Manager instinct: "org-wide with a per-team option".)
- **Times only, overnight allowed** (`end < start` ⇒ crosses midnight). Resolved
  to datetimes when materialized, so day-spanning is unambiguous downstream.
- **Recurrence**: `recurrence_frequency` (`weekly|monthly`, null = non-recurring)
  + `recurrence_days` jsonb (weekly: ISO weekdays 1–7; monthly: days 1–31).
- **`category`** (e.g. "day"/"night"): arbitrary label matched by the
  `preferred_shift_type` preference.
- **`rest_hours_after`**: rest required after a shift before the member's next
  one. Per-shift because rest depends on shift length. Falls back to
  `team_rules.min_rest_hours`.
- **Staffing requirements — two types** (the key staffing design):
  - **headcount** `(skill|Any, count)` — needs `count` *distinct* people with the
    skill; a multi-skilled person fills one slot.
  - **coverage** `(skill)` — at least one *present* person holds the skill; no
    extra headcount (a person already on shift satisfies it free).
  This split cleanly expresses both "3 cooks + 2 waiters (5 people)" and "4 skills
  one flexible person can cover". A naive `(skill,count)` list can't do the
  latter; a naive skill-set can't do the former.
  - **Day-scoped requirement `days`** — a requirement line can apply only on
    certain weekdays (additive). "Base Cook×2 every day + Cook×1 on Mon/Fri
    (shipment)" → generation sums per day into one `Cook:3` Mon/Fri, `Cook:2`
    otherwise. **One shift row per day, count varies** — this is how "events"
    (shipment days, heavy traffic) are modeled without a separate events table
    (see §6).

### Scheduling
The core slice. `schedules`, `scheduled_shifts`, `shift_requirements`,
`shift_assignments`, `team_rules`, `solve_runs`, `member_satisfaction`.

- **Schedule** `id, team_id, name, start_date, end_date, status(draft|published|
  archived), weights(jsonb)`. The schedule *is* the working copy — `status=draft`
  is the editable state; publishing flips status (no copy, no second table).
  `weights` jsonb holds solver tuning (e.g. `lambda`).
- **ScheduledShift** `schedule_id, shift_template_id?(origin), name, category,
  start_at, end_at, rest_hours_after`. **Datetimes, not date+time** — overnight is
  unambiguous. `shift_template_id` is a snapshot origin tag (`nullOnDelete`), not
  a live link.
- **ShiftRequirement** — requirements **snapshotted** onto the shift at
  generation (editing the template later must not mutate generated schedules).
  Editable per shift (add/update/delete) → ad-hoc count changes (heavy day).
- **ShiftAssignment** `scheduled_shift_id, member_id, locked`. Unique pair.
  `locked` pins a manual/approved choice so the solver keeps it on re-solve.
  Togglable via `PATCH /shift-assignments/{id}`.
- **Generation** (`GenerateScheduleShifts`): on schedule create, expand the
  team's applicable recurring templates across the period → concrete shifts,
  computing `start_at/end_at` (overnight-aware) and **summing day-scoped
  requirements** per day. Materialized rows.
- **Include/exclude days** = add/delete shift rows (shifts are real rows, so a
  holiday Monday is just a `DELETE`; no recurrence-exception table).
- **Manual assignment conflict checks** (in the FormRequest): member is in the
  shift's team; not already assigned; **no double-booking across all
  teams/schedules** (the shared-worker rule). Skill/availability are *not*
  enforced on manual assign (override allowed) — that's the solver's job.
- **TeamRule** (1-per-team): `min_rest_hours`, `max_hours_per_week`,
  `max_consecutive_days`. Only `min_rest_hours` is enforced in v1 (as the global
  rest fallback). The other two are modeled but unused for now (deliberate scope
  cut).
- **SolveRun**: `schedule_id, status, diagnostics(jsonb), result_snapshot(jsonb)`.
  Tracks a solve attempt + its diagnostics (objective, unfilled, uncovered) and
  retains the assignments it produced (`result_snapshot` = `[{shiftId, memberId}]`)
  so runs can be compared and a chosen one re-applied. Still not the live
  assignment store — those are normalized rows; the snapshot is a retained copy.

### Availability
`availabilities` (member-level), `availability_requests`,
`availability_responses`.

- **Two concepts kept separate**: *availability data* (standing, on the member)
  vs. *the request* (a workflow round). The request carries no time data — just
  process.
- **Availability entry** `kind(available|unavailable)`, recurring (`recurrence=
  weekly`, `days`, `start_time`, `end_time`) **or** one-off (`start_at`,
  `end_at`), `reason`.
  - **Member-level (org-wide)** → a shared worker's vacation blocks all their
    teams.
  - **Positive recurring + negative one-off** (Deputy-style): "available weekends
    13:00–02:00" (recurring, overnight) + "time off Jun 20–25" (one-off). Time off
    always wins; if any positive rules exist, a shift must fall within one
    (allowlist), else default-available.
  - Overnight handled the same `end<start ⇒ +1 day` way; resolver checks the
    previous day for spill-over.
- **Request workflow**: manager opens a request (team, period, deadline) → seeds
  a `pending` response per team member → members `submit` → manager `close`s.
  **Soft gate** — the manager closes manually even with people still pending, so
  it can never stall.
- **`MemberAvailabilityResolver`** (`isAvailable(member, start, end)`): the
  deferred resolver, now built + unit-tested. Produces per-shift eligibility for
  the solver request. Lives in core-api (deterministic, also needed for UI
  preview) — *not* in the solver.

### Preferences
`member_preferences`: `member_id, type, params(jsonb), weight, mode(soft|hard),
hard_approved`. Unique `(member_id, type)`.

- **Catalog** (`PreferenceType`): `preferred_shift_type {type}`, `hours_target
  {target}`, `weekend {prefer|avoid}`, `max_consecutive_days {max}`,
  `avoid_fast_rotation`, `preferred_days_off {days}`. Each maps to a solver
  penalty.
- **Governance split** (the key UX decision):
  - **Employees author**: which prefs, `params`, `weight` (1–5 relative
    importance), and may *request* `mode=hard`.
  - **Managers govern**: `priority` (seniority, on Member), and **approve/revoke**
    hard via `POST /preferences/{id}/approve|revoke`.
  - **Hard is gated**: `mode=hard` is a request; it's only *effective-hard* when
    `hard_approved`. Employee can't self-promote; dropping to soft auto-clears
    approval. Prevents "everyone marks everything hard → infeasible".
- **Target ≠ cap**: the "hours I want" is the **soft** `hours_target` preference
  (income), not a hard ceiling. We removed an earlier hard `max_hours_per_week`
  member column once this distinction was clear.

---

## 5. The solver

### Contract (owned by core-api, implemented by the service)
`SolveRequestBuilder` flattens a schedule into a JSON request:
```jsonc
{ scheduleId, payrollPeriod,
  shifts:  [{ id, startAt, endAt, category, restHoursAfter,
              requirements: [{type, skillId, count}] }],
  members: [{ id, priority, skills:[skillId], eligibleShiftIds:[shiftId],
              preferences: [{type, params, weight, effectiveHard}],
              priorDissatisfaction }],
  locked:  [{shiftId, memberId}],
  rules:   {minRestHours, maxHoursPerWeek, maxConsecutiveDays},
  objective: { lambda } }
// response
{ assignments: [{shiftId, memberId}],
  diagnostics: { solver, status, objective, unfilled[], uncovered[],
                 memberDissatisfaction{} } }
```
- **Eligibility is precomputed in PHP** — `eligibleShiftIds` already folds in
  availability (resolver) + cross-team prior published commitments. The solver
  never sees raw availability or resolves anything. Single source of truth.
- `lambda` comes from `schedule.weights`.

### Drivers
`Solver` interface, bound in `SchedulingServiceProvider::register()` by
`config('solver.driver')`:
- `stub` (default) — `GreedyStubSolver`, in-process PHP. Greedy fill respecting
  eligibility, skills, rest/double-book, locked. Lets the whole pipeline run with
  no Python. Tests use it.
- `http` — `HttpSolver` POSTs to the Python service (`SOLVER_URL`,
  `SOLVER_TIMEOUT`).
- Swapping is one env var; nothing upstream changes.
- Solve is **asynchronous**: `POST /schedules/{id}/solve` (`QueueSolve`) records a
  `pending` `SolveRun`, dispatches `SolveScheduleJob`, and returns **202** with the
  run immediately. The job (one attempt, `tries=1`) flips the run to `running`,
  then `SolveSchedule::execute` builds the request, solves, writes assignments
  transactionally (wipe non-locked, keep locked), and marks `succeeded`/`failed`
  with diagnostics. A killed worker is caught by the job's `failed()` so a run is
  never stuck on `running`. Clients poll `GET /solve-runs/{id}`. Needs a queue
  worker in prod (`QUEUE_CONNECTION=database`, `php artisan queue:work`); the test
  suite uses `sync` so jobs run inline.
- **Dry-run preview** (`POST /schedules/{id}/solve/preview`, `PreviewSolve`): runs
  the same build+solve for a **candidate `lambda`** (optional body param, else the
  schedule's stored value) and returns `{assignments, diagnostics}` **synchronously
  without writing assignments or recording a `SolveRun`**. Powers live λ scrubbing
  (~60 ms at the target scale). Locked assignments are still honored. Unlike the
  queued `POST /solve`, it never mutates the draft — explore freely, then commit
  via `/solve`.
- **Compare / keep-best across runs**: every solve retains its result on the
  `SolveRun` (`result_snapshot`) and applies it via the shared `ApplyAssignments`
  (replace non-locked, keep locked). `GET /schedules/{id}/solve-runs` lists runs
  (diagnostics + snapshot) to compare; `POST /solve-runs/{id}/apply` re-applies a
  chosen run's snapshot — pick the best of several, or revert after a re-solve.
  Applying a run with no snapshot (e.g. pending/failed) is a 422.

> Gotcha: `SOLVER_DRIVER=http php artisan serve` does **not** work — `artisan
> serve` spawns a child that re-reads `.env`. Set it in `.env`.

### CP-SAT model (`apps/solver/app/solver.py`)
**Hard:**
- eligibility (`works[m,s]` only for eligible+qualified pairs),
- **headcount via slot vars** `fill[m,s,skill]`, with `works[m,s] = Σ_skill
  fill ≤ 1` → distinct people, a multi-skilled person fills one slot,
- **rest/no-double-booking**: two shifts conflict for a member if the gap is
  shorter than the earlier shift's `restHoursAfter` (overlap = negative gap;
  subsumes plain double-booking),
- **locked** fixed on, conflicting shifts forced off,
- **effective-hard preferences** → forbid violating shifts (`preferred_shift_type`,
  `preferred_days_off`, `weekend`).

**Soft (objective):**
```
min  STAFF_WEIGHT · (Σ unfilled + 5·Σ uncovered)        ← staffing dominates
   + (1−λ) · Σ_m WD[m]   +   λ · N · max_m WD[m]         ← preferences + equity
WD[m] = priority[m] · Σ_p  wnorm[m,p] · (penalty[m,p] / norm[p])
wnorm[m,p] = weight[m,p] / Σ_q weight[m,q]
```
- **Staffing first** via a huge `STAFF_WEIGHT` (never trade coverage for a
  preference). Coverage understaffing is soft (slack vars) so the solve is always
  feasible and returns diagnostics, never "INFEASIBLE".
- **Per-member weight normalization** (`wnorm`) — anti-gaming: maxing every
  weight gives no edge; only *relative* importance matters.
- **Per-type normalizer** (`norm`) — makes heterogeneous penalties comparable
  (a fully-violated preference ≈ 1 regardless of type). Penalties use
  **deci-hours** for `hours_target` (abs deviation per payroll bucket via two
  non-negative deviation vars) and counts for the rest.
- **Seniority** `priority[m]` multiplies the member's dissatisfaction.
- **λ equity dial** (`schedule.weights.lambda`, default 0.3): `Σ WD` =
  utilitarian, `N·max WD` = protect the worst-off (Rawlsian). λ=0 best-average,
  λ=1 minimize-worst-off, between = blend. `N·max` keeps the two terms the same
  order of magnitude.
- All of `wnorm/priority/norm/λ` are constants → folded into integer coefficients
  (fixed-point `SCALE=100000`), so the model is linear-integer and CP-SAT-friendly.

**Penalties implemented:** `weekend`, `preferred_days_off`,
`preferred_shift_type`, `hours_target`, `max_consecutive_days`,
`avoid_fast_rotation`.
- **`max_consecutive_days {max}`** — a per-day `worked[m,d]` bool (OR of the
  member's shifts that day) over the calendar grid; each window of `max+1`
  consecutive days contributes a 0/1 penalty when all are worked (windows
  containing a gap day are skipped — they can never violate). Normaliser = number
  of windows.
- **`avoid_fast_rotation`** (no params) — penalises working **different**
  categories on adjacent calendar days (e.g. day→night). A `worked[m,d,category]`
  bool per day+category; for each adjacent day pair, a 0/1 penalty per
  differing-category combination. Normaliser = number of adjacent worked-day
  pairs. Same-category two days running is not a rotation.
- Both are **soft-only** today: `_hard_forbids` can't express them as per-shift
  vetoes, so an effective-hard request on these is a no-op (the per-shift hard
  prefs — shift type, days off, weekend — remain the hard-capable ones).

### History-based fairness (built)
Unfairness *rotates* across periods: last period's worst-off are favoured this
period. The mechanism reuses the equity machinery:
- The solver already computes per-member dissatisfaction `WD[m]`. It now **emits**
  the realised value in `diagnostics.memberDissatisfaction {memberId: value}`.
- On **publish**, core-api snapshots that map (from the schedule's latest
  succeeded `SolveRun`) into a **`member_satisfaction`** record — the per-member,
  per-period history row (`member_id, team_id, schedule_id (snapshot,
  nullOnDelete), period_start/end, dissatisfaction`). Idempotent per
  `(schedule, member)`.
- `SolveRequestBuilder` feeds each member a `priorDissatisfaction` = **decayed sum**
  of recent published periods of the same team (`config('solver.fairness')`:
  `history_window` default 3, `decay` default 0.5; most recent full weight, older
  faded). Only periods ending **before** this schedule's start count.
- The equity term changes from `worst ≥ WD[m]` to `worst ≥ prior[m] + WD[m]`, so
  the λ dial now protects the **cumulative** worst-off. Same fixed-point units —
  no rescaling. The utilitarian `Σ WD` term is unchanged (prior is constant
  there). The greedy stub emits no dissatisfaction, so history is a real-solver
  feature; publishing after a stub solve records nothing.

---

## 6. Cross-cutting design decisions (the debates)

**Events table vs. baked-into-shifts.** We analyzed an `events` table (demand
modifiers) vs. encoding variable staffing on shifts. Conclusion: an events table
is an *authoring overlay*, not a data-model upgrade — it compiles down to the same
per-shift requirements the solver consumes, and its only unique capability
(sub-shift demand) can't be delivered without the deferred interval-demand model
anyway. So: **no events table.** Recurring count variation → day-scoped
requirement lines; ad-hoc → editable shift requirements. One shift row, count
varies. Events remain a possible future authoring layer that *generates* those
rows (with `source_event_id` for attribution).

**Normalized rows vs. JSON draft.** An early idea stored the solver draft as a
JSON blob in a `schedule_drafts` table. Rejected — opaque, unqueryable, hard to
hand-edit, and cross-team conflict checks need normalized data. The schedule *is*
the draft (`status`); everything is normalized rows.

**Expansion in core-api, not the solver.** Template→shift recurrence expansion is
deterministic calendar logic and is needed by the UI for preview *without*
solving. Putting it in the solver would duplicate it (PHP + Python) and bloat the
solver contract. So core-api expands; the solver gets flat instances.

**Solver is jurisdiction-blind.** Labor law varies by country and contract.
Encoding it in the optimizer would be a nightmare. Instead the solver consumes
**concrete per-member numbers**; *where those numbers come from* (contract shaped
by jurisdiction law) is an upstream **guardrail/validation** concern — pluggable,
incremental, zero solver changes. v1: manager is responsible for legality.

**Per-member effective limits = member ?? team default** (fallback, **not**
`min`). A member's contract is authoritative and can be *higher* than a team
default (a legal >40h contract). (We initially had `min`, which was wrong.)

**Target (soft) vs. cap (hard).** "Hours I want" = soft `hours_target`
preference; a legal/contract ceiling would be a separate hard limit (deferred to
the jurisdiction layer). Conflating them in one field was the mistake we undid.

**v1 hard limits = rest only.** Max-hours and max-consecutive were cut from v1
hard constraints — rest-between-shifts is the genuinely needed one (no
back-to-back). Rest is **per-shift** (longer shift → more rest) with a team
global fallback.

---

## 7. Testing & running

- **PHP**: PHPUnit on sqlite `:memory:` (`RefreshDatabase`). Suite includes the
  availability resolver unit test (overnight, allowlist, override). End-to-end
  flows verified by `artisan serve` + curl smoke runs against PostgreSQL.
- **Solver**: `apps/solver/tests/test_solver.py` (headcount, multi-skill-once,
  rest, locked, soft-steering, hard-forbid). Run: `PYTHONPATH=. python
  tests/test_solver.py`.
- **Run the solver**: `direnv reload` (builds the venv), then from `apps/solver`:
  `PYTHONPATH=. uvicorn app.main:app --port 8000`. Point core-api at it with
  `SOLVER_DRIVER=http`.
- **Run core-api**: `php artisan serve`. PostgreSQL via `devenv up -d`.

---

## 8. Next steps

### Established (designed, not built)
- **Contract templates** — reusable employment-limit templates that populate
  per-member fields (an authoring convenience over the same data).
- **Auth & `user_id` on members** — one user ↔ many members across orgs; managers
  vs. employees as real roles enforcing the governance split we already modeled.
- **Org-members list endpoint reverse direction** — currently we query from the
  Members side to avoid a reverse `hasMany`; revisit if needed.

### TBD (decisions still open)
- **Jurisdiction / legal compliance layer** — validate contract values against
  per-country law, supply legal defaults. Solver stays blind; this is upstream
  validation. Country coverage is incremental. Cross-jurisdiction shared workers
  (aggregate working time across employers) is a known grey area, deferred.
- **Hard hours ceiling** — if/when needed, a hard per-member max-hours (period-
  aware) separate from the soft target.
- **Sub-shift / interval demand** — staffing that varies *within* a shift (a 4th
  person only during the 9–11 shipment window). Needs interval-demand in the
  solver + partial attendance. Deferred; the "baseline-low + surge blocks"
  convention covers most of it.
- **Partial attendance** — per-assignment `start_at/end_at` (leave early / arrive
  late). Deferred.
- **Biweekly payroll bucketing** — *done*: true 14-day fortnights counted from a
  fixed Monday anchor (`BIWEEKLY_ANCHOR = 2020-01-06`), replacing the buggy
  `isoweek // 2` (which mis-paired weeks and reset at year boundaries).
  Still open: making the anchor **org-configurable** to match a real payroll
  start (the constant defines only the phase today).
- **`STAFF_WEIGHT` / integer-scaling robustness** — tuned for typical instance
  sizes; revisit bounds for very large orgs to guarantee staffing dominance and
  avoid int64 pressure.
- **Frontend (Angular)** — not started; the API is the contract.
- **Notifications, audit** — not started.
- **Reporting/analytics** — `GET /schedules/{id}/insights` (`ScheduleInsights`) is
  built: per-member workload (assigned shifts + hours, **live** from current
  assignments), **staffing gaps** (headcount shortfalls + uncovered coverage
  skills, computed live against member skills), and **fairness** (per-member
  dissatisfaction + total/max) snapshotted from the latest succeeded `SolveRun`'s
  diagnostics — solver-computed, so it can be stale after manual edits (flagged
  via `fairness.fromLastSolve`). Still open: per-team labor **cost** (needs pay
  rates, not yet modeled), trends across periods.
