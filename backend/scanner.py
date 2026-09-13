"""
Scan Me's actual work: given a GitHub repo URL, report what license it's under, what license
each direct dependency declares, and which of those dependencies have known vulnerabilities.

This is a self-check for OUR side of an internal open-source handoff — "is our own house clean
before we hand a repo to the company's import process" — not a replacement for whatever STIGs
or cyber-compliance gate the company runs on their end. See models.py's module docstring.

Design choices, stated instead of buried:
  * No API keys, no auth. GitHub's unauthenticated REST API (~60 req/hour/IP), the public npm
    registry, PyPI's public JSON API, and OSV.dev's public vulnerability database are all used
    anonymously. Fine for occasional manual scans of a handful of repos; a real rate-limit wall
    if this ever needs to run continuously or on a schedule — not a goal today.
  * A dependency declared with a version RANGE (npm's "^1.2.3", no pin in requirements.txt) is
    resolved against that registry's *latest* published version — the actual installed version
    could differ. Every report says so; this is a signal to review, not a certified BOM.
  * A dependency whose license or vulnerability status couldn't be determined is reported as
    "unknown" / "not checked" — never silently folded into "clean". Same "no fake precision"
    rule the rest of this ecosystem holds to.
  * Only npm (package.json) and pip (requirements.txt) manifests are read — the two ecosystems
    this shop's own apps actually use. Anything else in a scanned repo goes unreported.
"""

import base64
import json
import re

import httpx

GITHUB_API = "https://api.github.com"
NPM_REGISTRY = "https://registry.npmjs.org"
PYPI_API = "https://pypi.org/pypi"
OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

# Manifest paths worth checking — root, plus this ecosystem's own frontend/backend-subfolder
# convention (every sibling app in this shop is laid out this way).
CANDIDATE_MANIFESTS = [
    ("package.json", "npm"),
    ("frontend/package.json", "npm"),
    ("backend/package.json", "npm"),
    ("requirements.txt", "pip"),
    ("backend/requirements.txt", "pip"),
]

# SPDX-ish identifiers/keywords. Permissive licenses a proprietary/govcon shop can consume as a
# dependency without extra obligations; copyleft families that typically need legal review
# before use (share-alike / relicensing obligations, GPL family especially). Matched as
# case-insensitive substrings against whatever license text a registry hands back — real-world
# license fields are inconsistent free text, not always a clean SPDX id.
_APPROVED_KEYWORDS = (
    "mit", "apache", "bsd", "isc", "python-2.0", "psf", "unlicense", "cc0", "0bsd", "zlib",
    "public domain",
)
_FLAGGED_KEYWORDS = (
    "agpl", "gpl", "lgpl", "sspl", "cpal", "eupl", "cddl", "mpl", "epl", "osl", "rpl",
)

