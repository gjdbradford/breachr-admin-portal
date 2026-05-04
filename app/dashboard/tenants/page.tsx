import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

function fmtEur(n: number | null) {
  if (!n) return '—'
  return `€${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

const PLAN_BADGE: Record<string, string> = {
  enterprise: 'badge-purple', professional: 'badge-blue', starter: 'badge-green', free: 'badge-grey',
}

export default async function TenantsPage() {
  const db = createServiceClient()

  const { data: _tenants } = await db
    .from('tenants')
    .select('*, users(id, email, last_login_at, login_count, is_superuser)')
    .order('created_at', { ascending: false })

  const rows = (_tenants ?? []) as any[]
  const totalMrr = rows.filter(t => !t.cancelled_at).reduce((s, t) => s + (t.mrr_eur ?? 0), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">All Tenants</div>
          <div className="page-sub">{rows.length} total · €{totalMrr.toLocaleString()} MRR</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>MRR</th>
              <th>Stage</th>
              <th>Scans</th>
              <th>Findings</th>
              <th>AI Cost</th>
              <th>Last Login</th>
              <th>Churn Risk</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t: any) => {
              const email = t.users?.[0]?.email ?? t.users?.email ?? '—'
              const lastLogin = t.last_login_at
                ? Math.floor((Date.now() - new Date(t.last_login_at).getTime()) / 86400_000)
                : null
              const stage = t.activated_at ? 'activated'
                : t.first_scan_at ? 'scanned'
                : t.first_target_at ? 'targeted'
                : 'registered'
              const stageColor: Record<string, string> = {
                activated: 'badge-green', scanned: 'badge-blue', targeted: 'badge-amber', registered: 'badge-grey',
              }
              const riskColor = (t.churn_risk_score ?? 0) >= 70 ? '#ef4444'
                : (t.churn_risk_score ?? 0) >= 40 ? '#f59e0b'
                : '#22c55e'

              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{email}</div>
                    <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#334155', marginTop: 1 }}>{t.id.slice(0, 12)}…</div>
                    {t.cancelled_at && <div style={{ fontSize: 9, color: '#ef4444', marginTop: 1 }}>CANCELLED</div>}
                  </td>
                  <td><span className={`badge ${PLAN_BADGE[t.plan] ?? 'badge-grey'}`}>{t.plan}</span></td>
                  <td style={{ color: '#22c55e', fontSize: 12, fontFamily: 'monospace' }}>{fmtEur(t.mrr_eur)}</td>
                  <td><span className={`badge ${stageColor[stage]}`}>{stage}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.total_scans_all_time ?? 0}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.total_findings_all_time ?? 0}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#a78bfa' }}>
                    {t.total_cost_usd_all_time ? `$${Number(t.total_cost_usd_all_time).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: lastLogin != null && lastLogin > 14 ? '#ef4444' : '#64748b' }}>
                    {lastLogin != null ? `${lastLogin}d ago` : 'never'}
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 700, color: riskColor }}>
                      {t.churn_risk_score != null ? `${Math.round(t.churn_risk_score)}` : '—'}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
