'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { PackageListItem, AccessMode } from '@/lib/packages/types'
import { reorderPackagesAction } from './[packageId]/actions'

const MODE_COLORS: Record<AccessMode, string> = {
  full:      'rgba(34,197,94,.12)',
  trial:     'rgba(245,158,11,.12)',
  paywalled: 'rgba(66,165,245,.12)',
  off:       'rgba(100,116,139,.06)',
}
const MODE_TEXT: Record<AccessMode, string> = {
  full: '#22c55e', trial: '#f59e0b', paywalled: '#42a5f5', off: '#475569',
}

function SyncChip({ label, pushedAt, updatedAt }: { label: string; pushedAt: string | null; updatedAt: string }) {
  if (!pushedAt) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: 'rgba(100,116,139,.08)', color: '#475569', border: '1px solid rgba(100,116,139,.15)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {label}: never
    </span>
  )
  const inSync = new Date(pushedAt) >= new Date(updatedAt)
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: inSync ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)', color: inSync ? '#22c55e' : '#f59e0b', border: `1px solid ${inSync ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.25)'}`, textTransform: 'uppercase', letterSpacing: '.05em' }}>
      ● {label}: {inSync ? 'synced' : 'stale'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { active: 'badge-green', draft: 'badge-grey', archived: 'badge-red' }
  return <span className={`badge ${styles[status] ?? 'badge-grey'}`}>{status}</span>
}

export default function PackagesListClient({ initialPackages }: { initialPackages: PackageListItem[] }) {
  const router = useRouter()
  const [packages, setPackages] = useState(initialPackages)
  const [isPending, startTransition] = useTransition()
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function onDragStart(idx: number, id: string) {
    dragIdx.current = idx
    setDraggingId(id)
  }

  function onDragEnter(idx: number) {
    if (dragIdx.current === null || dragIdx.current === idx) return
    dragOverIdx.current = idx
    const next = [...packages]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(idx, 0, moved)
    dragIdx.current = idx
    setPackages(next)
  }

  function onDragEnd() {
    setDraggingId(null)
    dragIdx.current = null
    dragOverIdx.current = null
    const orderedIds = packages.map(p => p.id)
    startTransition(async () => {
      const result = await reorderPackagesAction(orderedIds)
      if (result.error) {
        toast.error('Failed to save order')
        router.refresh()
      } else {
        toast.success('Display order saved')
      }
    })
  }

  const active   = packages.filter(p => p.status !== 'archived')
  const archived = packages.filter(p => p.status === 'archived')
  const archivedWithTenants = archived.filter(p => p.tenant_count > 0)

  return (
    <>
      {archivedWithTenants.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: '#fca5a5' }}>
          ⚠ {archivedWithTenants.map(p => <span key={p.id}><strong>{p.name}</strong> is archived but has <strong>{p.tenant_count} tenants</strong> still assigned. </span>)}
        </div>
      )}

      <div style={{ fontSize: 10, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⠿</span> Drag cards to set the display order on the pricing page
        {isPending && <span style={{ color: '#f59e0b' }}>Saving…</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {active.map((pkg, idx) => (
          <div
            key={pkg.id}
            draggable
            onDragStart={() => onDragStart(idx, pkg.id)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${pkg.status === 'archived' ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.08)'}`,
              borderRadius: 12,
              padding: 18,
              opacity: draggingId === pkg.id ? 0.4 : pkg.status === 'archived' ? 0.55 : 1,
              borderStyle: pkg.status === 'draft' ? 'dashed' : 'solid',
              cursor: 'grab',
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#334155', fontSize: 13 }}>⠿</span>
                  {pkg.name}
                </div>
                <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>{pkg.slug}</div>
              </div>
              <StatusBadge status={pkg.status} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>
              {pkg.is_poa ? 'POA' : pkg.price_monthly === 0 ? 'Free' : `€${pkg.price_monthly}`}
              {!pkg.is_poa && <span style={{ fontSize: 11, fontWeight: 400, color: '#475569' }}> / mo</span>}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
              <strong>{pkg.tenant_count}</strong> tenants
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
              {pkg.modules.map(m => (
                <span key={m.module_slug} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: MODE_COLORS[m.access_mode], color: MODE_TEXT[m.access_mode], textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {m.module_slug}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <SyncChip label="Staging" pushedAt={pkg.last_push_staging} updatedAt={pkg.updated_at} />
                <SyncChip label="Prod"    pushedAt={pkg.last_push_production} updatedAt={pkg.updated_at} />
              </div>
              <Link
                href={`/dashboard/packages/${pkg.id}`}
                style={{ fontSize: 11, color: '#42a5f5', textDecoration: 'none', fontWeight: 600 }}
                onClick={e => e.stopPropagation()}
              >
                Edit →
              </Link>
            </div>
          </div>
        ))}

        <Link href="/dashboard/packages/new" style={{ textDecoration: 'none', border: '1px dashed rgba(66,165,245,.2)', background: 'rgba(66,165,245,.02)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 9, color: '#42a5f5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(66,165,245,.1)', border: '1px solid rgba(66,165,245,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</div>
          New Package
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>Scratch or duplicate existing</div>
        </Link>
      </div>

      {archived.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Archived</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {archived.map(pkg => (
              <div key={pkg.id} style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: 18, opacity: 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{pkg.name}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>{pkg.slug}</div>
                  </div>
                  <StatusBadge status={pkg.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 12 }}>
                  <SyncChip label="Staging" pushedAt={pkg.last_push_staging} updatedAt={pkg.updated_at} />
                  <Link href={`/dashboard/packages/${pkg.id}`} style={{ fontSize: 11, color: '#42a5f5', textDecoration: 'none', fontWeight: 600 }}>Edit →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
