# Local repository connection TDD evidence

## User journey

As a local GrannySmith presenter, I can connect a fixed Git working tree so a
fix investigator can read the intended codebase without exposing its absolute
path to the browser.

## RED

- Command: `pnpm test -- src/lib/repository/local-repository.test.ts`
- Result: failed because `local-repository.ts` did not exist.
- Checkpoint: `071a30a test: add reproducer for local repository connection`

## GREEN

- Command: `pnpm test -- src/lib/repository/local-repository.test.ts`
- Result: 43 files and 155 tests passed at the GREEN checkpoint.
- Guarantees:
  - An unset repository path produces no connection.
  - A configured Git directory exposes branch and commit metadata.
  - Public metadata omits absolute filesystem paths.
  - A configured file path is rejected.

## Integration verification

- `GET /api/repository` returned sanitized metadata for the isolated `demo`
  target, including `relativeTarget: "demo"` and `mode: "read-only"`.
- The root Next.js production build passed with the new API route.
- The copied target application built successfully and returned HTTP 200 on
  `http://127.0.0.1:3001/`.

## Known gap

The existing H Company integration uses a remote browser and cannot reach a
localhost-only target. A public preview/tunnel or a local H runner is required
before the real H-to-evidence path can exercise this demo application.
