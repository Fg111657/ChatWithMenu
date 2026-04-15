# Recovery Notes

## Snapshot Provenance

This recovery snapshot was pulled from the live DigitalOcean droplet at `165.22.32.88`.

Extraction date:
- Local date: `2026-04-14`
- Server UTC date during inspection: `2026-04-15`

Recovered paths:
- Frontend source: `/root/cwm-frontend-react`
- Backend source: `/var/www/chatwithmenu/Backend/python`
- Backend root files copied separately:
  - `/var/www/chatwithmenu/Backend/requirements.txt`
  - `/var/www/chatwithmenu/Backend/README.md`

## Live Runtime Observations

Services confirmed active during audit:
- `nginx.service`
- `chatwithmenu-backend.service`

Backend service config:
- Working directory: `/var/www/chatwithmenu/Backend/python`
- Environment file: `/var/www/chatwithmenu/Backend/python/.env`
- ExecStart: `/var/www/chatwithmenu/Backend/.venv/bin/python3 server.py`

Nginx config:
- `chatwithmenu.com` served from `/var/www/html`
- `/api/` proxied to `127.0.0.1:5000`

Production build relationship:
- `/var/www/html` matched `/root/cwm-frontend-react/build`
- `/var/www/chatwithmenu/FrontendReact` existed but was stale and did not appear to be the source of the live web build

## Repo Drift Found On Server

Server-side project copies discovered:
- `/root/cwm-frontend-react`
- `/root/cwm-frontend`
- `/root/chatwithmenu`
- `/var/www/chatwithmenu/FrontendReact`
- `/var/www/chatwithmenu/Backend`

Git remotes observed on the server:
- `/root/cwm-frontend-react` -> `git@github.com:ChatWithMenu/FrontendReact.git`
- `/root/cwm-frontend` -> `https://github.com/ChatWithMenu/Frontend.git`
- `/var/www/chatwithmenu/FrontendReact` -> `git@github.com:Fg111657/ChatWithMenu.git`
- `/var/www/chatwithmenu/Backend` -> `git@github.com:ChatWithMenu/Backend.git`

Important conclusion:
- Treat `/root/cwm-frontend-react` as the effective live frontend source.
- Treat `/var/www/chatwithmenu/Backend/python` as the effective live backend source.
- Do not treat `/var/www/chatwithmenu/FrontendReact/src` as current production source.

## Database Findings

Multiple SQLite files existed on the server. The active DB path used by the running backend was:

- `/var/www/chatwithmenu/Backend/python/localdata.db`

Observed table counts from the active DB during audit:
- `users`: 69
- `restaurants`: 68
- `family_members`: 4
- `table_connections`: 0
- `table_questions`: 0
- `table_answers`: 0
- `safety_signals`: 0

Additional finding:
- `invite_codes` table was not present in the active DB at audit time.

## Backend Shape Confirmed

The live backend is Flask/Flask-RESTX, not FastAPI.

Key implemented route groups confirmed in `server.py`:
- MyTable routes
- family routes
- health endpoint
- restaurant list endpoint

Key missing route groups noted during audit:
- restaurant search
- restaurant audit history
- orders
- payments

## Recovery Policy Used

The extraction intentionally omitted:
- `.git/`
- `.env` files
- `node_modules/`
- frontend build output
- Python virtualenvs
- SQLite DB files
- `__pycache__/`
- backup variants such as `server.py.backup*`, `server.py.bak*`, `server.py.with-family`

This keeps the recovered repo small and safe while preserving the live source code and project documentation.
