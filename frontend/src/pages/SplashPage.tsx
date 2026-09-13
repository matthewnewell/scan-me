import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import './SplashPage.css'

const HOW_IT_WORKS = [
  {
    title: 'Public data only, read-only',
    body: 'Every call is a GET against public services — GitHub\'s REST API, the npm registry, PyPI\'s JSON API, OSV.dev\'s vulnerability database. Nothing is ever pushed, written, or modified in the scanned repo.',
  },
  {
    title: 'No code execution',
    body: "package.json and requirements.txt are read and parsed as plain text — never installed, never run, no npm install or pip install anywhere in the pipeline. There's no sandbox because nothing ever executes.",
  },
  {
    title: 'No authentication, nothing to leak',
    body: 'No GitHub token, no API key, no credential of any kind lives in this app. It can only reach what\'s already public — a private repo simply comes back "not found".',
  },
  {
    title: 'What actually leaves the network',
    body: 'A repo owner/name, and each dependency\'s package name and version — sent to the four services below to look up licenses and vulnerabilities. Never file contents, never source code, never anything else in the repo.',
  },
  {
    title: 'What gets kept',
    body: "Only the scan's own report — license and vulnerability verdicts — in this app's own local database. No source code or business data is copied anywhere.",
  },
  {
    title: 'What "vulnerable" actually means here',
    body: 'Each dependency version is checked against OSV.dev — an open, continuously-updated vulnerability database maintained by Google, aggregating the same advisory sources most tooling already trusts (GitHub Security Advisories, the PyPA and npm advisory databases, and more). It answers one specific question: has this exact package version been publicly disclosed as vulnerable? It is not malware detection, and this app does not run static analysis on the repo\'s own source — an undisclosed or zero-day issue won\'t show up here.',
  },
]

const OUTBOUND_HOSTS = ['api.github.com', 'registry.npmjs.org', 'pypi.org', 'api.osv.dev']

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
            <svg viewBox="0 0 400 130" role="img" aria-labelledby="sm-figure-title">
              <title id="sm-figure-title">
                A GitHub repo flows through a scan into three checks — repo license, dependency
                licenses, and known vulnerabilities — each landing on an approved, flagged, or
                unknown verdict.
              </title>
              <rect x="8" y="48" width="90" height="30" rx="8" fill="var(--color-surface-sunken)" stroke="var(--color-border-strong)" strokeWidth="1.5" />
              <text x="53" y="67" textAnchor="middle" className="splash-figure__label">github.com/…</text>

              <path d="M98 63 L134 63" stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#sm-arrow)" />

              <rect x="136" y="48" width="70" height="30" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)" strokeWidth="1.5" />
              <text x="171" y="67" textAnchor="middle" className="splash-figure__label">Scan Me</text>

              {[
                { y: 8, label: 'Repo license', color: 'var(--color-success)' },
                { y: 54, label: 'Dependency licenses', color: 'var(--color-wait)' },
                { y: 100, label: 'Known vulnerabilities', color: 'var(--color-critical)' },
              ].map((row) => (
                <g key={row.label}>
                  <path
                    d={`M206 63 L${228} ${row.y + 9}`}
                    stroke="var(--color-border-strong)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <rect x="228" y={row.y} width="164" height="18" rx="9" fill="var(--color-surface)" stroke={row.color} strokeWidth="1.5" />
                  <text x="310" y={row.y + 13} textAnchor="middle" className="splash-figure__verdict" fill={row.color}>
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

          <section className="splash-howitworks">
            <h2 className="splash-howitworks__title">How the scan is actually performed</h2>
            <p className="splash-howitworks__sub">
              For whoever has to sign off on running this against a real repo:
            </p>
            <dl className="splash-howitworks__list">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.title} className="splash-howitworks__item">
                  <dt>{item.title}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
            <div className="splash-howitworks__hosts">
              <span className="splash-howitworks__hosts-label">Every outbound destination, nothing else:</span>
              <div className="splash-howitworks__hosts-list">
                {OUTBOUND_HOSTS.map((h) => (
                  <code key={h} className="splash-howitworks__host">{h}</code>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
