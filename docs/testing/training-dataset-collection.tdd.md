# Training Dataset Collection TDD Evidence

## Source

Journeys were derived during this TDD run from the request: after each completed computer-use run, show that training points were collected and provide a page/button to inspect the training set.

## User Journeys

1. As a demo operator, I want a completed run to be collected as training examples, so I can explain that GrannySmith produces reusable UI/UX training data.
2. As a judge or researcher, I want to open a training set page, so I can inspect the collected persona/task/trajectory/finding examples.
3. As an engineer, I want collection to be validated and idempotent, so refreshing the app does not inflate dataset counts.

## RED Evidence

Command:

```bash
pnpm test src/lib/training/training-episode.test.ts src/lib/training/repository.test.ts src/app/api/training/episodes/route.test.ts
```

Result: failed before implementation because `./training-episode`, `./repository`, and `./route` did not exist.

Checkpoint commit: `65881ba test: add training dataset collection coverage`

## GREEN Evidence

Commands:

```bash
pnpm test src/lib/training/training-episode.test.ts src/lib/training/repository.test.ts src/app/api/training/episodes/route.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Results:

- Focused tests: 3 files passed, 5 tests passed.
- Full tests: 57 files passed, 201 tests passed.
- Typecheck: passed.
- Lint: passed.
- Build: passed, including dynamic `/api/training/episodes` and `/training`.

Checkpoint commit: `1f474b7 feat: collect training episodes after lab runs`

## Test Specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | Completed run snapshots and runtime events become persona-level training episodes with redacted screenshot references | `src/lib/training/training-episode.test.ts` | Unit | PASS | Focused Vitest run |
| 2 | Training point, episode, friction, and persona counts summarize collected examples | `src/lib/training/training-episode.test.ts` | Unit | PASS | Focused Vitest run |
| 3 | Local dataset persistence is idempotent by episode ID | `src/lib/training/repository.test.ts` | Unit/integration | PASS | Focused Vitest run |
| 4 | `POST /api/training/episodes` collects completed runs and `GET` lists the dataset | `src/app/api/training/episodes/route.test.ts` | API integration | PASS | Focused Vitest run |
| 5 | Unfinished runs are rejected instead of becoming training data | `src/app/api/training/episodes/route.test.ts` | API validation | PASS | Focused Vitest run |
| 6 | The app compiles with the new `/training` page and collection API | `pnpm build` | Integration | PASS | Next build output |

## Coverage

Command:

```bash
pnpm test:coverage
```

Result: all 57 test files and 201 tests passed under coverage, but the repo-level coverage gate failed because pre-existing global coverage is below threshold:

- Statements: 73.02%
- Branches: 65.63%
- Functions: 80.99%
- Lines: 75.04%

New training files are above the requested threshold:

- `lib/training`: 90% statements, 86.66% branches, 96.55% functions, 90.41% lines.
- `app/api/training/episodes/route.ts`: 93.33% statements/lines, 100% branches/functions.

Known gap: the visual `/training` page and lab toast are covered by typecheck, lint, and build, but not by a dedicated React rendering test in this pass.
