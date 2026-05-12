// admin/app/dashboard/packages/[packageId]/tabs/FeaturesTab.tsx
'use client'

import { useRef } from 'react'
import type { PackageFeatureItem, PackageBadge, FeatureItemKind } from '@/lib/packages/types'

type Props = {
  features: PackageFeatureItem[]
  setFeatures: (items: PackageFeatureItem[]) => void
  badge: PackageBadge | null
  setBadge: (b: PackageBadge | null) => void
  ctaLabel: string
  setCtaLabel: (v: string) => void
}

const KIND_LABELS: Record<FeatureItemKind, string> = {
  item: 'Item',
  section: 'Section header',
  highlight: 'Highlight',
}

const KIND_COLOR: Record<FeatureItemKind, string> = {
  item: '#64748b',
  section: '#f59e0b',
  highlight: '#42a5f5',
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function FeaturesTab({ features, setFeatures, badge, setBadge, ctaLabel, setCtaLabel }: Props) {
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  function addItem(kind: FeatureItemKind) {
    setFeatures([...features, { id: genId(), text: '', kind }])
  }

  function updateItem(id: string, patch: Partial<PackageFeatureItem>) {
    setFeatures(features.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function removeItem(id: string) {
    setFeatures(features.filter(f => f.id !== id))
  }

  function onDragStart(idx: number) {
    dragIdx.current = idx
  }

  function onDragEnter(idx: number) {
    dragOverIdx.current = idx
  }

  function onDragEnd() {
    if (dragIdx.current === null || dragOverIdx.current === null || dragIdx.current === dragOverIdx.current) {
      dragIdx.current = null
      dragOverIdx.current = null
      return
    }
    const next = [...features]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOverIdx.current, 0, moved)
    setFeatures(next)
    dragIdx.current = null
    dragOverIdx.current = null
  }

  const BADGE_OPTIONS: { value: PackageBadge; label: string }[] = [
    { value: 'best_value', label: 'Best Value' },
    { value: 'most_popular', label: 'Most Popular' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Badge + CTA row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Package Badge</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {BADGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBadge(badge === opt.value ? null : opt.value)}
                style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: '1px solid',
                  background: badge === opt.value ? (opt.value === 'best_value' ? 'rgba(245,158,11,.15)' : 'rgba(66,165,245,.15)') : 'rgba(255,255,255,.04)',
                  borderColor: badge === opt.value ? (opt.value === 'best_value' ? '#f59e0b' : '#42a5f5') : 'rgba(255,255,255,.1)',
                  color: badge === opt.value ? (opt.value === 'best_value' ? '#f59e0b' : '#42a5f5') : '#64748b',
                }}
              >
                {opt.label}
              </button>
            ))}
            {badge && (
              <button
                onClick={() => setBadge(null)}
                style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: '#ef4444' }}
              >
                ✕ Remove
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>CTA Button Label</div>
          <input
            value={ctaLabel}
            onChange={e => setCtaLabel(e.target.value)}
            placeholder="e.g. Start Now"
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Features list */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Features Included</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {features.length === 0 && (
            <div style={{ fontSize: 12, color: '#475569', padding: '12px 0', textAlign: 'center' }}>No features yet. Add items below.</div>
          )}
          {features.map((item, idx) => {
            const overLimit = item.text.length > 30
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e => e.preventDefault()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,.03)', border: `1px solid ${overLimit ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.06)'}`, cursor: 'grab' }}
              >
                <span style={{ color: '#334155', fontSize: 14, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</span>

                <select
                  value={item.kind}
                  onChange={e => updateItem(item.id, { kind: e.target.value as FeatureItemKind })}
                  style={{ flexShrink: 0, width: 112, fontSize: 10, fontWeight: 700, padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.08)', background: '#0f172a', color: KIND_COLOR[item.kind], cursor: 'pointer', outline: 'none' }}
                >
                  {(Object.keys(KIND_LABELS) as FeatureItemKind[]).map(k => (
                    <option key={k} value={k}>{KIND_LABELS[k]}</option>
                  ))}
                </select>

                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    value={item.text}
                    onChange={e => updateItem(item.id, { text: e.target.value.slice(0, 30) })}
                    placeholder={item.kind === 'section' ? 'Section heading…' : item.kind === 'highlight' ? 'Highlighted feature…' : 'Feature description…'}
                    maxLength={30}
                    style={{ width: '100%', padding: '5px 44px 5px 8px', fontSize: 12, borderRadius: 5, border: `1px solid ${overLimit ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.08)'}`, background: 'rgba(255,255,255,.04)', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ position: 'absolute', right: 8, fontSize: 9, fontWeight: 600, color: overLimit ? '#ef4444' : item.text.length >= 24 ? '#f59e0b' : '#334155', pointerEvents: 'none' }}>
                    {item.text.length}/30
                  </span>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  style={{ flexShrink: 0, padding: '3px 7px', fontSize: 11, borderRadius: 4, border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.08)', color: '#ef4444', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => addItem('item')} className="btn-s" style={{ fontSize: 11, padding: '5px 12px' }}>+ Add Item</button>
          <button onClick={() => addItem('section')} className="btn-s" style={{ fontSize: 11, padding: '5px 12px', color: '#f59e0b', borderColor: 'rgba(245,158,11,.3)' }}>+ Section Header</button>
          <button onClick={() => addItem('highlight')} className="btn-s" style={{ fontSize: 11, padding: '5px 12px', color: '#42a5f5', borderColor: 'rgba(66,165,245,.3)' }}>+ Highlight</button>
        </div>
      </div>
    </div>
  )
}
