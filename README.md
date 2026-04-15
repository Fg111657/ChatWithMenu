# ChatWithMenu Recovery Repo

This repo was reconstructed from the live DigitalOcean droplet at `165.22.32.88` on `2026-04-14` (`America/New_York`).

It is intended to become the new source-of-truth starting point for the project after server drift, duplicate repos, and deployment mismatches.

## Structure

- `frontend/`
  Recovered from the live frontend source at `/root/cwm-frontend-react`.

- `backend/`
  Recovered from the live backend source at `/var/www/chatwithmenu/Backend/python`, plus `requirements.txt` and the upstream backend README from `/var/www/chatwithmenu/Backend`.

- `docs/`
  Recovery provenance and live-server notes captured during extraction.

## What Was Excluded

To keep this repo usable, the recovery intentionally excludes runtime and generated artifacts:

- `.git/`
- `.env` files
- `node_modules/`
- CRA `build/`
- Python virtualenvs
- SQLite database files
- `__pycache__/`
- obvious server backup variants such as `server.py.backup*` and `server.py.bak*`

## Verified Live Topology

- Frontend source of truth on server: `/root/cwm-frontend-react`
- Production frontend served by nginx from: `/var/www/html`
- Production build matched: `/root/cwm-frontend-react/build`
- Running backend working directory: `/var/www/chatwithmenu/Backend/python`
- Running backend entrypoint: `/var/www/chatwithmenu/Backend/.venv/bin/python3 server.py`
- Live backend DB path: `/var/www/chatwithmenu/Backend/python/localdata.db`

## Immediate Next Steps

1. Initialize and use this directory as the canonical project root.
2. Reinstall dependencies locally for `frontend/` and `backend/`.
3. Review `docs/RECOVERY_NOTES.md` before making structural changes.
4. Decide whether to preserve the current Flask backend shape or refactor after stabilization.
