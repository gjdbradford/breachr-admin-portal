import { createServiceClient } from '@/lib/supabase/server'

const PLAN_LIMITS: Record<string, number> = {
  free: 1, starter: 3, professional: 5, enterprise: 999,
}

const statusColor: Record<string, string> = {
  queued: '#64748b', running: '#42a5f5', complete: '#22c55e',
  failed: '#ef4444', cancelled: '#f59e0b',
}

export default async function ScanningPage() {
  const db = createServiceClient()

  const [{ data: _scans }, { data: _tenants }] = await Promise.all([
    db.from('scans')
      .select('id, tenant_id, status, scan_type, target_url, created_at, started_at, completed_at, cost_usd, findings_count, critical_count, error_message')
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: true }),
    db.from('tenants')
      .select('id, plan, name, mrr_eur')
      .in('plan', ['free', 'starter', 'professional', 'enterprise']),
  ])

  const activeScans = (_scans ?? []) as any[]
  const tenants = (_tenants ?? []) as any[]

  // Build concurrent usage per tenant
  const concurrencyMap: Record<string, { active: number; limit: number; plan: string; name: string }> = {}
  tenants.forEach(t => {
    concurrencyMap[t.id] = {
      active: 0,
      limit: PLAN_LIMITS[t.plan] ?? 1,
      plan: t.plan,
      name: t.name ?? t.id.slice(0, 8),
    }
  })
  activeScans.forEach(s => {
    if (concurrencyMap[s.tenant_id]) {
      concurrencyMap[s.tenant_id].active++
    }
  })

  const atLimit = Object.entries(concurrencyMap).filter(([, v]) => v.active >= v.limit && v.active > 0)
  const running = activeScans.filter(s => s.status === 'running')
  const queued  = activeScans.filter(s => s.status === 'queued')

  function elapsed(from: string | null) {
    if (!from) return '—'
    const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000)
    if (secs < 60) return `${secs}s`
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Concurrent Scanning</div>
          <div className="page-sub">
            {running.length} running · {queued.length} queued
          </div>
        </div>
      </div>

      {/* Plan limits reference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {Object.entries(PLAN_LIMITS).map(([plan, limit]) => {
          const planTenants = tenants.filter(t => t.plan === plan)
          const totalActive = planTenants.reduce((s, t) => s + (concurrencyMap[t.id]?.active ?? 0), 0)
          const planColors: Record<string, string> = { free: '#475569', starter: '#22c55e', professional: '#42a5f5', enterprise: '#a78bfa' }
          return (
            <div key={plan} className="card kpi">
              <div className="kpi-label" style={{ textTransform: 'capitalize' }}>{plan}</div>
              <div className="kpi-value" style={{ color: planColors[plan] }}>
                {limit === 999 ? '∞' : limit} concurrent
              </div>
              <div className="kpi-sub">{totalActive} active · {planTenants.length} tenants</div>
            </div>
          )
        })}
      </div>

      {/* At-limit tenants */}
      {atLimit.length > 0 && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>
            ⚠ Tenants At Concurrency Limit ({atLimit.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {atLimit.map(([id, v]) => (
              <div key={id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {v.name} · <span style={{ textTransform: 'capitalize' }}>{v.plan}</span> · {v.active}/{v.limit}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live scan queue */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
          Live Queue
        </div>
        {activeScans.length === 0 ? (
          <div style={{ padding: '32px 20px', fontSize: 12, color: '#475569', textAlign: 'center' }}>
            No active scans right now
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Scan ID</th>
                <th>Tenant</th>
                <th>Type</th>
                <th>Target</th>
                <th>Status</th>
                <th>Elapsed</th>
                <th>Queued</th>
              </tr>
            </thead>
            <tbody>
              {activeScans.map(s => {
                const tenant = tenants.find(t => t.id === s.tenant_id)
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155' }}>{s.id.slice(0, 12)}…</td>
                    <td>
                      <div style={{ fontSize: 11, color: '#e2e8f0' }}>{tenant?.name ?? '—'}</div>
                      <div style={{ fontSize: 9, color: '#475569', textTransform: 'capitalize' }}>{tenant?.plan ?? '—'}</div>
                    </td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{s.scan_type ?? '—'}</span></td>
                    <td style={{ fontSize: 11, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.target_url ?? '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[s.status] ?? '#64748b' }}>
                        {s.status === 'running' && '● '}
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                      {elapsed(s.status === 'running' ? s.started_at : s.created_at)}
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {new Date(s.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
