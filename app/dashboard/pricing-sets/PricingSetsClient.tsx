'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import type { PricingSetListItem, AbTestWithSets, PricingSetStatus } from '@/lib/pricing-sets/types'
import { clonePricingSetAction, setPricingSetStatusAction } from './actions'

function fmtWindow(from: string, to: string | null): string {
  const f = new Date(from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const t = to ? new Date(to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '∞ Forever'
  return `${f} → ${t}`
}

const STATUS_COLOR: Record<string, string> = {
  active: 'badge-green', draft: 'badge-grey', archived: 'badge-red', ended: 'badge-red',
}

function SetMenu({ set }: { set: PricingSetListItem }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function stopAndRun(e: React.MouseEvent, fn: () => void) {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }

  function handleClone(e: React.MouseEvent) {
    stopAndRun(e, () => {
      setOpen(false)
      startTransition(async () => {
        const res = await clonePricingSetAction(set.id)
        if (res.error) { toast.error(res.error); return }
        toast.success('Set cloned — opening…')
        router.push(`/dashboard/pricing-sets/${res.newId}`)
      })
    })
  }

  function handleStatus(e: React.MouseEvent, status: PricingSetStatus) {
    stopAndRun(e, () => {
      setOpen(false)
      startTransition(async () => {
        const res = await setPricingSetStatusAction(set.id, status)
        if (res.error) { toast.error(res.error); return }
        toast.success(`Set ${status === 'draft' ? 'paused' : status}`)
        router.refresh()
      })
    })
  }

  const menuItems: { label: string; color?: string; onClick: (e: React.MouseEvent) => void }[] = [
    { label: 'Clone', onClick: handleClone },
  ]
  if (set.status === 'active')   menuItems.push({ label: 'Pause (→ Draft)', onClick: e => handleStatus(e, 'draft') })
  if (set.status === 'draft')    menuItems.push({ label: 'Activate', onClick: e => handleStatus(e, 'active') })
  if (set.status !== 'archived') menuItems.push({ label: 'Archive', color: '#ef4444', onClick: e => handleStatus(e, 'archived') })
  if (set.status === 'archived') menuItems.push({ label: 'Restore to Draft', onClick: e => handleStatus(e, 'draft') })

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        disabled={isPending}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 16, padding: '2px 6px', borderRadius: 4, lineHeight: 1 }}
        title="Options"
      >
        {isPending ? '…' : '⋮'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.5)', overflow: 'hidden' }}>
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{ display: 'block', width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 600, color: item.color ?? '#e2e8f0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PricingSetsClient({
  sets, tests,
}: { sets: PricingSetListItem[]; tests: AbTestWithSets[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Sets */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing Sets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {sets.map(s => (
            <Link key={s.id} href={`/dashboard/pricing-sets/${s.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: `1px solid ${s.is_live ? 'rgba(34,197,94,.25)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, padding: 18, cursor: 'pointer', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {s.is_live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block', flexShrink: 0 }} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={`badge ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                    <SetMenu set={s} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>{fmtWindow(s.active_from, s.active_to)}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{s.package_count} package{s.package_count !== 1 ? 's' : ''}</div>
              </div>
            </Link>
          ))}
          <Link href="/dashboard/pricing-sets/new" style={{ textDecoration: 'none', border: '1px dashed rgba(66,165,245,.2)', background: 'rgba(66,165,245,.02)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 110, gap: 8, color: '#42a5f5', fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(66,165,245,.1)', border: '1px solid rgba(66,165,245,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>+</div>
            New Set
          </Link>
        </div>
      </div>

      {/* A/B Tests */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase' }}>A/B Tests</div>
          <Link href="/dashboard/pricing-sets/tests/new" className="btn-s" style={{ fontSize: 11, padding: '4px 12px' }}>+ New Test</Link>
        </div>
        {tests.length === 0 && (
          <div style={{ fontSize: 12, color: '#475569', padding: '14px 0' }}>No A/B tests yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tests.map(t => (
            <Link key={t.id} href={`/dashboard/pricing-sets/tests/${t.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: `1px solid ${t.is_live ? 'rgba(66,165,245,.25)' : 'rgba(255,255,255,.06)'}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {t.is_live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#42a5f5', boxShadow: '0 0 6px #42a5f5', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {t.set_a.name} ({t.traffic_split_a}%) vs {t.set_b.name} ({100 - t.traffic_split_a}%) · {fmtWindow(t.active_from, t.active_to)}
                  </div>
                </div>
                <span className={`badge ${STATUS_COLOR[t.status]}`}>{t.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
