# Job Status Fix — Handoff

Jobs were getting stuck in **Processing** even after every test had been
authorized and signed off, and some jobs flipped to **Completed** when they
should not have. This note explains the root causes, what changed, and how to
repair existing records.

## Status rule (single source of truth)

A job is `Completed` only when **both** conditions hold for **every** test:

1. `test.stage === 'Authorized'`, and
2. the Authorizer sign-off name for that test is non-empty.

Otherwise the job is `Processing`.

The sign-off field name varies per test:

| Test                 | Authorizer field      |
| -------------------- | --------------------- |
| POST-CONNECTION TEST | `pct_authorized_by`   |
| POST-TANKING TEST    | `pt_authorized_by`    |
| all others           | `authorized_by`       |

Canonical implementation: `recomputeJobStatus()` in `server/jobFactory.ts`.
`src/localStore.ts` mirrors it for offline mode. **If you change one, change
both.**

## Root causes and fixes

### 1. Status was never recomputed when a sign-off was saved

The Authorizer name lives inside `observationData`, which is written by
`PATCH /jobs/:jobId/tests/:testId/observation`. That handler saved the name but
never recomputed `status`. Only the `/stage` handler did. So the final action in
the real workflow — picking the Authorizer name on an already-Authorized test —
left the job as `Processing` forever.

- **Fixed:** `server/index.ts` — the `/observation` handler now returns
  `{ ...job, tests, status: recomputeJobStatus(tests) }`.
- **Fixed:** `src/localStore.ts` — `updateLocalObservation()` does the same.

### 2. A job with zero tests reported `Completed`

`tests.every(...)` is vacuously `true` for an empty array, so a job with no
tests looked fully authorized.

- **Fixed:** both implementations now require `tests.length > 0`.

### 3. Sign-off selections could be lost to the debounce

Observation saves were debounced by 400 ms. Selecting an Authorizer and
immediately navigating away discarded the pending write, so the name — and the
resulting `Completed` status — never reached the server.

- **Fixed:** `src/App.tsx` — `handleUpdateTestData()` detects a changed `*_by`
  field and persists it immediately (`await persistObservation(...)`), bypassing
  the debounce. Free-text fields stay debounced. A `flushPendingObservationSaves()`
  helper plus a `pendingObservationData` ref were added so a pending payload is
  never dropped silently.

### 4. Progress counters used the wrong denominator

Two places counted `authorized` using the completed-test rule but divided by
only the *accepted* tests, so the percentage could read 100% while unaccepted
tests remained. The counters now use the same `isTestCompleted()` rule and the
full `job.tests.length` denominator (Dashboard "Recent Testing Records" and the
Job List table).

### 5. Offline stage promotion failed silently

`updateLocalStage()` returned the unchanged test when a mandatory Technician or
Reviewer name was missing, and the UI then reported success.

- **Fixed:** `updateLocalStage()` now returns `{ job, openTestId, error }` with
  the same message the server uses, and `handleUpdateTestStage()` surfaces it as
  an error toast and returns `false`.

## Repairing existing data

Jobs already saved with a wrong `status` are not corrected by a code deploy —
status is stored, not derived at read time. Run the backfill:

```bash
# from vp-testing/
npx tsx server/scripts/backfillJobStatus.ts --dry-run   # preview only
npx tsx server/scripts/backfillJobStatus.ts             # apply
```

The script recomputes every job's status with `recomputeJobStatus()` and prints
each `name: from -> to` change plus totals. `--dry-run` writes nothing. It is
idempotent — a second run reports "All job statuses are already correct."

Connection uses `MONGO_URL` / `MONGODB_URI` (default
`mongodb://127.0.0.1:27017/volttrack`); the database name comes from the URI
path or `MONGODB_DB`.

## Verification

Trace all four cases after deploying:

1. All tests Authorized **with** Authorizer names → `Completed`.
2. All tests Authorized but one name blank → `Processing`.
3. One test still Reviewed → `Processing`.
4. Job with zero tests → `Processing` (not `Completed`).

Also confirm: selecting an Authorizer name and immediately pressing back still
persists, and the Job List tab counts match the per-row progress bars.

## Files touched

- `server/index.ts` — recompute status in `/observation`
- `server/jobFactory.ts` — empty-tests guard in `recomputeJobStatus()`
- `server/scripts/backfillJobStatus.ts` — new repair script
- `src/localStore.ts` — offline parity: recompute on observation, empty guard, promote error
- `src/App.tsx` — immediate sign-off save, progress denominators, offline error toast

## Known pre-existing issue (not introduced here)

`npm run lint` (`tsc --noEmit`) reports one unrelated error:

```
src/api.ts(4,31): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
```

This needs `"types": ["vite/client"]` in `tsconfig.json`. `@types/react` is also
absent from `package.json`, so editors may show JSX "implicitly has type any"
warnings. Neither affects the Vite build or the fixes above.