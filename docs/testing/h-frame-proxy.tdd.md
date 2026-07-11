# Protected H frame proxy — TDD evidence

## User journey

As a researcher, I can view and replay H Company browser screenshots inside GrannySmith even though H protects those image resources with API authentication.

## RED / GREEN

- RED: the new endpoint and source validator did not exist, and the replay `<Image>` received an H URL that returned 404 without authorization.
- RED extension: live verification showed H responds with a 302 to signed S3 storage, which the first strict redirect policy rejected.
- GREEN: the exact failed frame now returns `200 image/png` through `/api/h-frame`, with 1,261,088 bytes and browser caching.

| Guarantee | Evidence | Result |
|---|---|---|
| Only H resources belonging to the requested session are accepted | `src/lib/security/h-frame-source.test.ts` | PASS |
| Arbitrary hosts and mismatched sessions are rejected before fetch | `src/lib/security/h-frame-source.test.ts` | PASS |
| H API credentials are attached only to the H resource request | `src/app/api/h-frame/route.test.ts` | PASS |
| Only HTTPS `*.s3.amazonaws.com` redirects are followed | Endpoint and validator tests | PASS |
| H credentials are not forwarded to signed S3 | `src/app/api/h-frame/route.test.ts` | PASS |
| Non-image, oversized, redirecting, or unavailable frames fail closed | `src/app/api/h-frame/route.ts` | PASS |

## Coverage

Focused coverage: 83.07% statements, 81.81% branches, 100% functions, and 83.07% lines.

## Checkpoints

- RED: `3899ef1 test: reproduce protected H frame rendering failure`
- RED extension: `0fe37b8 test: cover signed H frame redirects`
- GREEN: `fc5d840 fix: proxy protected H viewport frames`
