// admin/app/dashboard/packages/[packageId]/tabs/AnalyticsTab.tsx
'use client'

import { useState, useEffect } from 'react'

type Analytics = {
  tenant_count: number
  mrr: number
  cohorts: { active: number; idle: number; dormant: number }
  trials: { active: number; expired: number }
  avg_scans_used: number
}

export default function AnalyticsTab({ packageId }: { packageId: string | null }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!packageId) return
    setLoading(true)
    fetch(`/api/admin/packages/${packageId}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setFetchError('Failed to load analytics'); setLoading(false) })
  }, [packageId])

  if (!packageId) return <div style={{ color: '#475569', fontSize: 12 }}>Save the package first.</div>
  if (fetchError) return <div style={{ color: '#ef4444', fontSize: 12 }}>{fetchError}</div>
  if (loading || !data) return <div style={{ color: '#475569', fontSize: 12 }}>Loading analytics…</div>

  const mrr = data.mrr / 100

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active Tenants', value: String(data.tenant_count) },
          { label: 'MRR',  value: `€${mrr.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` },
          { label: 'Avg Scans Used', value: String(data.avg_scans_used) },
          { label: 'Active Trials',  value: String(data.trials.active) },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>{kpi.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.07em', textTransform: 'uppercase', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Cohort breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 14 }}>Tenant Engagement</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Active',  val: data.cohorts.active,  color: '#22c55e', sub: 'last 30d' },
              { label: 'Idle',    val: data.cohorts.idle,    color: '#f59e0b', sub: '31–90d'  },
              { label: 'Dormant', val: data.cohorts.dormant, color: '#ef4444', sub: '90d+'    },
            ].map(c => (
              <div key={c.label} style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>{c.label}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 14 }}>Trial Status</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Active Trials',  val: data.trials.active,  color: '#f59e0b' },
              { label: 'Expired Trials', val: data.trials.expired, color: '#ef4444' },
            ].map(c => (
              <div key={c.label} style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(66,165,245,.05)', border: '1px solid rgba(66,165,245,.15)', borderRadius: 10, fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
        💡 <strong style={{ color: '#e2e8f0' }}>Full scan utilisation, per-module usage rates, and MRR trend</strong> require cross-referencing with portal scan data. This will be wired up in sub-project 3 (portal integration).
      </div>
    </div>
  )
}
