import { createServiceClient } from '@/lib/supabase/server'

export default async function RevenuePage() {
  const db = createServiceClient()

  const [{ data: _t }, { data: _se }] = await Promise.all([
    db.from('tenants').select('id, plan, mrr_eur, lifetime_revenue_eur, created_at, activated_at, cancelled_at, plan_started_at, industry, company_size'),
    db.from('subscription_events').select('*').order('created_at', { ascending: false }).limit(100),
  ])

  const rows   = (_t  ?? []) as any[]
  const events = (_se ?? []) as any[]

  const paying   = rows.filter(t => t.plan !== 'free' && !t.cancelled_at)
  const churned  = rows.filter(t => t.cancelled_at)
  const mrr      = paying.reduce((s, t) => s + (t.mrr_eur ?? 0), 0)
  const arr      = mrr * 12
  const arpu     = paying.length > 0 ? mrr / paying.length : 0

  // New MRR this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const newMrr  = events.filter(e => e.event_type === 'upgraded' && e.created_at >= startOfMonth).reduce((s, e) => s + Math.max(0, e.mrr_delta_eur ?? 0), 0)
  const churnMrr = events.filter(e => e.event_type === 'cancelled' && e.created_at >= startOfMonth).reduce((s, e) => s + Math.abs(e.mrr_delta_eur ?? 0), 0)
  const netNewMrr = newMrr - churnMrr

  // Lifetime
  const lifetimeRev = rows.reduce((s, t) => s + (t.lifetime_revenue_eur ?? 0), 0)

  // Plan breakdown
  const planGroups: Record<string, { count: number; mrr: number }> = {}
  paying.forEach(t => {
    if (!planGroups[t.plan]) planGroups[t.plan] = { count: 0, mrr: 0 }
    planGroups[t.plan].count++
    planGroups[t.plan].mrr += t.mrr_eur ?? 0
  })

  const fmtEur = (n: number) => `€${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const planColors: Record<string, string> = { enterprise: '#a78bfa', professional: '#42a5f5', starter: '#22c55e' }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Revenue</div>
          <div className="page-sub">MRR, ARR, churn, and subscription history</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'MRR',         value: fmtEur(mrr),  sub: `ARR ${fmtEur(arr)}`,           color: '#22c55e' },
          { label: 'ARPU',        value: fmtEur(Math.round(arpu)), sub: 'avg per paying tenant', color: '#42a5f5' },
          { label: 'Net New MRR', value: `${netNewMrr >= 0 ? '+' : ''}${fmtEur(netNewMrr)}`, sub: 'this month (new − churn)', color: netNewMrr >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Churned MRR', value: fmtEur(churnMrr), sub: `${churned.length} cancelled tenants`, color: churnMrr > 0 ? '#ef4444' : '#475569' },
        ].map(k => (
          <div key={k.label} className="card kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Plan revenue breakdown */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Revenue by Plan</div>
          {['enterprise', 'professional', 'starter'].map(plan => {
            const g = planGroups[plan]
            if (!g) return null
            const pct = mrr > 0 ? Math.round((g.mrr / mrr) * 100) : 0
            return (
              <div key={plan} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: planColors[plan] }}>{plan}</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0' }}>{fmtEur(g.mrr)} · {g.count} tenants</span>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{ width: `${pct}%`, background: planColors[plan] }} />
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{pct}% of total MRR</div>
              </div>
            )
          })}
          {Object.keys(planGroups).length === 0 && <div style={{ fontSize: 12, color: '#475569' }}>No paying customers yet</div>}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card-sm">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Lifetime Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{fmtEur(lifetimeRev)}</div>
          </div>
          <div className="card-sm">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Paying Tenants</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#42a5f5' }}>{paying.length}</div>
          </div>
          <div className="card-sm">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Churn Rate (MRR)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: mrr > 0 && churnMrr > 0 ? '#ef4444' : '#22c55e' }}>
              {mrr > 0 ? `${((churnMrr / (mrr + churnMrr)) * 100).toFixed(1)}%` : '0%'}
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>this month</div>
          </div>
        </div>
      </div>

      {/* Subscription event log */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
          Subscription Event Log
        </div>
        {events.length > 0 ? (
          <table className="data-table">
            <thead><tr><th>Event</th><th>From</th><th>To</th><th>MRR Δ</th><th>MRR After</th><th>Period</th><th>Date</th></tr></thead>
            <tbody>
              {events.map(e => {
                const typeColors: Record<string, string> = {
                  upgraded: 'badge-green', downgraded: 'badge-amber', cancelled: 'badge-red',
                  payment_failed: 'badge-red', payment_recovered: 'badge-green', trialled: 'badge-blue',
                }
                return (
                  <tr key={e.id}>
                    <td><span className={`badge ${typeColors[e.event_type] ?? 'badge-grey'}`}>{e.event_type}</span></td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>{e.from_plan ?? '—'}</td>
                    <td style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{e.to_plan ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: (e.mrr_delta_eur ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {e.mrr_delta_eur != null ? `${e.mrr_delta_eur >= 0 ? '+' : ''}€${Math.abs(e.mrr_delta_eur)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                      {e.mrr_after_eur != null ? `€${e.mrr_after_eur}` : '—'}
                    </td>
                    <td style={{ fontSize: 10, color: '#475569' }}>{e.billing_period ?? '—'}</td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '24px 20px', fontSize: 12, color: '#475569' }}>No subscription events yet. Events appear here after Stripe webhooks fire.</div>
        )}
      </div>
    </>
  )
}
