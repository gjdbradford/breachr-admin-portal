// admin/app/dashboard/packages/[packageId]/tabs/ModulesTab.tsx
'use client'

import type { ModuleSlug, AccessMode } from '@/lib/packages/types'

const MODULE_ICONS: Record<ModuleSlug, string> = {
  scans: '⟳', findings: '⚠', assets: '⬡', reports: '▤',
  exports: '📦', remediation: '🔧', audit: '⛓', team: '👥',
}
const MODULE_LABELS: Record<ModuleSlug, string> = {
  scans: 'Scans', findings: 'Findings', assets: 'Inventory', reports: 'Reports',
  exports: 'Exports', remediation: 'Remediation', audit: 'Audit Log', team: 'Team',
}
const MODULE_PERM_COUNT: Record<ModuleSlug, number> = {
  scans: 4, findings: 3, assets: 4, reports: 6, exports: 2, remediation: 2, audit: 1, team: 2,
}
const MODE_STYLE: Record<AccessMode, { border: string; bg: string; pillBg: string; pillColor: string }> = {
  full:      { border: 'rgba(34,197,94,.3)',   bg: 'rgba(34,197,94,.03)',   pillBg: 'rgba(34,197,94,.15)',   pillColor: '#22c55e' },
  trial:     { border: 'rgba(245,158,11,.3)',  bg: 'rgba(245,158,11,.03)',  pillBg: 'rgba(245,158,11,.15)',  pillColor: '#f59e0b' },
  paywalled: { border: 'rgba(66,165,245,.3)',  bg: 'rgba(66,165,245,.03)',  pillBg: 'rgba(66,165,245,.15)',  pillColor: '#42a5f5' },
  off:       { border: 'rgba(100,116,139,.2)', bg: 'transparent',           pillBg: 'rgba(100,116,139,.12)', pillColor: '#475569' },
}

type Props = {
  moduleSlugList: ModuleSlug[]
  moduleModes: Record<ModuleSlug, { mode: AccessMode; trialDays: number | null }>
  setModuleMode: (slug: ModuleSlug, mode: AccessMode) => void
  setModuleTrialDays: (slug: ModuleSlug, days: number | null) => void
}

export default function ModulesTab({ moduleSlugList, moduleModes, setModuleMode, setModuleTrialDays }: Props) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        Module Access — define what tenants on this package can see
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 28 }}>
        {moduleSlugList.map(slug => {
          const { mode, trialDays } = moduleModes[slug]
          const st = MODE_STYLE[mode]
          return (
            <div key={slug} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10, padding: 14, opacity: mode === 'off' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{MODULE_ICONS[slug]}</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: st.pillBg, color: st.pillColor, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {mode}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{MODULE_LABELS[slug]}</div>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>{MODULE_PERM_COUNT[slug]} permissions</div>
              <select
                value={mode}
                onChange={e => setModuleMode(slug, e.target.value as AccessMode)}
                style={{ width: '100%', background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11 }}
              >
                <option value="full">Full access</option>
                <option value="trial">Free trial</option>
                <option value="paywalled">Paywalled</option>
                <option value="off">Off</option>
              </select>
              {mode === 'trial' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 11, color: '#94a3b8' }}>
                  ⏱
                  <input
                    type="number"
                    value={trialDays ?? ''}
                    onChange={e => setModuleTrialDays(slug, e.target.value === '' ? null : Number(e.target.value))}
                    style={{ width: 44, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 4, padding: '2px 5px', color: '#f59e0b', fontSize: 11, textAlign: 'center' }}
                  />
                  days from first visit
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
