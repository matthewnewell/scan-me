export type LicenseVerdict = 'approved' | 'flagged' | 'unknown'
export type Ecosystem = 'npm' | 'PyPI'

/** One dependency found in a scanned repo's manifest(s). `resolved_version` is the version the
 * license/vulnerability lookups actually ran against — the *latest* published release when the
 * manifest only gave a range, not necessarily what's literally installed. `vulnerability_ids`
 * is `null` when it couldn't be checked at all (no resolvable version) — never conflated with
 * "checked, found none" (`[]`). */
export interface DependencyFinding {
  name: string
  ecosystem: Ecosystem
  dep_type: string
  version_range: string | null
  pinned_version: string | null
  resolved_version: string | null
  declared_license: string | null
  license_verdict: LicenseVerdict
  manifest_paths: string[]
  vulnerability_ids: string[] | null
}

export interface ScanResult {
  id: string
  repo_url: string
  repo_name: string | null
  default_branch: string | null
  repo_license_spdx: string | null
  repo_license_name: string | null
  repo_license_verdict: LicenseVerdict | null
  dependency_count: number
  license_flag_count: number
  license_unknown_count: number
  vulnerable_count: number
  error: string | null
  scanned_at: string
  dependencies?: DependencyFinding[]
}
