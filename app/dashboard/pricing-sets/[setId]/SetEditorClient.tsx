'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { PricingSetDetail, PricingSetStatus, SavePricingSetPayload } from '@/lib/pricing-sets/types'
import type { PackageListItem } from '@/lib/packages/types'
import { savePricingSetAction } from './actions'
import DateTimePicker from '@/components/DateTimePicker'

type Props = {
  set: PricingSetDetail | null
  allPackages: PackageListItem[]
  isNew: boolean
}

type DeployStatus = 'prod' | 'stale' | 'staging' | 'undeployed'

function deployStatus(pkg: PackageListItem): DeployStatus {
  if (pkg.last_push_production) {
    // Stale = staging has a newer deploy than production (actionable gap).
    // Don't use updated_at — it bumps on every save, causing false positives.
    const prodDate = new Date(pkg.last_push_production)
    if (pkg.last_push_staging && new Date(pkg.last_push_staging) > prodDate) return 'stale'
    return 'prod'
  }
  return pkg.last_push_staging ? 'staging' : 'undeployed'
}

const DEPLOY_BADGE: Record<DeployStatus, { label: string; color: string; bg: string; border: string }> = {
  prod:       { label: 'Prod',        color: '#22c55e', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.25)' },
  stale:      { label: 'Stale',       color: '#f59e0b', bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.25)' },
  staging:    { label: 'Staging only',color: '#42a5f5', bg: 'rgba(66,165,245,.08)', border: 'rgba(66,165,245,.2)' },
  undeployed: { label: 'Not deployed',color: '#ef4444', bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.2)' },
}

function DeployBadge({ pkg }: { pkg: PackageListItem }) {
  const d = DEPLOY_BADGE[deployStatus(pkg)]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: d.bg, border: `1px solid ${d.border}`, color: d.color, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {d.label}
    </span>
  )
}

export default function SetEditorClient({ set, allPackages, isNew }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDirty, setIsDirty] = useState(false)
  const markDirty = () => setIsDirty(true)

  const [name,        setName]        = useState(set?.name ?? '')
  const [description, setDescription] = useState(set?.description ?? '')
  const [status,      setStatus]      = useState<PricingSetStatus>(set?.status ?? 'draft')
  const [activeFrom,  setActiveFrom]  = useState<Date>(
    set ? new Date(set.active_from) : new Date()
  )
  const [activeTo,    setActiveTo]    = useState<Date | null>(
    set?.active_to ? new Date(set.active_to) : null
  )

  // Selected packages: ordered list of package_ids
  const initSelected = (set?.packages ?? [])
    .sort((a, b) => a.display_order - b.display_order)
    .map(p => p.package_id)
  const [selectedIds, setSelectedIds] = useState<string[]>(initSelected)

  // Drag-to-reorder for selected packages
  const dragIdx = useRef<number | null>(null)

  function togglePackage(pkgId: string) {
    setSelectedIds(prev =>
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    )
    markDirty()
  }

  function onDragStart(idx: number) { dragIdx.current = idx }
  function onDragEnter(idx: number) {
    if (dragIdx.current === null || dragIdx.current === idx) return
    const from = dragIdx.current
    dragIdx.current = idx
    setSelectedIds(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
    markDirty()
  }
  function onDragEnd() { dragIdx.current = null }

  function buildPayload(): SavePricingSetPayload {
    return {
      id: set?.id ?? null,
      name,
      description: description || null,
      status,
      active_from: activeFrom.toISOString(),
      active_to: activeTo ? activeTo.toISOString() : null,
      packages: selectedIds.map((pid, i) => ({ package_id: pid, display_order: i })),
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePricingSetAction(buildPayload())
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsDirty(false)
        toast.success('Set saved')
        if (isNew) router.push(`/dashboard/pricing-sets/${result.id}`)
      }
    })
  }

  const selectedPackages = selectedIds
    .map(id => allPackages.find(p => p.id === id))
    .filter((p): p is PackageListItem => Boolean(p))

  const STATUS_BADGE: Record<PricingSetStatus, string> = {
    active: 'badge-green', draft: 'badge-grey', archived: 'badge-red',
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/dashboard/pricing-sets" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Website Pricing</a>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? 'New Set' : name}</span>
          <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isDirty && <span style={{ fontSize: 11, color: '#f59e0b' }}>Unsaved changes</span>}
          <button className="btn-p" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Name</div>
            <input value={name} onChange={e => { setName(e.target.value); markDirty() }}
              placeholder="e.g. Spring 2026 Pricing"
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <textarea value={description} onChange={e => { setDescription(e.target.value); markDirty() }}
              rows={2} placeholder="Optional internal note"
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#e2e8f0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
              <select value={status} onChange={e => { setStatus(e.target.value as PricingSetStatus); markDirty() }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: '#0f172a', color: '#e2e8f0', outline: 'none' }}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
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

        {/* Right: package picker */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Packages in This Set</div>

          {/* All available packages — toggle to include */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {allPackages.map(pkg => {
              const included = selectedIds.includes(pkg.id)
              return (
                <div key={pkg.id}
                  onClick={() => togglePackage(pkg.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${included ? 'rgba(66,165,245,.3)' : 'rgba(255,255,255,.06)'}`, background: included ? 'rgba(66,165,245,.06)' : 'rgba(255,255,255,.02)', cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${included ? '#42a5f5' : '#334155'}`, background: included ? '#42a5f5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#0f172a', fontWeight: 900 }}>
                    {included ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{pkg.name}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>€{pkg.price_monthly}/mo · {pkg.slug}</div>
                  </div>
                  <DeployBadge pkg={pkg} />
                </div>
              )
            })}
          </div>

          {/* Ordered list with drag handles */}
          {selectedPackages.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Display Order (drag to reorder)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedPackages.map((pkg, idx) => (
                  <div key={pkg.id}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragEnter={() => onDragEnter(idx)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => e.preventDefault()}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', cursor: 'grab' }}>
                    <span style={{ color: '#334155', fontSize: 13, userSelect: 'none' }}>⠿</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>{idx + 1}. {pkg.name}</span>
                    <DeployBadge pkg={pkg} />
                    <span style={{ fontSize: 10, color: '#475569' }}>€{pkg.price_monthly}/mo</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
