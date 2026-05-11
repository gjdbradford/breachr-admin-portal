import type { Package, PackageModule } from './types'

type TrackedField = 'name' | 'price_monthly' | 'price_annual' | 'scans_limit' | 'tokens_limit' | 'targets_limit' | 'status'

const TRACKED_FIELDS: TrackedField[] = [
  'name', 'price_monthly', 'price_annual',
  'scans_limit', 'tokens_limit', 'targets_limit', 'status',
]

export function buildChangesSummary(
  before: { pkg: Package; modules: PackageModule[] } | null,
  after:  { pkg: Package; modules: PackageModule[] },
): string {
  if (!before) return 'Initial push'

  const parts: string[] = []

  for (const field of TRACKED_FIELDS) {
    const bv = before.pkg[field]
    const av = after.pkg[field]
    if (bv !== av) {
      parts.push(`${field} ${bv ?? 'null'}→${av ?? 'null'}`)
    }
  }

  for (const afterMod of after.modules) {
    const beforeMod = before.modules.find(m => m.module_slug === afterMod.module_slug)
    if (!beforeMod) {
      parts.push(`${afterMod.module_slug} added as ${afterMod.access_mode}`)
      continue
    }
    if (beforeMod.access_mode !== afterMod.access_mode) {
      parts.push(`${afterMod.module_slug} ${beforeMod.access_mode}→${afterMod.access_mode}`)
    } else if (afterMod.access_mode === 'trial' && beforeMod.trial_days !== afterMod.trial_days) {
      parts.push(`${afterMod.module_slug} trial ${beforeMod.trial_days}d→${afterMod.trial_days}d`)
    }
  }

  for (const beforeMod of before.modules) {
    if (!after.modules.find(m => m.module_slug === beforeMod.module_slug)) {
      parts.push(`${beforeMod.module_slug} removed`)
    }
  }

  return parts.join(' · ') || 'No changes'
}
