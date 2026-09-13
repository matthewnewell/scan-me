import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteScan, useRunScan, useScans } from '../api/hooks'
import type { ScanResult } from '../api/types'
import VerdictPill from '../components/VerdictPill'
import './ScanPage.css'

/** The whole app, really: paste a GitHub repo URL, scan it, see the history of every repo
 * checked so far. */
export default function ScanPage() {
  const navigate = useNavigate()
  const { data: scans, isLoading } = useScans()
  const runScan = useRunScan()
  const deleteScan = useDeleteScan()
  const [repoUrl, setRepoUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repoUrl.trim() || runScan.isPending) return
    runScan.mutate(repoUrl.trim(), {
      onSuccess: (result) => navigate(`/scans/${result.id}`),
    })
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deleteScan.mutate(id)
  }

  return (
    <div className="scan-page">
      <div className="scan-page__content">
        <header className="scan-page__header">
          <h1 className="scan-page__title">Scan a repo</h1>
          <p className="scan-page__lede">
            A pre-flight check before a repo goes into the company's own open-source / import
            review — its own license, every dependency's declared license, and any dependency
            with a known vulnerability. A signal for our side, not a substitute for their gate.
          </p>
        </header>

        <form className="scan-page__form" onSubmit={handleSubmit}>
          <input
            className="scan-page__input"
            type="text"
            placeholder="github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={runScan.isPending}
          />
          <button
            className="sm-btn sm-btn--primary"
            type="submit"
            disabled={!repoUrl.trim() || runScan.isPending}
          >
            {runScan.isPending ? 'Scanning…' : 'Scan'}
          </button>
        </form>
        {runScan.isError && (
          <p className="scan-page__error">{(runScan.error as Error).message}</p>
        )}

        <section className="scan-page__history">
          <h2 className="scan-page__history-title">Past scans</h2>
          {isLoading && <p className="scan-page__muted">Loading…</p>}
          {!isLoading && (scans?.length ?? 0) === 0 && (
            <p className="scan-page__muted">No scans yet — paste a repo URL above.</p>
          )}
          {!isLoading && (scans?.length ?? 0) > 0 && (
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Repo</th>
                  <th>Scanned</th>
                  <th>License</th>
                  <th>Dependencies</th>
                  <th>Flags</th>
                  <th>Vulnerable</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {scans!.map((s) => (
                  <ScanRow key={s.id} scan={s} onOpen={() => navigate(`/scans/${s.id}`)} onDelete={(e) => handleDelete(e, s.id)} />
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

function ScanRow({ scan, onOpen, onDelete }: { scan: ScanResult; onOpen: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const when = new Date(scan.scanned_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  if (scan.error) {
    return (
      <tr className="scan-table__row" onClick={onOpen}>
        <td className="scan-table__repo">{scan.repo_url}</td>
        <td className="scan-table__muted">{when}</td>
        <td colSpan={4} className="scan-table__error">{scan.error}</td>
        <td className="scan-table__actions">
          <button className="scan-table__delete" onClick={onDelete} title="Delete this scan">✕</button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="scan-table__row" onClick={onOpen}>
      <td className="scan-table__repo">{scan.repo_name}</td>
      <td className="scan-table__muted">{when}</td>
      <td><VerdictPill verdict={scan.repo_license_verdict} /></td>
      <td className="scan-table__num">{scan.dependency_count}</td>
      <td className="scan-table__num">
        {scan.license_flag_count > 0 ? (
          <span className="scan-table__flag-count">{scan.license_flag_count}</span>
        ) : (
          <span className="scan-table__muted">0</span>
        )}
      </td>
      <td className="scan-table__num">
        {scan.vulnerable_count > 0 ? (
          <span className="scan-table__flag-count">{scan.vulnerable_count}</span>
        ) : (
          <span className="scan-table__muted">0</span>
        )}
      </td>
      <td className="scan-table__actions">
        <button className="scan-table__delete" onClick={onDelete} title="Delete this scan">✕</button>
      </td>
    </tr>
  )
}
