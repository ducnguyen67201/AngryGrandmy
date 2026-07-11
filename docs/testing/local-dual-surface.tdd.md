# Dual local surfaces — TDD evidence

## User journey

As a developer, I can run one command and open the main usability app on port 3000 and the marketing site on port 3002.

## RED / GREEN

- RED: the surface-routing test failed because no local surface resolver existed.
- GREEN: `make local` launches two isolated Next processes; port 3000 rewrites `/` to `/lab`, while port 3002 serves the marketing `/`.

| Guarantee | Evidence | Result |
|---|---|---|
| `app` selects the main product surface | `src/lib/runtime/surface.test.ts` | PASS |
| marketing is the safe default surface | `src/lib/runtime/surface.test.ts` | PASS |
| port 3000 renders the product heading | `curl http://127.0.0.1:3000` | PASS |
| port 3002 renders the marketing heading | `curl http://127.0.0.1:3002` | PASS |
| both processes use independent Next cache directories | `Makefile`, `next.config.ts` | PASS |

## Usage

```bash
make local
```

Press Ctrl-C once to stop both servers.
