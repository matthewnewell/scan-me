"""
One demo scan so the app isn't empty on first look — a fixed, illustrative example, not a live
re-run of the real scanner against the network on every fresh dev DB. It deliberately mixes an
approved license, a flagged one, and an unknown one, plus one vulnerable package, so every
verdict the UI can render actually shows up once. Uses GitHub's own long-running "Hello-World"
demo repo as the subject — a stand-in, not a real audit of any of this shop's own code.
"""

import json

from db import db
from models import ScanResult

DEMO_SCAN_ID = "demo-hello-world"

_DEMO_FINDINGS = [
    {
        "name": "react",
        "ecosystem": "npm",
        "dep_type": "dependencies",
        "version_range": "^18.2.0",
        "pinned_version": None,
        "resolved_version": "18.3.1",
        "declared_license": "MIT",
        "license_verdict": "approved",
        "manifest_paths": ["frontend/package.json"],
        "vulnerability_ids": [],
    },
    {
        "name": "some-old-widget",
        "ecosystem": "npm",
        "dep_type": "dependencies",
        "version_range": "^2.1.0",
        "pinned_version": None,
        "resolved_version": "2.4.0",
        "declared_license": "GPL-3.0",
        "license_verdict": "flagged",
        "manifest_paths": ["frontend/package.json"],
        "vulnerability_ids": [],
    },
    {
        "name": "left-pad-fork",
        "ecosystem": "npm",
        "dep_type": "devDependencies",
        "version_range": "*",
        "pinned_version": None,
        "resolved_version": "1.0.3",
        "declared_license": None,
        "license_verdict": "unknown",
        "manifest_paths": ["frontend/package.json"],
        "vulnerability_ids": None,
    },
    {
        "name": "flask",
        "ecosystem": "PyPI",
        "dep_type": "dependency",
        "version_range": "==2.0.1",
        "pinned_version": "2.0.1",
        "resolved_version": "2.0.1",
        "declared_license": "BSD License",
        "license_verdict": "approved",
        "manifest_paths": ["backend/requirements.txt"],
        "vulnerability_ids": ["GHSA-m2qf-hxjv-5gpq"],
    },
    {
        "name": "requests",
        "ecosystem": "PyPI",
        "dep_type": "dependency",
        "version_range": "==2.31.0",
        "pinned_version": "2.31.0",
        "resolved_version": "2.31.0",
        "declared_license": "Apache Software License",
        "license_verdict": "approved",
        "manifest_paths": ["backend/requirements.txt"],
        "vulnerability_ids": [],
    },
]


def seed_if_empty():
    if ScanResult.query.first() is not None:
        return

    demo = ScanResult(
        id=DEMO_SCAN_ID,
        repo_url="https://github.com/octocat/Hello-World",
        repo_name="octocat/Hello-World",
        default_branch="master",
        repo_license_spdx="MIT",
        repo_license_name="MIT License",
        repo_license_verdict="approved",
        dependency_count=len(_DEMO_FINDINGS),
        license_flag_count=sum(1 for d in _DEMO_FINDINGS if d["license_verdict"] == "flagged"),
        license_unknown_count=sum(1 for d in _DEMO_FINDINGS if d["license_verdict"] == "unknown"),
        vulnerable_count=sum(1 for d in _DEMO_FINDINGS if d.get("vulnerability_ids")),
        findings_json=json.dumps(_DEMO_FINDINGS),
    )
    db.session.add(demo)
    db.session.commit()
