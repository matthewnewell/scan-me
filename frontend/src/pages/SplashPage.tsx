import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import './SplashPage.css'

const FEATURES = [
  {
    title: 'Our side, not theirs',
    body: "This checks whether our own repo is clean before it goes into the company's own STIGs and cyber-compliance import review — it doesn't replace that review or speak for it.",
  },
  {
    title: 'A signal, not a gate',
    body: 'A license or a dependency reported as "unknown" isn\'t a verdict — it means the answer wasn\'t determinable from the public registries this checks, and it needs a person to look. Never silently folded into "clean".',
  },
  {
    title: 'Every dependency, not just the repo',
    body: "A repo's own LICENSE file is one line item. What it pulls in — npm and pip packages, their declared licenses, their known vulnerabilities — is usually the bigger surface.",
  },
]

export default function SplashPage() {
  return (
    <div className="splash-page">
      <Nav />
      <div className="splash-page__scroll">
        <div className="splash-page__content">
          <header className="splash-hero">
            <h1 className="splash-hero__title">Scan Me</h1>
            <p className="splash-hero__sub">
              Before a repo goes into the company's own import review — check our own license
              and dependency hygiene first.
            </p>
            <div className="splash-hero__actions">
              <Link className="sm-btn sm-btn--primary" to="/">Scan a repo</Link>
            </div>
          </header>

          <figure className="splash-figure">
            <svg viewBox="0 0 360 150" role="img" aria-labelledby="sm-figure-title">
              <title id="sm-figure-title">
                A GitHub repo flows through a scan into three checks — repo license, dependency
                licenses, and known vulnerabilities — each landing on an approved, flagged, or
                unknown verdict.
              </title>
              <rect x="8" y="58" width="90" height="34" rx="8" fill="var(--color-surface-sunken)" stroke="var(--color-border-strong)" strokeWidth="1.5" />
              <text x="53" y="79" textAnchor="middle" className="splash-figure__label">github.com/…</text>

              <path d="M98 75 L134 75" stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#sm-arrow)" />

              <rect x="136" y="58" width="70" height="34" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)" strokeWidth="1.5" />
              <text x="171" y="79" textAnchor="middle" className="splash-figure__label">Scan Me</text>

              {[
                { y: 14, label: 'Repo license', color: 'var(--color-success)' },
                { y: 68, label: 'Dependency licenses', color: 'var(--color-wait)' },
                { y: 122, label: 'Known vulnerabilities', color: 'var(--color-critical)' },
              ].map((row) => (
                <g key={row.label}>
                  <path
                    d={`M206 75 L${252} ${row.y + 9}`}
                    stroke="var(--color-border-strong)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <rect x="252" y={row.y} width="100" height="18" rx="9" fill="var(--color-surface)" stroke={row.color} strokeWidth="1.5" />
                  <text x="302" y={row.y + 13} textAnchor="middle" className="splash-figure__verdict" fill={row.color}>
                    {row.label}
                  </text>
                </g>
              ))}

              <defs>
                <marker id="sm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0 0 L8 4 L0 8 Z" fill="var(--color-accent)" />
                </marker>
              </defs>
            </svg>
          </figure>

          <div className="splash-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="splash-card">
                <div className="splash-card__heading">{f.title}</div>
                <p className="splash-card__body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
