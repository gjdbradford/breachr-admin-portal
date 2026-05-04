import { createServiceClient } from '@/lib/supabase/server'

export default async function FunnelPage() {
  const db = createServiceClient()
  const { data: tenants } = await db.from('tenants').select('id, created_at, first_target_at, first_scan_at, activated_at, plan, mrr_eur, mins_to_first_target, mins_to_first_scan, mins_to_activation').order('created_at', { ascending: false })

  const rows = (tenants ?? []) as any[]
  const total      = rows.length
  const targeted   = rows.filter((t: any) => t.first_target_at).length
  const scanned    = rows.filter((t: any) => t.first_scan_at).length
  const activated  = rows.filter((t: any) => t.activated_at).length
  const paid       = rows.filter((t: any) => t.plan !== 'free').length

  const steps = [
    { label: 'Registered',         n: total,     color: '#475569' },
    { label: 'Added Target',       n: targeted,  color: '#f59e0b' },
    { label: 'Launched Scan',      n: scanned,   color: '#42a5f5' },
    { label: 'Got First Finding',  n: activated, color: '#22c55e' },
    { label: 'Converted to Paid',  n: paid,      color: '#a78bfa' },
  ]

  // Average times
  const avgTarget   = rows.filter(t => t.mins_to_first_target  != null).map(t => t.mins_to_first_target  as number)
  const avgScan     = rows.filter(t => t.mins_to_first_scan    != null).map(t => t.mins_to_first_scan    as number)
  const avgActivate = rows.filter(t => t.mins_to_activation    != null).map(t => t.mins_to_activation    as number)
  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const fmtMins = (m: number | null) => m == null ? '—' : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Activation Funnel</div>
          <div className="page-sub">Registration → paid conversion — all time</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>Funnel Steps</div>
          {steps.map((step, i) => {
            const pct = total > 0 ? Math.round((step.n / total) * 100) : 0
            const dropOff = i > 0 ? steps[i - 1].n - step.n : 0
            return (
              <div key={step.label} style={{ marginBottom: 16 }}>
                <div className="funnel-bar">
                  <div className="funnel-label">{step.label}</div>
                  <div className="funnel-track">
                    <div className="funnel-fill" style={{ width: `${pct}%`, background: step.color, minWidth: step.n > 0 ? 60 : 0 }}>
                      {step.n > 0 && <>{step.n} users</>}
                    </div>
                  </div>
                  <div className="funnel-pct" style={{ color: step.color }}>{pct}%</div>
                </div>
                {i > 0 && dropOff > 0 && (
                  <div style={{ paddingLeft: 132, fontSize: 10, color: '#ef4444', marginTop: -8, marginBottom: 4 }}>
                    ↓ {dropOff} dropped off ({Math.round((dropOff / steps[i-1].n) * 100)}% drop)
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Avg: Registration → Target</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{fmtMins(avg(avgTarget))}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Avg: Registration → First Scan</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#42a5f5' }}>{fmtMins(avg(avgScan))}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Avg: Registration → Activation (TTV)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{fmtMins(avg(avgActivate))}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Free → Paid Conversion</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa' }}>
              {total > 0 ? `${Math.round((paid / total) * 100)}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{paid} of {total} tenants</div>
          </div>
        </div>
      </div>
    </>
  )
}