_GH_URL_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/([^/\s]+)/([^/\s#?]+)", re.I)
_REQ_LINE_RE = re.compile(r"^([A-Za-z0-9_.\-]+)\s*(==|>=|<=|~=|!=|>|<)?\s*([A-Za-z0-9_.\-]*)")


def parse_github_url(text: str) -> tuple[str, str] | None:
    """Accepts a full GitHub URL, a bare "owner/repo", or anything in between."""
    text = (text or "").strip()
    m = _GH_URL_RE.search(text)
    if m:
        owner, repo = m.group(1), m.group(2)
        return owner, repo[:-4] if repo.endswith(".git") else repo
    parts = text.strip("/").split("/")
    if len(parts) == 2 and all(parts):
        repo = parts[1]
        return parts[0], repo[:-4] if repo.endswith(".git") else repo
    return None


def classify_license(license_text: str | None) -> str:
    """"approved" | "flagged" | "unknown" — never guesses past what the text actually says."""
    if not license_text:
        return "unknown"
    lowered = license_text.lower()
    flagged = any(k in lowered for k in _FLAGGED_KEYWORDS)
    approved = any(k in lowered for k in _APPROVED_KEYWORDS)
    if approved and not flagged:
        return "approved"
    if flagged:
        return "flagged"
    return "unknown"


def parse_npm_manifest(text: str) -> list[dict]:
    data = json.loads(text)
    deps = []
    for dep_type in ("dependencies", "devDependencies"):
        for name, version_range in (data.get(dep_type) or {}).items():
            deps.append({
                "name": name,
                "ecosystem": "npm",
                "dep_type": dep_type,
                "version_range": version_range,
                "pinned_version": None,
            })
    return deps


def parse_requirements_txt(text: str) -> list[dict]:
    deps = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        m = _REQ_LINE_RE.match(line)
        if not m or not m.group(1):
            continue
        name, op, version = m.groups()
        deps.append({
            "name": name,
            "ecosystem": "PyPI",
            "dep_type": "dependency",
            "version_range": f"{op}{version}" if op else None,
            "pinned_version": version if op == "==" and version else None,
        })
    return deps


def _merge_findings(raw_findings: list[dict]) -> list[dict]:
    """Same package can show up in more than one manifest (frontend+backend, root+subfolder) —
    report it once, remembering every manifest path it came from."""
    merged: dict[tuple[str, str], dict] = {}
    for d in raw_findings:
        key = (d["ecosystem"], d["name"])
        if key not in merged:
            merged[key] = {**d, "manifest_paths": [d.pop("manifest_path")]}
        else:
            path = d["manifest_path"]
            if path not in merged[key]["manifest_paths"]:
                merged[key]["manifest_paths"].append(path)
    return list(merged.values())


def _gh_get(client: httpx.Client, path: str, **params):
    r = client.get(f"{GITHUB_API}{path}", params=params, headers={"Accept": "application/vnd.github+json"})
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def _fetch_file_text(client: httpx.Client, owner: str, repo: str, path: str, ref: str) -> str | None:
    try:
        data = _gh_get(client, f"/repos/{owner}/{repo}/contents/{path}", ref=ref)
    except httpx.HTTPError:
        return None
    if not data or data.get("encoding") != "base64":
        return None
    try:
        return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    except (ValueError, TypeError):
        return None


def _lookup_npm_license(client: httpx.Client, name: str) -> tuple[str | None, str | None]:
    """Returns (license_text, resolved_version) — resolved against the *latest* published
    version, since a package.json version range doesn't pin one exactly."""
    try:
        r = client.get(f"{NPM_REGISTRY}/{name}", timeout=6)
        if r.status_code != 200:
            return None, None
        data = r.json()
    except httpx.HTTPError:
        return None, None
    version = (data.get("dist-tags") or {}).get("latest")
    lic = data.get("license")
    if isinstance(lic, dict):
        lic = lic.get("type")
    if not lic and version:
        vdata = (data.get("versions") or {}).get(version, {})
        vlic = vdata.get("license")
        lic = vlic.get("type") if isinstance(vlic, dict) else vlic
    return lic, version


def _lookup_pypi_license(client: httpx.Client, name: str, pinned_version: str | None) -> tuple[str | None, str | None]:
    url = f"{PYPI_API}/{name}/{pinned_version}/json" if pinned_version else f"{PYPI_API}/{name}/json"
    try:
        r = client.get(url, timeout=6)
        if r.status_code != 200:
            return None, None
        data = r.json()
    except httpx.HTTPError:
        return None, None
    info = data.get("info") or {}
    version = info.get("version")
    # Modern packaging (PEP 639) reports an SPDX expression here and leaves the older
    # `license`/classifier fields empty — check it first, it's the most reliable when present.
    if info.get("license_expression"):
        return info["license_expression"], version
    for c in info.get("classifiers") or []:
        if c.startswith("License :: OSI Approved ::"):
            return c.rsplit("::", 1)[-1].strip(), version
    return (info.get("license") or None), version


def _query_osv_batch(client: httpx.Client, queries: list[dict]) -> list[list[str] | None]:
    """queries: [{"name", "ecosystem", "version"}] -> per-query vuln id list, same order. `None`
    (not `[]`) on a failed lookup — "not checked" is not the same claim as "checked, clean"."""
    if not queries:
        return []
    payload = {
        "queries": [
            {"package": {"name": q["name"], "ecosystem": q["ecosystem"]}, "version": q["version"]}
            for q in queries
        ]
    }
    try:
        r = client.post(OSV_BATCH_URL, json=payload, timeout=15)
        r.raise_for_status()
        data = r.json()
    except httpx.HTTPError:
        return [None for _ in queries]
    results = data.get("results") or []
    out: list[list[str] | None] = []
    for i in range(len(queries)):
        if i < len(results):
            out.append([v["id"] for v in (results[i].get("vulns") or [])])
        else:
            out.append(None)
    return out


def run_scan(repo_url: str) -> dict:
    """The whole pipeline. Returns either an error dict or a full report dict — never partial
    silent failure; anything that couldn't be checked is marked as such in the report itself."""
    parsed = parse_github_url(repo_url)
    if not parsed:
        return {"error": f'Could not read a GitHub owner/repo out of "{repo_url}".'}
    owner, repo = parsed

    with httpx.Client(headers={"User-Agent": "scan-me (github.com/matthewnewell/scan-me)"}, timeout=10) as client:
        try:
            meta = _gh_get(client, f"/repos/{owner}/{repo}")
        except httpx.HTTPError as e:
            return {"error": f"Could not reach GitHub for {owner}/{repo}: {e}"}
        if meta is None:
            return {"error": f"GitHub repo {owner}/{repo} was not found (private repos and typos look the same here)."}

        default_branch = meta.get("default_branch") or "main"
        license_info = meta.get("license") or {}
        repo_license_spdx = license_info.get("spdx_id")
        if repo_license_spdx in ("NOASSERTION", None):
            repo_license_spdx = None
        repo_license_name = license_info.get("name")

        raw_findings = []
        for path, ecosystem in CANDIDATE_MANIFESTS:
            text = _fetch_file_text(client, owner, repo, path, default_branch)
            if text is None:
                continue
            try:
                parsed_deps = parse_npm_manifest(text) if ecosystem == "npm" else parse_requirements_txt(text)
            except (json.JSONDecodeError, ValueError):
                continue
            for d in parsed_deps:
                d["manifest_path"] = path
                raw_findings.append(d)

        results = _merge_findings(raw_findings)

        for d in results:
            if d["ecosystem"] == "npm":
                lic, version = _lookup_npm_license(client, d["name"])
            else:
                lic, version = _lookup_pypi_license(client, d["name"], d.get("pinned_version"))
            d["resolved_version"] = version
            d["declared_license"] = lic
            d["license_verdict"] = classify_license(lic)

        checkable = [d for d in results if d.get("resolved_version")]
        vuln_lists = _query_osv_batch(client, [
            {"name": d["name"], "ecosystem": d["ecosystem"], "version": d["resolved_version"]}
            for d in checkable
        ])
        for d, vulns in zip(checkable, vuln_lists):
            d["vulnerability_ids"] = vulns
        for d in results:
            d.setdefault("vulnerability_ids", None)

    return {
        "repo_name": f"{owner}/{repo}",
        "default_branch": default_branch,
        "repo_license_spdx": repo_license_spdx,
        "repo_license_name": repo_license_name,
        "repo_license_verdict": classify_license(repo_license_spdx or repo_license_name),
        "dependencies": results,
        "dependency_count": len(results),
        "license_flag_count": sum(1 for d in results if d["license_verdict"] == "flagged"),
        "license_unknown_count": sum(1 for d in results if d["license_verdict"] == "unknown"),
        "vulnerable_count": sum(1 for d in results if d.get("vulnerability_ids")),
    }
