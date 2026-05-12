'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AbTestWithSets, AbTestStatus, SaveAbTestPayload, PricingSetListItem, AbTestAnalytics } from '@/lib/pricing-sets/types'
import { saveAbTestAction, endAbTestAction } from './actions'
import DateTimePicker from '@/components/DateTimePicker'

type Props = {
  test: AbTestWithSets | null
  allSets: PricingSetListItem[]
  isNew: boolean
  analytics: AbTestAnalytics | null
}

export default function TestEditorClient({ test, allSets, isNew, analytics }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEnding, setIsEnding] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const markDirty = () => setIsDirty(true)

  const [name,       setName]       = useState(test?.name ?? '')
  const [setAId,     setSetAId]     = useState(test?.set_a_id ?? '')
  const [setBId,     setSetBId]     = useState(test?.set_b_id ?? '')
  const [split,      setSplit]      = useState(test?.traffic_split_a ?? 50)
  const [status,     setStatus]     = useState<AbTestStatus>(test?.status ?? 'draft')
  const [activeFrom, setActiveFrom] = useState<Date>(
    test ? new Date(test.active_from) : new Date()
  )
  const [activeTo,   setActiveTo]   = useState<Date | null>(
    test?.active_to ? new Date(test.active_to) : null
  )

  const setAOptions = allSets.filter(s => s.id !== setBId && s.status !== 'archived')
  const setBOptions = allSets.filter(s => s.id !== setAId && s.status !== 'archived')

  const setAPackageCount = allSets.find(s => s.id === setAId)?.package_count ?? 0
  const setBPackageCount = allSets.find(s => s.id === setBId)?.package_count ?? 0
  const canActivate = setAPackageCount > 0 && setBPackageCount > 0

  function buildPayload(): SaveAbTestPayload {
    return {
      id: test?.id ?? null,
      name,
      set_a_id: setAId,
      set_b_id: setBId,
      traffic_split_a: split,
      status,
      active_from: activeFrom.toISOString(),
      active_to: activeTo ? activeTo.toISOString() : null,
    }
  }

  function handleSave() {
    if (!name || !setAId || !setBId) { toast.error('Name, Set A and Set B are required'); return }
    startTransition(async () => {
      const result = await saveAbTestAction(buildPayload())
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsDirty(false)
        toast.success('Test saved')
        if (isNew) router.push(`/dashboard/pricing-sets/tests/${result.id}`)
      }
    })
  }

  async function handleEndTest() {
    if (!test) return
    setIsEnding(true)
    const result = await endAbTestAction(test.id)
    setIsEnding(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Test ended'); setStatus('ended') }
  }

  const STATUS_BADGE: Record<AbTestStatus, string> = {
    active: 'badge-green', draft: 'badge-grey', ended: 'badge-red',
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/dashboard/pricing-sets" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Website Pricing</a>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? 'New A/B Test' : name}</span>
          <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isDirty && <span style={{ fontSize: 11, color: '#f59e0b' }}>Unsaved changes</span>}
          {!isNew && test?.status !== 'ended' && (
            <button onClick={handleEndTest} disabled={isEnding} className="btn-s"
              style={{ fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}>
              {isEnding ? 'Ending…' : '✕ End Test'}
            </button>
          )}
          <button className="btn-p" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Test Name</div>
            <input value={name} onChange={e => { setName(e.target.value); markDirty() }}
              placeholder="e.g. Spring 2026 Pricing Test"
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Set A</div>
              <select value={setAId} onChange={e => { setSetAId(e.target.value); markDirty() }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: '#0f172a', color: '#e2e8f0', outline: 'none' }}>
                <option value="">— select set —</option>
                {setAOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {setAId && setAPackageCount === 0 && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>⚠ Set A has no packages</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Set B</div>
              <select value={setBId} onChange={e => { setSetBId(e.target.value); markDirty() }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: '#0f172a', color: '#e2e8f0', outline: 'none' }}>
                <option value="">— select set —</option>
                {setBOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {setBId && setBPackageCount === 0 && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>⚠ Set B has no packages</div>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Traffic Split — {split}% Set A · {100 - split}% Set B
            </div>
            <input type="range" min={0} max={100} value={split}
              onChange={e => { setSplit(Number(e.target.value)); markDirty() }}
              style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
              <select value={status} onChange={e => { setStatus(e.target.value as AbTestStatus); markDirty() }}
                disabled={!canActivate && status !== 'active'}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: '#0f172a', color: '#e2e8f0', outline: 'none' }}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
              {!canActivate && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>Both sets must have packages to activate</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Active From</div>
              <DateTimePicker value={activeFrom} onChange={d => { if (d) { setActiveFrom(d); markDirty() } }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Active To <span style={{ color: '#334155', fontWeight: 400 }}>(blank = ∞)</span></div>
              <DateTimePicker value={activeTo} onChange={d => { setActiveTo(d); markDirty() }} placeholder="No end date (∞)" />
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Test Summary</div>
          <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: 16, fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
            <div><strong style={{ color: '#94a3b8' }}>Set A:</strong> {allSets.find(s => s.id === setAId)?.name ?? '—'} ({setAPackageCount} packages)</div>
            <div><strong style={{ color: '#94a3b8' }}>Set B:</strong> {allSets.find(s => s.id === setBId)?.name ?? '—'} ({setBPackageCount} packages)</div>
            <div><strong style={{ color: '#94a3b8' }}>Split:</strong> {split}% see Set A · {100 - split}% see Set B</div>
            <div><strong style={{ color: '#94a3b8' }}>Variant assignment:</strong> Deterministic per visitor (hash of session cookie)</div>
          </div>
        </div>
      </div>

      {/* Analytics panel */}
      {analytics && !isNew && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Analytics
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 10, color: '#334155' }}>{analytics.total_events.toLocaleString()} total events</span>
              <button
                onClick={() => router.refresh()}
                style={{ fontSize: 10, color: '#42a5f5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {analytics.total_events === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, fontSize: 12, color: '#475569' }}>
              No events recorded yet. Visit <code style={{ color: '#94a3b8' }}>localhost:3000/pricing</code> to generate data.
            </div>
          ) : (
            <>
              {/* Stat comparison grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {(['a', 'b'] as const).map(v => {
                  const s = analytics[v]
                  const other = analytics[v === 'a' ? 'b' : 'a']
                  const setName = v === 'a'
                    ? (allSets.find(s => s.id === test?.set_a_id)?.name ?? 'Set A')
                    : (allSets.find(s => s.id === test?.set_b_id)?.name ?? 'Set B')
                  const variantColor = v === 'a' ? '#42a5f5' : '#a78bfa'
                  const ctrWinner = s.ctr > other.ctr
                  const cvrWinner = s.cvr > other.cvr

                  return (
                    <div key={v} style={{ background: 'rgba(255,255,255,.02)', border: `1px solid ${variantColor}22`, borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: variantColor, background: `${variantColor}18`, border: `1px solid ${variantColor}33`, borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase' }}>
                          Set {v.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{setName}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <Stat label="Views" value={s.views} color={variantColor} />
                        <Stat label="CTA Clicks" value={s.clicks} color={variantColor} />
                        <Stat label="Leads" value={s.leads} color={variantColor} />
                      </div>

                      <RateBar label="Click-through rate" rate={s.ctr} isWinner={ctrWinner} color={variantColor} />
                      <RateBar label="Conversion rate" rate={s.cvr} isWinner={cvrWinner} color={variantColor} />

                      {s.topPackages.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Top package clicks</div>
                          {s.topPackages.map(p => (
                            <div key={p.slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                              <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{p.slug}</span>
                              <span style={{ fontWeight: 700, color: variantColor }}>{p.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Head-to-head summary */}
              <HeadToHead analytics={analytics} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,.02)', borderRadius: 8 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: '#475569', marginTop: 4, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function RateBar({ label, rate, isWinner, color }: { label: string; rate: number; isWinner: boolean; color: string }) {
  const pct = Math.round(rate * 100)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: isWinner ? '#22c55e' : '#475569' }}>
          {pct}%{isWinner ? ' ↑' : ''}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: isWinner ? '#22c55e' : color, borderRadius: 2, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

function HeadToHead({ analytics }: { analytics: AbTestAnalytics }) {
  const { a, b } = analytics
  const totalViews = a.views + b.views
  const ctrDiff = ((a.ctr - b.ctr) * 100).toFixed(1)
  const cvrDiff = ((a.cvr - b.cvr) * 100).toFixed(1)
  const aWinsCtr = a.ctr > b.ctr
  const aWinsCvr = a.cvr > b.cvr

  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 11, color: '#64748b' }}>
      <span><strong style={{ color: '#94a3b8' }}>Total visitors:</strong> {totalViews.toLocaleString()}</span>
      <span>
        <strong style={{ color: '#94a3b8' }}>CTR:</strong>{' '}
        <span style={{ color: aWinsCtr ? '#42a5f5' : '#a78bfa', fontWeight: 700 }}>
          {aWinsCtr ? 'A' : 'B'} leads by {Math.abs(Number(ctrDiff))}pp
        </span>
      </span>
      <span>
        <strong style={{ color: '#94a3b8' }}>Conversion:</strong>{' '}
        <span style={{ color: aWinsCvr ? '#42a5f5' : '#a78bfa', fontWeight: 700 }}>
          {aWinsCvr ? 'A' : 'B'} leads by {Math.abs(Number(cvrDiff))}pp
        </span>
      </span>
      <span><strong style={{ color: '#94a3b8' }}>Total leads:</strong> {(a.leads + b.leads).toLocaleString()}</span>
    </div>
  )
}
