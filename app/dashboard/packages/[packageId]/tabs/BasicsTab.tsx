// admin/app/dashboard/packages/[packageId]/tabs/BasicsTab.tsx
'use client'

import { useState, useEffect } from 'react'
import type { PackageStatus } from '@/lib/packages/types'

const SCAN_TYPE_OPTIONS = ['full', 'api', 'light', 'network', 'web']

type Props = {
  name: string;            setName: (v: string) => void
  slug: string;            setSlug: (v: string) => void
  description: string;     setDescription: (v: string) => void
  isPoa: boolean;          setIsPoa: (v: boolean) => void
  priceMonthly: number;    setPriceMonthly: (v: number) => void
  priceAnnual: number | null; setPriceAnnual: (v: number | null) => void
  scansLimit: number | null;  setScansLimit: (v: number | null) => void
  tokensLimit: number | null; setTokensLimit: (v: number | null) => void
  targetsLimit: number | null; setTargetsLimit: (v: number | null) => void
  scanTypes: string[];      setScanTypes: (v: string[]) => void
  stripeProductId: string; setStripeProductId: (v: string) => void
  status: PackageStatus;   setStatus: (v: PackageStatus) => void
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#475569' }}>{hint}</div>}
    </div>
  )
}

function NumInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [display, setDisplay] = useState(value == null ? '' : String(value))

  useEffect(() => {
    setDisplay(value == null ? '' : String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        setDisplay(raw)
        onChange(raw === '' ? null : Number(raw))
      }}
    />
  )
}

function ScanTypeSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (type: string) => {
    onChange(value.includes(type) ? value.filter(t => t !== type) : [...value, type])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {SCAN_TYPE_OPTIONS.map(type => {
        const active = value.includes(type)
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
              background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: active ? '#60a5fa' : '#64748b',
            }}
          >
            {type}
          </button>
        )
      })}
    </div>
  )
}

export default function BasicsTab(props: Props) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Package Info</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        <Field label="Name">
          <input value={props.name} onChange={e => { props.setName(e.target.value); if (!props.slug) props.setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')) }} />
        </Field>
        <Field label="Slug" hint="Used in code + Stripe">
          <input value={props.slug} onChange={e => props.setSlug(e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={props.status} onChange={e => props.setStatus(e.target.value as PackageStatus)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Description">
          <input value={props.description} onChange={e => props.setDescription(e.target.value)} placeholder="e.g. Best for growing security teams" />
        </Field>
        <Field label="Stripe Product ID" hint={props.isPoa ? 'Not applicable for POA plans' : undefined}>
          <input value={props.isPoa ? '' : props.stripeProductId} onChange={e => props.setStripeProductId(e.target.value)} placeholder={props.isPoa ? 'N/A — POA plan' : 'prod_…'} disabled={props.isPoa} style={{ color: props.isPoa ? '#334155' : '#a78bfa', opacity: props.isPoa ? 0.4 : 1 }} />
        </Field>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Pricing</div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={props.isPoa}
            onChange={e => props.setIsPoa(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: '#a78bfa', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: props.isPoa ? '#a78bfa' : '#64748b' }}>
            Price on Application (POA) — no Stripe checkout, CTA routes to sales
          </span>
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24, opacity: props.isPoa ? 0.35 : 1, pointerEvents: props.isPoa ? 'none' : 'auto' }}>
        <Field label="Price / Month (€)">
          <NumInput value={props.priceMonthly} onChange={v => props.setPriceMonthly(v ?? 0)} />
        </Field>
        <Field label="Price / Year (€)" hint="Leave blank for monthly-only">
          <NumInput value={props.priceAnnual} onChange={props.setPriceAnnual} />
        </Field>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Usage Limits</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <Field label="Scans / Month" hint="null = unlimited">
          <NumInput value={props.scansLimit} onChange={props.setScansLimit} />
        </Field>
        <Field label="Targets Max">
          <NumInput value={props.targetsLimit} onChange={props.setTargetsLimit} />
        </Field>
        <Field label="Tokens / Month">
          <NumInput value={props.tokensLimit} onChange={props.setTokensLimit} />
        </Field>
        <Field label="Scan Types">
          <ScanTypeSelect value={props.scanTypes} onChange={props.setScanTypes} />
        </Field>
      </div>
    </div>
  )
}
