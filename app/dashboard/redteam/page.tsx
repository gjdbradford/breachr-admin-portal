import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

const phaseColor: Record<string, string> = {
  requested: '#64748b', scoping: '#f59e0b', active: '#42a5f5',
  reporting: '#a78bfa', closed: '#22c55e', cancelled: '#ef4444',
}

const regulationLabel: Record<string, string> = {
  dora_tlpt: 'DORA Art.26 TLPT', nis2: 'NIS2', tiber_eu: 'TIBER-EU',
  crest: 'CREST', custom: 'Custom',
}

export default async function RedTeamPage() {
  const db = createServiceClient()

  const [{ data: _engagements }, { data: _staff }] = await Promise.all([
    db.from('engagements')
      .select('*, tenants(name, plan), engagement_team(staff_id, role, staff(full_name, crest_certified))')
      .order('created_at', { ascending: false }),
    db.from('staff')
      .select('id, full_name, crest_certified, certifications, available, active_engagement_count')
      .order('full_name'),
  ])

  const engagements = (_engagements ?? []) as any[]
  const staff       = (_staff       ?? []) as any[]

  const active    = engagements.filter(e => e.phase === 'active')
  const scoping   = engagements.filter(e => e.phase === 'scoping')
  const available = staff.filter(s => s.available && (s.active_engagement_count ?? 0) < 2)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Red Team Operations</div>
          <div className="page-sub">
            {active.length} active · {scoping.length} in scope · {staff.length} CREST hackers
          </div>
        </div>
        <Link href="/dashboard/redteam/new" className="btn-p" style={{ fontSize: 12, padding: '8px 18px' }}>
          + New Engagement
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Active Engagements',  value: String(active.length),           color: '#42a5f5' },
          { label: 'In Scoping',          value: String(scoping.length),           color: '#f59e0b' },
          { label: 'CREST Hackers',       value: String(staff.length),             color: '#a78bfa' },
          { label: 'Available Now',       value: String(available.length),         color: available.length > 0 ? '#22c55e' : '#ef4444' },
        ].map(k => (
          <div key={k.label} className="card kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Engagement list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
            All Engagements
          </div>
          {engagements.length === 0 ? (
            <div style={{ padding: '32px 20px', fontSize: 12, color: '#475569', textAlign: 'center' }}>
              No engagements yet.{' '}
              <Link href="/dashboard/redteam/new" style={{ color: '#42a5f5' }}>Create the first one →</Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Engagement</th><th>Customer</th><th>Regulation</th><th>Phase</th><th>Team Lead</th><th>Timeline</th></tr>
              </thead>
              <tbody>
                {engagements.map(e => {
                  const lead = e.engagement_team?.find((t: any) => t.role === 'lead')
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/dashboard/redteam/${e.id}`} style={{ fontSize: 12, color: '#42a5f5', fontWeight: 600, textDecoration: 'none' }}>
                          {e.name ?? `ENG-${e.id.slice(0, 6).toUpperCase()}`}
                        </Link>
                        <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#334155', marginTop: 1 }}>{e.id.slice(0, 12)}…</div>
                      </td>
                      <td style={{ fontSize: 11, color: '#e2e8f0' }}>{e.tenants?.name ?? '—'}</td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: 9 }}>
                          {regulationLabel[e.regulation_type] ?? e.regulation_type ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: phaseColor[e.phase] ?? '#64748b', textTransform: 'capitalize' }}>
                          {e.phase === 'active' && '● '}
                          {e.phase}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: '#94a3b8' }}>
                        {lead?.staff?.full_name ?? '—'}
                        {lead?.staff?.crest_certified && <span style={{ fontSize: 9, color: '#a78bfa', marginLeft: 4 }}>CREST</span>}
                      </td>
                      <td style={{ fontSize: 10, color: '#64748b' }}>
                        {e.start_date ? new Date(e.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                        {' → '}
                        {e.end_date ? new Date(e.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '?'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Staff availability */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>CREST Hacker Availability</div>
          {staff.length === 0 ? (
            <div style={{ fontSize: 12, color: '#475569' }}>No staff records yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staff.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{s.full_name}</div>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
                      {s.certifications?.join(' · ') ?? 'No certs listed'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.available ? '#22c55e' : '#ef4444' }}>
                      {s.available ? 'Available' : 'Busy'}
                    </div>
                    <div style={{ fontSize: 9, color: '#475569' }}>
                      {s.active_engagement_count ?? 0} active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
