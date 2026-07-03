# Backend (FastAPI)

Minimal FastAPI service. **Skeleton — not implemented yet.**

Planned endpoints:

- `POST /submit` — logs the pass/fail result per student (CSV/SQLite to
  start).
- `POST /hint` — proxy to the existing FH AI API. Checks the course
  token, rate-limits, and injects a system prompt that pins the AI to
  Socratic help (guiding questions and concepts, never finished
  solutions).

No SSO/OAuth — a simple course token is checked on every request.
Secrets (course token, FH AI API token/URL) live in `.env`; see the
repository root `.env.example`. The `.env` file is never committed.
