'use client'

import Link from 'next/link'
import type { PricingSetListItem, AbTestWithSets } from '@/lib/pricing-sets/types'

function fmtWindow(from: string, to: string | null): string {
  const f = new Date(from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const t = to ? new Date(to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '∞ Forever'
  return `${f} → ${t}`
}

const STATUS_COLOR: Record<string, string> = {
  active: 'badge-green', draft: 'badge-grey', archived: 'badge-red', ended: 'badge-red',
}

export default function PricingSetsClient({
  sets, tests,
}: { sets: PricingSetListItem[]; tests: AbTestWithSets[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Sets */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing Sets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {sets.map(s => (
            <Link key={s.id} href={`/dashboard/pricing-sets/${s.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: `1px solid ${s.is_live ? 'rgba(34,197,94,.25)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, padding: 18, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.is_live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block', flexShrink: 0 }} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{s.name}</span>
                  </div>
                  <span className={`badge ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>{fmtWindow(s.active_from, s.active_to)}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{s.package_count} package{s.package_count !== 1 ? 's' : ''}</div>
              </div>
            </Link>
          ))}
          <Link href="/dashboard/pricing-sets/new" style={{ textDecoration: 'none', border: '1px dashed rgba(66,165,245,.2)', background: 'rgba(66,165,245,.02)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 110, gap: 8, color: '#42a5f5', fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(66,165,245,.1)', border: '1px solid rgba(66,165,245,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>+</div>
            New Set
          </Link>
        </div>
      </div>

      {/* A/B Tests */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase' }}>A/B Tests</div>
          <Link href="/dashboard/pricing-sets/tests/new" className="btn-s" style={{ fontSize: 11, padding: '4px 12px' }}>+ New Test</Link>
        </div>
        {tests.length === 0 && (
          <div style={{ fontSize: 12, color: '#475569', padding: '14px 0' }}>No A/B tests yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tests.map(t => (
            <Link key={t.id} href={`/dashboard/pricing-sets/tests/${t.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: `1px solid ${t.is_live ? 'rgba(66,165,245,.25)' : 'rgba(255,255,255,.06)'}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {t.is_live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#42a5f5', boxShadow: '0 0 6px #42a5f5', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {t.set_a.name} ({t.traffic_split_a}%) vs {t.set_b.name} ({100 - t.traffic_split_a}%) · {fmtWindow(t.active_from, t.active_to)}
                  </div>
                </div>
                <span className={`badge ${STATUS_COLOR[t.status]}`}>{t.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
