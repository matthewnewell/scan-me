import type { LicenseVerdict } from '../api/types'

const LABEL: Record<LicenseVerdict, string> = {
  approved: 'Approved',
  flagged: 'Flagged',
  unknown: 'Unknown',
}

/** The one piece of color vocabulary every page shares — a license verdict, always rendered the
 * same way whether it's the repo's own license or one dependency's. */
export default function VerdictPill({ verdict }: { verdict: LicenseVerdict | null }) {
  const v = verdict ?? 'unknown'
  return <span className={`verdict-pill verdict-pill--${v}`}>{LABEL[v]}</span>
}
