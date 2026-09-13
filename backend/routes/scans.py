import json

from flask import Blueprint, jsonify, request

from db import db
from models import ScanResult
from scanner import run_scan

bp = Blueprint("scans", __name__, url_prefix="/api/scans")


@bp.get("")
def list_scans():
    scans = ScanResult.query.order_by(ScanResult.scanned_at.desc()).all()
    return jsonify([s.to_dict() for s in scans])


@bp.post("")
def create_scan():
    body = request.get_json(force=True) or {}
    repo_url = (body.get("repo_url") or "").strip()
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    result = run_scan(repo_url)

    s = ScanResult(repo_url=repo_url)
    if "error" in result:
        s.error = result["error"]
    else:
        s.repo_name = result["repo_name"]
        s.default_branch = result["default_branch"]
        s.repo_license_spdx = result["repo_license_spdx"]
        s.repo_license_name = result["repo_license_name"]
        s.repo_license_verdict = result["repo_license_verdict"]
        s.dependency_count = result["dependency_count"]
        s.license_flag_count = result["license_flag_count"]
        s.license_unknown_count = result["license_unknown_count"]
        s.vulnerable_count = result["vulnerable_count"]
        s.findings_json = json.dumps(result["dependencies"])

    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict(include_findings=True)), 201


@bp.get("/<scan_id>")
def get_scan(scan_id):
    s = ScanResult.query.get_or_404(scan_id)
    return jsonify(s.to_dict(include_findings=True))


@bp.delete("/<scan_id>")
def delete_scan(scan_id):
    s = ScanResult.query.get_or_404(scan_id)
    db.session.delete(s)
    db.session.commit()
    return "", 204
