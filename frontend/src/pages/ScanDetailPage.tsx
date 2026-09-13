import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useScan } from '../api/hooks'
import type { DependencyFinding, LicenseVerdict } from '../api/types'
import VerdictPill from '../components/VerdictPill'
import './ScanDetailPage.css'

type Tone = 'good' | 'warn' | 'bad' | 'neutral'

// Same red/yellow/green a dependency's own verdict pill uses — "unknown" reads as a caution
// (needs a person to look), not a clean pass, same as everywhere else in the app.
const LICENSE_VERDICT_TONE: Record<LicenseVerdict, Tone> = {
  approved: 'good',
  flagged: 'bad',
  unknown: 'warn',
}

function SummaryTile({ label, tone, children }: { label: string; tone: Tone; children: ReactNode }) {
  return (
    <div className={`scan-detail__summary-item scan-detail__summary-item--${tone}`}>
      <span className="scan-detail__summary-label">{label}</span>
      <div className="scan-detail__summary-value">{children}</div>
    </div>
  )
}

export default function ScanDetailPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const { data: scan, isLoading } = useScan(scanId)

  if (isLoading || !scan) return <div className="scan-detail__loading">Loading…</div>

  if (scan.error) {
    return (
      <div className="scan-detail">
        <div className="scan-detail__content">
          <Link to="/" className="scan-detail__back">← Scans</Link>
          <h1 className="scan-detail__title">{scan.repo_url}</h1>
          <p className="scan-detail__scan-error">{scan.error}</p>
        </div>
      </div>
    )
  }

  const when = new Date(scan.scanned_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const deps = scan.dependencies ?? []
  const sorted = [...deps].sort((a, b) => {
    const rank = { flagged: 0, unknown: 1, approved: 2 } as const
    return rank[a.license_verdict] - rank[b.license_verdict] || a.name.localeCompare(b.name)
  })

  return (
    <div className="scan-detail">
      <div className="scan-detail__content">
        <Link to="/" className="scan-detail__back">← Scans</Link>

        <header className="scan-detail__header">
          <div>
            <h1 className="scan-detail__title">{scan.repo_name}</h1>
            <a
              className="scan-detail__repo-link"
              href={scan.repo_url}
              target="_blank"
              rel="noreferrer"
            >
              {scan.repo_url}
            </a>
          </div>
          <span className="scan-detail__scanned-at">Scanned {when}</span>
        </header>

        <div className="scan-detail__summary">
          <SummaryTile
            label="Repo license"
            tone={LICENSE_VERDICT_TONE[scan.repo_license_verdict ?? 'unknown']}
          >
            <VerdictPill verdict={scan.repo_license_verdict} />
            <span className="scan-detail__license-text">
              {scan.repo_license_name ?? scan.repo_license_spdx ?? 'No license file detected'}
            </span>
          </SummaryTile>
          <SummaryTile label="Dependencies scanned" tone="neutral">
            {scan.dependency_count}
          </SummaryTile>
          <SummaryTile label="License flags" tone={scan.license_flag_count > 0 ? 'bad' : 'good'}>
            {scan.license_flag_count}
          </SummaryTile>
          <SummaryTile label="Unknown licenses" tone={scan.license_unknown_count > 0 ? 'warn' : 'good'}>
            {scan.license_unknown_count}
          </SummaryTile>
          <SummaryTile label="Vulnerable" tone={scan.vulnerable_count > 0 ? 'bad' : 'good'}>
            {scan.vulnerable_count}
          </SummaryTile>
        </div>

        {deps.length === 0 ? (
          <p className="scan-detail__muted">
            No package.json or requirements.txt found at any of the usual paths (root,
            frontend/, backend/) — nothing to report on.
          </p>
        ) : (
          <table className="dep-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Ecosystem</th>
                <th>Version</th>
                <th>License</th>
                <th>Verdict</th>
                <th>Vulnerabilities</th>
                <th>Found in</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <DependencyRow key={`${d.ecosystem}:${d.name}`} dep={d} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DependencyRow({ dep }: { dep: DependencyFinding }) {
  const versionLabel = dep.pinned_version
    ? dep.pinned_version
    : dep.resolved_version
      ? `${dep.resolved_version} (latest — manifest gave a range: ${dep.version_range ?? '—'})`
      : dep.version_range ?? '—'

  return (
    <tr>
      <td className="dep-table__name">{dep.name}</td>
      <td className="dep-table__muted">{dep.ecosystem}</td>
      <td className="dep-table__version">{versionLabel}</td>
      <td className="dep-table__muted">{dep.declared_license ?? '—'}</td>
      <td><VerdictPill verdict={dep.license_verdict} /></td>
      <td>
        {dep.vulnerability_ids === null ? (
          <span className="dep-table__muted">not checked</span>
        ) : dep.vulnerability_ids.length === 0 ? (
          <span className="dep-table__muted">none found</span>
        ) : (
          <span className="dep-table__vulns">{dep.vulnerability_ids.join(', ')}</span>
        )}
      </td>
      <td className="dep-table__muted">{dep.manifest_paths.join(', ')}</td>
    </tr>
  )
}
