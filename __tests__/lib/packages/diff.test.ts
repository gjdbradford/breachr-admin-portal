import { describe, it, expect } from 'vitest'
import { buildChangesSummary } from '@/lib/packages/diff'
import type { Package, PackageModule } from '@/lib/packages/types'

const basePkg: Partial<Package> = {
  name: 'Starter',
  price_monthly: 159,
  price_annual: null,
  scans_limit: 20,
  tokens_limit: 3000000,
  targets_limit: 5,
  status: 'active',
}

const baseMods: PackageModule[] = [
  { id: '1', package_id: 'p1', module_slug: 'scans',   access_mode: 'full',      trial_days: null },
  { id: '2', package_id: 'p1', module_slug: 'assets',  access_mode: 'trial',     trial_days: 14   },
  { id: '3', package_id: 'p1', module_slug: 'exports', access_mode: 'paywalled', trial_days: null },
]

describe('buildChangesSummary', () => {
  it('returns "Initial push" when before is null', () => {
    expect(buildChangesSummary(null, { pkg: basePkg as Package, modules: baseMods })).toBe('Initial push')
  })

  it('returns "No changes" when nothing changed', () => {
    const result = buildChangesSummary(
      { pkg: basePkg as Package, modules: baseMods },
      { pkg: basePkg as Package, modules: baseMods },
    )
    expect(result).toBe('No changes')
  })

  it('reports module mode change', () => {
    const after = baseMods.map(m =>
      m.module_slug === 'assets' ? { ...m, access_mode: 'full' as const, trial_days: null } : m
    )
    const result = buildChangesSummary(
      { pkg: basePkg as Package, modules: baseMods },
      { pkg: basePkg as Package, modules: after },
    )
    expect(result).toBe('assets trial→full')
  })

  it('reports trial days change', () => {
    const after = baseMods.map(m =>
      m.module_slug === 'assets' ? { ...m, trial_days: 7 } : m
    )
    const result = buildChangesSummary(
      { pkg: basePkg as Package, modules: baseMods },
      { pkg: basePkg as Package, modules: after },
    )
    expect(result).toBe('assets trial 14d→7d')
  })

  it('reports price change', () => {
    const afterPkg = { ...basePkg, price_monthly: 199 } as Package
    const result = buildChangesSummary(
      { pkg: basePkg as Package, modules: baseMods },
      { pkg: afterPkg,           modules: baseMods },
    )
    expect(result).toBe('price_monthly 159→199')
  })

  it('chains multiple changes with · separator', () => {
    const afterMods = baseMods.map(m =>
      m.module_slug === 'exports' ? { ...m, access_mode: 'off' as const } : m
    )
    const afterPkg = { ...basePkg, scans_limit: 50 } as Package
    const result = buildChangesSummary(
      { pkg: basePkg as Package, modules: baseMods },
      { pkg: afterPkg,           modules: afterMods },
    )
    expect(result).toContain(' · ')
    expect(result).toContain('scans_limit')
    expect(result).toContain('exports')
  })
})
