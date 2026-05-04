import { createServiceClient } from '@/lib/supabase/server'

function fmt(n: number | null | undefined, prefix = '', suffix = '') {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M${suffix}`
  if (n >= 1_000)     return `${prefix}${(n / 1_000).toFixed(1)}K${suffix}`
  return `${prefix}${n}${suffix}`
}

function fmtEur(n: number | null) {
  if (n == null) return '—'
  return `€${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function KPI({ label, value, sub, color = '#e2e8f0' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default async function AdminDashboard() {
  const db = createServiceClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
  const sevenDaysAgo  = new Date(Date.now() -  7 * 86400_000).toISOString()

  const [
    { data: _tenants },
    { data: _scansMonth },
    { data: _scansAll },
    { data: _findingsAll },
    { data: _recentEvents },
    { data: _subEvents },
  ] = await Promise.all([
    db.from('tenants').select('id, plan, mrr_eur, activated_at, last_login_at, last_scan_at, created_at, cancelled_at, total_scans_all_time, total_findings_all_time, total_cost_usd_all_time, churn_risk_score, industry, company_size'),
    db.from('scans').select('id, status, cost_usd, tokens_input, tokens_output, findings_count, critical_count, created_at').gte('created_at', startOfMonth),
    db.from('scans').select('id, status, cost_usd, findings_count').eq('status', 'complete'),
    db.from('findings').select('id, severity, false_positive, days_to_remediate, created_at').gte('created_at', thirtyDaysAgo),
    db.from('events').select('event, created_at, tenant_id').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(200),
    db.from('subscription_events').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  const tenants      = _tenants      as any[] | null
  const scansMonth   = _scansMonth   as any[] | null
  const findingsAll  = _findingsAll  as any[] | null
  const recentEvents = _recentEvents as any[] | null
  const subEvents    = _subEvents    as any[] | null

  // ── KPI calculations ────────────────────────────────────────────────────────
  const allTenants    = (tenants ?? []) as any[]
  const paying        = allTenants.filter(t => t.plan !== 'free' && !t.cancelled_at)
  const free          = allTenants.filter(t => t.plan === 'free')
  const churned       = allTenants.filter(t => t.cancelled_at)
  const mrr           = paying.reduce((s, t) => s + (t.mrr_eur ?? 0), 0)
  const arr           = mrr * 12

  // Activation
  const activated     = allTenants.filter(t => t.activated_at).length
  const activationRate = allTenants.length > 0 ? Math.round((activated / allTenants.length) * 100) : 0

  // MAU — unique tenants with login in last 30 days
  const mauSet = new Set((recentEvents ?? []).filter((e: any) => e.event === 'user.logged_in').map((e: any) => e.tenant_id))
  const mau    = mauSet.size || allTenants.filter((t: any) => t.last_login_at && t.last_login_at >= thirtyDaysAgo).length

  // WAU — last 7 days
  const wauSet = new Set((recentEvents ?? []).filter((e: any) => e.event === 'user.logged_in' && e.created_at >= sevenDaysAgo).map((e: any) => e.tenant_id))
  const wau    = wauSet.size || allTenants.filter((t: any) => t.last_login_at && t.last_login_at >= sevenDaysAgo).length

  // Scans this month
  const scansThisMonth   = scansMonth?.length ?? 0
  const completedMonth   = scansMonth?.filter(s => s.status === 'complete').length ?? 0
  const failedMonth      = scansMonth?.filter(s => s.status === 'failed').length ?? 0
  const completionRate   = scansThisMonth > 0 ? Math.round((completedMonth / scansThisMonth) * 100) : 0
  const totalCostMonth   = (scansMonth ?? []).reduce((s, sc) => s + (sc.cost_usd ?? 0), 0)
  const totalTokensMonth = (scansMonth ?? []).reduce((s, sc) => s + (sc.tokens_input ?? 0) + (sc.tokens_output ?? 0), 0)

  // Findings (30d)
  const totalFindings30d   = findingsAll?.length ?? 0
  const criticalFindings30d = findingsAll?.filter(f => f.severity === 'critical').length ?? 0
  const falsePositives30d  = findingsAll?.filter(f => f.false_positive).length ?? 0
  const fpRate = totalFindings30d > 0 ? Math.round((falsePositives30d / totalFindings30d) * 100) : 0
  const remediated30d = findingsAll?.filter(f => f.days_to_remediate != null).length ?? 0
  const avgMTTR = remediated30d > 0
    ? Math.round((findingsAll ?? []).filter(f => f.days_to_remediate != null).reduce((s, f) => s + (f.days_to_remediate ?? 0), 0) / remediated30d)
    : null

  // Churn risk — tenants not seen in 14+ days with paid plan
  const atRisk = paying.filter(t => !t.last_login_at || new Date(t.last_login_at) < new Date(Date.now() - 14 * 86400_000))

  // Plan distribution
  const planDist: Record<string, number> = {}
  allTenants.forEach(t => { planDist[t.plan] = (planDist[t.plan] ?? 0) + 1 })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Product Overview</div>
          <div className="page-sub">Live data — {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* ── Revenue ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10, fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Revenue</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <KPI label="MRR" value={fmtEur(mrr)} sub={`ARR ${fmtEur(arr)}`} color="#22c55e" />
        <KPI label="Paying Customers" value={String(paying.length)} sub={`${free.length} free, ${churned.length} churned`} color="#42a5f5" />
        <KPI label="ARPU" value={paying.length > 0 ? fmtEur(Math.round(mrr / paying.length)) : '—'} sub="avg monthly per paying tenant" />
        <KPI label="Lifetime Revenue" value={fmtEur(allTenants.reduce((s,t) => s + (t.total_cost_usd_all_time ?? 0), 0))} sub="all time, all tenants" />
      </div>

      {/* ── Engagement ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10, fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Engagement</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <KPI label="MAU (30d)" value={String(mau)} sub={`WAU ${wau}`} color="#42a5f5" />
        <KPI label="Activation Rate" value={`${activationRate}%`} sub={`${activated} / ${allTenants.length} reached first scan`} color={activationRate >= 60 ? '#22c55e' : activationRate >= 30 ? '#f59e0b' : '#ef4444'} />
        <KPI label="Churn Risk" value={String(atRisk.length)} sub="paid tenants silent 14+ days" color={atRisk.length === 0 ? '#22c55e' : atRisk.length <= 2 ? '#f59e0b' : '#ef4444'} />
        <KPI label="Total Tenants" value={String(allTenants.length)} sub={`${paying.length} paying`} />
      </div>

      {/* ── Scans this month ────────────────────────────────────────── */}
      <div style={{ marginBottom: 10, fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scans — This Month</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <KPI label="Scans Run" value={String(scansThisMonth)} sub={`${completedMonth} completed, ${failedMonth} failed`} color="#e2e8f0" />
        <KPI label="Completion Rate" value={`${completionRate}%`} sub="scans that finished successfully" color={completionRate >= 90 ? '#22c55e' : completionRate >= 70 ? '#f59e0b' : '#ef4444'} />
        <KPI label="AI Cost" value={`$${totalCostMonth.toFixed(2)}`} sub={`${fmt(totalTokensMonth)} tokens`} color="#a78bfa" />
        <KPI label="Cost / Scan" value={completedMonth > 0 ? `$${(totalCostMonth / completedMonth).toFixed(3)}` : '—'} sub="avg Claude cost per completed scan" />
      </div>

      {/* ── Finding quality ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 10, fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Finding Quality — Last 30 Days</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <KPI label="Findings" value={String(totalFindings30d)} sub={`${criticalFindings30d} critical`} color="#f59e0b" />
        <KPI label="False Positive Rate" value={`${fpRate}%`} sub={`${falsePositives30d} of ${totalFindings30d} flagged FP`} color={fpRate <= 5 ? '#22c55e' : fpRate <= 15 ? '#f59e0b' : '#ef4444'} />
        <KPI label="Avg MTTR" value={avgMTTR != null ? `${avgMTTR}d` : '—'} sub="mean days to remediate" color={avgMTTR != null && avgMTTR <= 7 ? '#22c55e' : '#f59e0b'} />
        <KPI label="Remediation Rate" value={totalFindings30d > 0 ? `${Math.round((remediated30d / totalFindings30d) * 100)}%` : '—'} sub="findings that reached remediated" />
      </div>

      {/* ── Plan distribution + At-risk tenants ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>

        {/* Plan mix */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Plan Distribution</div>
          {['enterprise', 'professional', 'starter', 'free'].map(plan => {
            const count = planDist[plan] ?? 0
            const pct   = allTenants.length > 0 ? (count / allTenants.length) * 100 : 0
            const colors: Record<string, string> = { enterprise: '#a78bfa', professional: '#42a5f5', starter: '#22c55e', free: '#475569' }
            return (
              <div key={plan} className="funnel-bar" style={{ marginBottom: 10 }}>
                <div className="funnel-label" style={{ textTransform: 'capitalize' }}>{plan}</div>
                <div className="funnel-track">
                  <div className="funnel-fill" style={{ width: `${pct}%`, background: colors[plan] ?? '#475569', minWidth: count > 0 ? 40 : 0 }}>
                    {count > 0 && count}
                  </div>
                </div>
                <div className="funnel-pct" style={{ color: colors[plan] }}>{Math.round(pct)}%</div>
              </div>
            )
          })}
        </div>

        {/* Churn risk list */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
            ⚠ Churn Risk — Paid Tenants Silent 14+ Days
          </div>
          {atRisk.length === 0 ? (
            <div style={{ fontSize: 12, color: '#475569', padding: '16px 0' }}>All paying customers active ✓</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Tenant</th><th>Plan</th><th>MRR</th><th>Last Seen</th></tr></thead>
              <tbody>
                {atRisk.slice(0, 8).map(t => {
                  const days = t.last_login_at
                    ? Math.floor((Date.now() - new Date(t.last_login_at).getTime()) / 86400_000)
                    : null
                  return (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{t.id.slice(0, 8)}…</td>
                      <td><span className={`badge badge-${t.plan === 'professional' ? 'blue' : t.plan === 'starter' ? 'green' : 'purple'}`}>{t.plan}</span></td>
                      <td style={{ color: '#22c55e', fontSize: 11 }}>{fmtEur(t.mrr_eur)}</td>
                      <td style={{ color: '#ef4444', fontSize: 11 }}>{days != null ? `${days}d ago` : 'never'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Recent subscription events ───────────────────────────────── */}
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Recent Subscription Events</div>
        {subEvents && subEvents.length > 0 ? (
          <table className="data-table">
            <thead><tr><th>Event</th><th>From</th><th>To</th><th>MRR Δ</th><th>Date</th></tr></thead>
            <tbody>
              {subEvents.map(e => {
                const typeColors: Record<string, string> = {
                  upgraded: 'badge-green', downgraded: 'badge-amber', cancelled: 'badge-red',
                  payment_failed: 'badge-red', payment_recovered: 'badge-green',
                }
                return (
                  <tr key={e.id}>
                    <td><span className={`badge ${typeColors[e.event_type] ?? 'badge-grey'}`}>{e.event_type}</span></td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>{e.from_plan ?? '—'}</td>
                    <td style={{ fontSize: 11, color: '#e2e8f0' }}>{e.to_plan ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: (e.mrr_delta_eur ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {e.mrr_delta_eur != null ? `${e.mrr_delta_eur >= 0 ? '+' : ''}€${e.mrr_delta_eur}` : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 12, color: '#475569' }}>No subscription events yet — run the schema migration to start tracking.</div>
        )}
      </div>
    </>
  )
}
