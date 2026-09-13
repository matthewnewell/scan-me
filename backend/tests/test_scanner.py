"""Tests for the pure, network-free parts of scanner.py — URL parsing, manifest parsing, and
license classification. The HTTP-calling orchestration (run_scan and its _fetch_*/_lookup_*/
_query_* helpers) is exercised manually against the real network, the same way Conway's Depot's
own httpx-based "reachable" probe isn't unit tested — mocking three different third-party APIs
would test the mocks, not the scanner."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scanner import (
    classify_license,
    parse_github_url,
    parse_npm_manifest,
    parse_requirements_txt,
)


def test_parse_github_url_full_https():
    assert parse_github_url("https://github.com/matthewnewell/conways-depot") == (
        "matthewnewell",
        "conways-depot",
    )


def test_parse_github_url_strips_git_suffix_and_trailing_path():
    assert parse_github_url("https://github.com/octocat/Hello-World.git") == ("octocat", "Hello-World")
    assert parse_github_url("github.com/octocat/Hello-World/tree/main") == ("octocat", "Hello-World")


def test_parse_github_url_bare_owner_repo():
    assert parse_github_url("octocat/Hello-World") == ("octocat", "Hello-World")


def test_parse_github_url_rejects_junk():
    assert parse_github_url("not a url") is None
    assert parse_github_url("") is None


def test_classify_license_approved():
    assert classify_license("MIT") == "approved"
    assert classify_license("Apache-2.0") == "approved"
    assert classify_license("BSD License") == "approved"
    # PEP 639 SPDX expressions (PyPI's `license_expression` field) rather than classifiers.
    assert classify_license("BSD-3-Clause") == "approved"


def test_classify_license_flagged():
    assert classify_license("GPL-3.0") == "flagged"
    assert classify_license("GNU Lesser General Public License v2.1 (LGPL-2.1)") == "flagged"
    assert classify_license("AGPL-3.0") == "flagged"


def test_classify_license_unknown_when_missing_or_unrecognized():
    assert classify_license(None) == "unknown"
    assert classify_license("") == "unknown"
    assert classify_license("Some Proprietary EULA") == "unknown"


def test_parse_npm_manifest_reads_both_dependency_fields():
    text = """
    {
      "dependencies": {"react": "^18.2.0"},
      "devDependencies": {"vite": "^8.0.0"}
    }
    """
    deps = parse_npm_manifest(text)
    names = {d["name"]: d for d in deps}
    assert set(names) == {"react", "vite"}
    assert names["react"]["dep_type"] == "dependencies"
    assert names["react"]["version_range"] == "^18.2.0"
    assert names["vite"]["dep_type"] == "devDependencies"


def test_parse_requirements_txt_reads_pins_and_ranges():
    text = """
    # a comment line and a blank line below

    flask==3.1.3
    httpx>=0.28
    -e ./local-package
    requests
    """
    deps = {d["name"]: d for d in parse_requirements_txt(text)}
    assert deps["flask"]["pinned_version"] == "3.1.3"
    assert deps["flask"]["version_range"] == "==3.1.3"
    assert deps["httpx"]["pinned_version"] is None
    assert deps["httpx"]["version_range"] == ">=0.28"
    assert deps["requests"]["version_range"] is None
    assert "local-package" not in deps
