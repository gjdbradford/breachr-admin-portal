import { createServiceClient } from '@/lib/supabase/server'

export default async function CustomerVoicePage() {
  const db = createServiceClient()

  const [
    { data: npsRows },
    { data: csatRows },
    { data: pmfRows },
    { data: allResponses },
    { data: surveyCounts },
  ] = await Promise.all([
    db.from('survey_responses').select('nps_score, created_at').not('nps_score', 'is', null).order('created_at', { ascending: false }),
    db.from('survey_responses').select('csat_score').not('csat_score', 'is', null),
    db.from('survey_responses').select('pmf_score').not('pmf_score', 'is', null),
    db.from('survey_responses')
      .select('id, answers, nps_score, csat_score, pmf_score, created_at, survey_id, surveys(name,type), tenants(name,plan), users(email)')
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('survey_responses').select('survey_id, surveys(name,type)'),
  ])

  type NpsRow  = { nps_score: number | null; created_at: string }
  type CsatRow = { csat_score: number | null }
  type PmfRow  = { pmf_score: string | null }

  // ── NPS ──────────────────────────────────────────────────────────────────────
  const npsTotal = npsRows?.length ?? 0
  const promoters  = (npsRows as NpsRow[] | null)?.filter(r => (r.nps_score ?? 0) >= 9).length ?? 0
  const passives   = (npsRows as NpsRow[] | null)?.filter(r => (r.nps_score ?? 0) >= 7 && (r.nps_score ?? 0) <= 8).length ?? 0
  const detractors = (npsRows as NpsRow[] | null)?.filter(r => (r.nps_score ?? 0) <= 6).length ?? 0
  const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : null

  // ── CSAT ─────────────────────────────────────────────────────────────────────
  const csatTotal = csatRows?.length ?? 0
  const avgCsat = csatTotal > 0
    ? (((csatRows as CsatRow[] | null)?.reduce((s, r) => s + (r.csat_score ?? 0), 0) ?? 0) / csatTotal).toFixed(1)
    : null

  // ── PMF ──────────────────────────────────────────────────────────────────────
  const pmfTotal = pmfRows?.length ?? 0
  const veryDisappointed = (pmfRows as PmfRow[] | null)?.filter(r => r.pmf_score === 'Very disappointed').length ?? 0
  const pmfScore = pmfTotal > 0 ? Math.round((veryDisappointed / pmfTotal) * 100) : null

  // ── Response breakdown by survey ─────────────────────────────────────────────
  const surveyBreakdown: Record<string, { name: string; type: string; count: number }> = {}
  for (const r of surveyCounts ?? []) {
    const s = (r as any).surveys
    if (!s) continue
    const key = r.survey_id
    if (!surveyBreakdown[key]) surveyBreakdown[key] = { name: s.name, type: s.type, count: 0 }
    surveyBreakdown[key].count++
  }

  // ── Feature requests ─────────────────────────────────────────────────────────
  const featureRequests = (allResponses ?? [])
    .filter((r: any) => r.surveys?.type === 'feature_request' && r.answers?.q1)
    .map((r: any) => ({
      text: r.answers.q1 as string,
      area: r.answers.q2 as string | undefined,
      tenant: (r.tenants as any)?.name ?? 'Unknown',
      plan: (r.tenants as any)?.plan ?? '',
      date: r.created_at,
    }))

  // NPS trend (last 10 scores)
  const npsTrend = ((npsRows as NpsRow[] | null) ?? []).slice(0, 10).reverse()

  const totalResponses = allResponses?.length ?? 0

  return (
    <div className="admin-content">
      <div className="portal-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em' }}>Customer Voice</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{totalResponses} responses collected</p>
        </div>
      </div>

      {/* Top metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <VoiceCard
          label="Net Promoter Score"
          value={npsScore !== null ? String(npsScore) : '—'}
          sub={npsScore === null ? 'No responses yet' : npsScore >= 50 ? 'Excellent' : npsScore >= 30 ? 'Good' : npsScore >= 0 ? 'Needs work' : 'Critical'}
          accent={npsScore === null ? '#475569' : npsScore >= 50 ? '#22c55e' : npsScore >= 0 ? '#f59e0b' : '#ef4444'}
          detail={npsTotal > 0 ? `${npsTotal} response${npsTotal !== 1 ? 's' : ''}` : undefined}
        />
        <VoiceCard
          label="Avg CSAT Score"
          value={avgCsat !== null ? `${avgCsat}/5` : '—'}
          sub={avgCsat === null ? 'No responses yet' : parseFloat(avgCsat) >= 4 ? 'Very satisfied' : parseFloat(avgCsat) >= 3 ? 'Satisfied' : 'Needs attention'}
          accent={avgCsat === null ? '#475569' : parseFloat(avgCsat) >= 4 ? '#22c55e' : '#f59e0b'}
          detail={csatTotal > 0 ? `${csatTotal} response${csatTotal !== 1 ? 's' : ''}` : undefined}
        />
        <VoiceCard
          label="PMF Score"
          value={pmfScore !== null ? `${pmfScore}%` : '—'}
          sub={pmfScore === null ? 'No responses yet' : pmfScore >= 40 ? 'Product-market fit ✓' : pmfScore >= 25 ? 'Getting close' : 'Below threshold'}
          accent={pmfScore === null ? '#475569' : pmfScore >= 40 ? '#22c55e' : '#f59e0b'}
          detail={pmfTotal > 0 ? `% very disappointed` : undefined}
        />
        <VoiceCard
          label="Feature Requests"
          value={String(featureRequests.length)}
          sub="Open-text submissions"
          accent="#3b82f6"
        />
      </div>

      {/* NPS breakdown + trend */}
      {npsTotal > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="gs" style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>NPS Breakdown</p>
            <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
              {promoters > 0  && <div style={{ flex: promoters,  background: '#22c55e', transition: 'flex 0.3s' }} title={`Promoters: ${promoters}`} />}
              {passives > 0   && <div style={{ flex: passives,   background: '#f59e0b', transition: 'flex 0.3s' }} title={`Passives: ${passives}`} />}
              {detractors > 0 && <div style={{ flex: detractors, background: '#ef4444', transition: 'flex 0.3s' }} title={`Detractors: ${detractors}`} />}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Promoters', count: promoters,  pct: npsTotal, color: '#22c55e' },
                { label: 'Passives',  count: passives,   pct: npsTotal, color: '#f59e0b' },
                { label: 'Detractors', count: detractors, pct: npsTotal, color: '#ef4444' },
              ].map(g => (
                <div key={g.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: g.color }}>{g.count}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{g.label}</div>
                  <div style={{ fontSize: 9, color: '#475569' }}>{npsTotal > 0 ? Math.round(g.count / npsTotal * 100) : 0}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="gs" style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>
              NPS Trend <span style={{ fontSize: 10, fontWeight: 400, color: '#64748b' }}>(last {npsTrend.length} responses)</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
              {npsTrend.map((r: NpsRow, i: number) => {
                const score = r.nps_score ?? 0
                const color = score >= 9 ? '#22c55e' : score >= 7 ? '#f59e0b' : '#ef4444'
                const h = Math.max(4, Math.round((score / 10) * 60))
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: h, borderRadius: 3, background: color, opacity: 0.8 }} title={`Score: ${score}`} />
                    <span style={{ fontSize: 8, color: '#334155' }}>{score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Survey response counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="gs" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Survey Performance</p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Survey</th>
                <th>Type</th>
                <th>Responses</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(surveyBreakdown).length > 0 ? Object.values(surveyBreakdown).sort((a, b) => b.count - a.count).map(s => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{s.name}</td>
                  <td><TypeBadge type={s.type} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#42a5f5' }}>{s.count}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No responses yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Feature requests */}
        <div className="gs" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Feature Requests</p>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {featureRequests.length > 0 ? featureRequests.slice(0, 10).map((r: { text: string; area?: string; tenant: string; plan: string; date: string }, i: number) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <p style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4, marginBottom: 6 }}>"{r.text}"</p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {r.area && <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', borderRadius: 4, padding: '2px 6px' }}>{r.area}</span>}
                  <span style={{ fontSize: 9, color: '#475569' }}>{r.tenant}</span>
                  <PlanDot plan={r.plan} />
                </div>
              </div>
            )) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#475569', fontSize: 12 }}>No feature requests yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Response feed */}
      <div className="gs" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Response Feed</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Survey</th>
              <th>Score</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {(allResponses ?? []).length > 0 ? (allResponses ?? []).slice(0, 20).map((r: any) => {
              const score = r.nps_score ?? r.csat_score ?? (r.pmf_score ? pmfLabel(r.pmf_score) : null)
              return (
                <tr key={r.id}>
                  <td style={{ fontSize: 11 }}>{r.users?.email ?? '—'}</td>
                  <td><PlanDot plan={r.tenants?.plan ?? ''} label /></td>
                  <td style={{ fontSize: 11 }}>{r.surveys?.name ?? '—'}</td>
                  <td>
                    {r.nps_score !== null && r.nps_score !== undefined && (
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: r.nps_score >= 9 ? '#22c55e' : r.nps_score >= 7 ? '#f59e0b' : '#ef4444' }}>
                        {r.nps_score}/10
                      </span>
                    )}
                    {r.csat_score !== null && r.csat_score !== undefined && (
                      <span style={{ fontSize: 12, color: '#f59e0b' }}>{'★'.repeat(r.csat_score)}{'☆'.repeat(5 - r.csat_score)}</span>
                    )}
                    {r.pmf_score && (
                      <span style={{ fontSize: 10, color: r.pmf_score === 'Very disappointed' ? '#22c55e' : '#64748b' }}>
                        {r.pmf_score}
                      </span>
                    )}
                    {score === null && <span style={{ color: '#475569', fontSize: 10 }}>Open-text</span>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>
                    {new Date(r.created_at).toISOString().slice(0, 10)}
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={5} style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>No survey responses yet — surveys will appear in the customer portal automatically.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function pmfLabel(s: string) {
  if (s === 'Very disappointed') return 'PMF ✓'
  if (s === 'Somewhat disappointed') return 'Partial'
  return 'Not fit'
}

function VoiceCard({ label, value, sub, accent, detail }: { label: string; value: string; sub: string; accent: string; detail?: string }) {
  return (
    <div style={{ background: 'rgba(13,20,40,0.65)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: accent, fontFamily: 'monospace' }}>{value}</p>
      <p style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>{sub}</p>
      {detail && <p style={{ fontSize: 9, color: '#334155', marginTop: 4 }}>{detail}</p>}
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    nps:             { label: 'NPS',      color: '#3b82f6' },
    csat:            { label: 'CSAT',     color: '#22c55e' },
    pmf:             { label: 'PMF',      color: '#f59e0b' },
    feature_request: { label: 'Features', color: '#a78bfa' },
    exit:            { label: 'Exit',     color: '#ef4444' },
  }
  const s = map[type] ?? { label: type, color: '#64748b' }
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 4, background: `${s.color}18`, border: `1px solid ${s.color}40`, color: s.color }}>
      {s.label}
    </span>
  )
}

function PlanDot({ plan, label }: { plan: string; label?: boolean }) {
  const colors: Record<string, string> = {
    enterprise: '#f59e0b', professional: '#22c55e', freemium: '#64748b', free: '#64748b',
  }
  const color = colors[plan] ?? '#334155'
  if (label) return (
    <span style={{ fontSize: 9, fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}40`, padding: '2px 6px', borderRadius: 4 }}>
      {plan || '—'}
    </span>
  )
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} title={plan} />
}
