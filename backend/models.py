"""
Scan Me: a pre-flight self-check before handing a repo to the company's own open-source /
import review — never a replacement for it.

The user's own framing: opening Conway's Depot and its sibling apps up as internal open source
means the *company* will run its own STIGs and cyber-compliance gate on anything coming in.
Scan Me's whole job is making sure our own side is clean *before* that happens: does the repo
itself carry an appropriate license, does every dependency it pulls in carry one too, and does
anything in its dependency tree have a known vulnerability. One ScanResult per repo check — a
history, not just a live tool, since "was this clean the last time we looked" is exactly the
kind of question worth being able to answer later without re-running the scan.

"No fake precision" carries over from every sibling app here: a dependency whose license or
vulnerability status couldn't be determined is reported as unknown / not-checked, never folded
silently into "clean". See scanner.py for the actual scanning logic and its own caveats
(unauthenticated registries, version-range resolution, npm + pip only).
"""

import json
from datetime import datetime, timezone

from db import _uuid, db

# "approved" | "flagged" | "unknown" — see scanner.classify_license for what earns each verdict.
LICENSE_VERDICTS = ("approved", "flagged", "unknown")


def _now():
    return datetime.now(timezone.utc)


class ScanResult(db.Model):
    __tablename__ = "scan_result"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    repo_url = db.Column(db.String(500), nullable=False)
    repo_name = db.Column(db.String(200), nullable=True)  # "owner/repo"
    default_branch = db.Column(db.String(100), nullable=True)
    repo_license_spdx = db.Column(db.String(100), nullable=True)
    repo_license_name = db.Column(db.String(200), nullable=True)
    repo_license_verdict = db.Column(db.String(20), nullable=True)  # see LICENSE_VERDICTS
    dependency_count = db.Column(db.Integer, default=0, nullable=False)
    license_flag_count = db.Column(db.Integer, default=0, nullable=False)
    license_unknown_count = db.Column(db.Integer, default=0, nullable=False)
    vulnerable_count = db.Column(db.Integer, default=0, nullable=False)
    # JSON-encoded list of per-dependency finding dicts (see scanner.run_scan) — one small blob
    # rather than a child table; nobody queries into individual findings across scans yet.
    findings_json = db.Column(db.Text, nullable=True)
    error = db.Column(db.Text, nullable=True)  # set instead of the fields above if the scan failed
    scanned_at = db.Column(db.DateTime, default=_now, nullable=False)

    def to_dict(self, include_findings: bool = False) -> dict:
        d = {
            "id": self.id,
            "repo_url": self.repo_url,
            "repo_name": self.repo_name,
            "default_branch": self.default_branch,
            "repo_license_spdx": self.repo_license_spdx,
            "repo_license_name": self.repo_license_name,
            "repo_license_verdict": self.repo_license_verdict,
            "dependency_count": self.dependency_count,
            "license_flag_count": self.license_flag_count,
            "license_unknown_count": self.license_unknown_count,
            "vulnerable_count": self.vulnerable_count,
            "error": self.error,
            "scanned_at": self.scanned_at.isoformat(),
        }
        if include_findings:
            d["dependencies"] = json.loads(self.findings_json) if self.findings_json else []
        return d
