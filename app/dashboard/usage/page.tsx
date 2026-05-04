import { createServiceClient } from '@/lib/supabase/server'

export default async function UsagePage() {
  const db = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()

  const [
    { data: _scans },
    { data: _findings },
  ] = await Promise.all([
    db.from('scans').select('id, scan_type, model_used, status, tokens_input, tokens_output, cost_usd, findings_count, critical_count, total_duration_ms, analysis_duration_ms, probe_duration_ms, queue_wait_ms, error_type, created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
    db.from('findings').select('severity, false_positive, days_to_remediate, ai_confidence, owasp_category').gte('created_at', thirtyDaysAgo),
  ])

  const rows    = (_scans    ?? []) as any[]
  const findings = (_findings ?? []) as any[]
  const done    = rows.filter((s: any) => s.status === 'complete')
  const failed  = rows.filter((s: any) => s.status === 'failed')

  // Model distribution
  const modelDist: Record<string, number> = {}
  rows.forEach(s => { if (s.model_used) modelDist[s.model_used] = (modelDist[s.model_used] ?? 0) + 1 })

  // Scan type distribution
  const typeDist: Record<string, number> = {}
  rows.forEach(s => { if (s.scan_type) typeDist[s.scan_type] = (typeDist[s.scan_type] ?? 0) + 1 })

  // Error type distribution
  const errorDist: Record<string, number> = {}
  failed.forEach(s => { if (s.error_type) errorDist[s.error_type] = (errorDist[s.error_type] ?? 0) + 1 })

  // OWASP distribution
  const owaspDist: Record<string, number> = {}
  ;(findings ?? []).forEach(f => { if (f.owasp_category) owaspDist[f.owasp_category] = (owaspDist[f.owasp_category] ?? 0) + 1 })
  const topOwasp = Object.entries(owaspDist).sort((a,b) => b[1] - a[1]).slice(0, 8)

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter(n => n != null) as number[]
    return valid.length > 0 ? Math.round(valid.reduce((a,b) => a+b,0) / valid.length) : null
  }

  const avgDuration = avg(done.map(s => s.total_duration_ms))
  const avgQueue    = avg(done.map(s => s.queue_wait_ms))
  const avgAI       = avg(done.map(s => s.analysis_duration_ms))
  const avgTokens   = avg(done.map(s => (s.tokens_input ?? 0) + (s.tokens_output ?? 0)))
  const totalCost   = done.reduce((s,sc) => s + (sc.cost_usd ?? 0), 0)
  const costPerFind = done.reduce((s,sc) => s + (sc.findings_count ?? 0), 0)
  const avgConf     = avg((findings ?? []).map(f => f.ai_confidence))

  const fmtMs = (ms: number | null) => ms == null ? '—' : ms > 60000 ? `${Math.round(ms/60000)}m` : `${Math.round(ms/1000)}s`

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usage & AI Metrics</div>
          <div className="page-sub">Last 30 days — {rows.length} scans</div>
        </div>
      </div>

      {/* Performance KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Avg Scan Duration', value: fmtMs(avgDuration), sub: 'start → complete' },
          { label: 'Avg Queue Wait',    value: fmtMs(avgQueue),    sub: 'queued → running', color: avgQueue != null && avgQueue > 30000 ? '#ef4444' : '#22c55e' },
          { label: 'Avg AI Analysis',   value: fmtMs(avgAI),       sub: 'Claude phase only' },
          { label: 'Avg Tokens/Scan',   value: avgTokens != null ? `${Math.round(avgTokens / 1000)}K` : '—', sub: 'in + out combined' },
        ].map(k => (
          <div key={k.label} className="card kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize: 22, color: k.color ?? '#e2e8f0' }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total AI Cost (30d)',  value: `$${totalCost.toFixed(2)}`,  color: '#a78bfa' },
          { label: 'Cost / Finding',       value: costPerFind > 0 ? `$${(totalCost / costPerFind).toFixed(3)}` : '—', color: '#a78bfa' },
          { label: 'Avg AI Confidence',    value: avgConf != null ? `${avgConf}%` : '—', color: avgConf != null && avgConf >= 85 ? '#22c55e' : '#f59e0b' },
          { label: 'Scan Failure Rate',    value: rows.length > 0 ? `${Math.round((failed.length / rows.length) * 100)}%` : '—', color: failed.length / Math.max(rows.length,1) > 0.1 ? '#ef4444' : '#22c55e' },
        ].map(k => (
          <div key={k.label} className="card kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize: 22, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Scan type dist */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Scan Types</div>
          {Object.entries(typeDist).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8' }}>{type}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#42a5f5' }}>{count} ({Math.round(count/rows.length*100)}%)</span>
            </div>
          ))}
          {Object.keys(typeDist).length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>No data yet</div>}
        </div>

        {/* AI model dist */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>AI Models Used</div>
          {Object.entries(modelDist).sort((a,b) => b[1]-a[1]).map(([model, count]) => (
            <div key={model} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{model.split('-').slice(-2).join('-')}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#a78bfa' }}>{count}</span>
            </div>
          ))}
          {Object.keys(modelDist).length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>No data yet</div>}
        </div>

        {/* Error types */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>
            Failure Types {failed.length > 0 && <span style={{ color: '#ef4444', fontSize: 10 }}>({failed.length} fails)</span>}
          </div>
          {Object.entries(errorDist).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{type}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#ef4444' }}>{count}</span>
            </div>
          ))}
          {Object.keys(errorDist).length === 0 && <div style={{ fontSize: 11, color: '#22c55e' }}>No failures ✓</div>}
        </div>
      </div>

      {/* OWASP coverage */}
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Top OWASP Categories Found (30d)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {topOwasp.map(([cat, count]) => {
            const pct = Math.round((count / (findings?.length ?? 1)) * 100)
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{cat}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>{count} findings</span>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{ width: `${pct}%`, background: '#f59e0b' }} />
                </div>
              </div>
            )
          })}
          {topOwasp.length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>No findings in last 30 days</div>}
        </div>
      </div>
    </>
  )
}
