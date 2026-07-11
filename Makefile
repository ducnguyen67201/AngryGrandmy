.PHONY: local

local:
	@set -eu; \
	APP_PID=""; \
	MARKETING_PID=""; \
	cleanup() { \
		[ -z "$$APP_PID" ] || kill "$$APP_PID" 2>/dev/null || true; \
		[ -z "$$MARKETING_PID" ] || kill "$$MARKETING_PID" 2>/dev/null || true; \
	}; \
	trap cleanup EXIT INT TERM; \
	echo "Main app:  http://localhost:3000"; \
	echo "Marketing: http://localhost:3002"; \
	GRANNYSMITH_SURFACE=app NEXT_DIST_DIR=.next-app pnpm exec next dev -p 3000 & APP_PID=$$!; \
	GRANNYSMITH_SURFACE=marketing NEXT_DIST_DIR=.next-marketing pnpm exec next dev -p 3002 & MARKETING_PID=$$!; \
	wait "$$APP_PID" "$$MARKETING_PID"
