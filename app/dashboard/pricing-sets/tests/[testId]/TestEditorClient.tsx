'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AbTestWithSets, AbTestStatus, SaveAbTestPayload, PricingSetListItem } from '@/lib/pricing-sets/types'
import { saveAbTestAction, endAbTestAction } from './actions'

type Props = {
  test: AbTestWithSets | null
  allSets: PricingSetListItem[]
  isNew: boolean
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDatetimeValue(v: string): string {
  const [date, time] = v.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}

export default function TestEditorClient({ test, allSets, isNew }: Props) {
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
  const [activeFrom, setActiveFrom] = useState(
    test ? toLocalDatetimeValue(test.active_from) : toLocalDatetimeValue(new Date().toISOString())
  )
  const [activeTo,   setActiveTo]   = useState(
    test?.active_to ? toLocalDatetimeValue(test.active_to) : ''
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
      active_from: fromLocalDatetimeValue(activeFrom),
      active_to: activeTo ? fromLocalDatetimeValue(activeTo) : null,
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
          <a href="/dashboard/pricing-sets" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Pricing Sets</a>
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
              <input type="datetime-local" value={activeFrom} onChange={e => { setActiveFrom(e.target.value); markDirty() }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: '#0f172a', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Active To <span style={{ color: '#334155', fontWeight: 400 }}>(blank = ∞)</span></div>
              <input type="datetime-local" value={activeTo} onChange={e => { setActiveTo(e.target.value); markDirty() }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: '#0f172a', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
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
    </div>
  )
}
