# Scan Me

A pre-flight check on a GitHub repo's license and dependency hygiene — before it goes into the
company's own internal open-source / import review.

## The idea

Opening a repo up for internal open source means handing it to a review process with its own
STIGs and cyber-compliance requirements. Scan Me's job is making sure *our own side* is clean
first, so that review isn't the first place a problem surfaces:

1. **Repo license.** Does the repo itself carry a license, and is it one this shop can actually
   consume/redistribute internally without extra obligations (permissive) versus one that
   typically needs legal review (GPL-family copyleft)?
2. **Every dependency's license.** A repo's own LICENSE file is one line item — what it *pulls
   in* (npm and pip packages) is usually the bigger surface. Each one gets the same
   approved/flagged/unknown verdict.
3. **Known vulnerabilities.** Every dependency with a resolvable version is checked against
   [OSV.dev](https://osv.dev)'s public vulnerability database.

This is a signal for our side, not a substitute for the company's own gate — it doesn't know
their STIGs and doesn't try to.

**"No fake precision"**, the same rule every sibling app in this ecosystem holds to: a license
or vulnerability status that couldn't be determined is reported as `unknown` / `not checked`,
never silently folded into "clean".

## Honest limits (v1)

- **npm and pip only** — `package.json` and `requirements.txt`, at the repo root and in
  `frontend/`/`backend/` subfolders (this shop's own layout convention). Anything else in a
  scanned repo goes unreported.
- **No auth, no API keys.** GitHub's unauthenticated REST API (~60 requests/hour/IP), the public
  npm registry, PyPI's public JSON API, and OSV.dev are all called anonymously. Fine for
  occasional manual scans of a handful of repos; a real wall if this ever needs to run on a
  schedule.
- **Version ranges resolve to *latest*.** A dependency declared as `^1.2.3` (npm) or unpinned
  (pip) is checked against that registry's current latest release, not whatever's actually
  installed. Every report says so next to the version.

## Stack

Same as the rest of this ecosystem — Flask + SQLAlchemy + SQLite backend, React + TypeScript +
Vite frontend, no shared database, tied in only by Conway's Depot's registry entry.

## Running locally

```bash
# backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python app.py            # :8094, seeds one demo scan on first run

# frontend (separate terminal)
cd frontend
npm install
npm run dev                        # :5179, proxies /api to :8094
```

## Data model

- **ScanResult** — one row per repo check: the repo's own license verdict, summary counts
  (dependencies scanned, license flags, unknown licenses, vulnerable packages), and the full
  per-dependency findings as a JSON blob. `error` is set instead of the rest if the scan itself
  failed (repo not found, rate-limited, etc.) — a scan attempt is still worth keeping a record
  of.

See `backend/scanner.py`'s module docstring for the actual scanning pipeline and every
assumption it makes.

## Status

v1 — read-only scanning, a history of past scans, no scheduling, no CI hook. Worth revisiting if
this needs to run automatically rather than on demand.
