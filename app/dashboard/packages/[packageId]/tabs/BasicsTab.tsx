// admin/app/dashboard/packages/[packageId]/tabs/BasicsTab.tsx
'use client'

import type { PackageStatus } from '@/lib/packages/types'

type Props = {
  name: string;            setName: (v: string) => void
  slug: string;            setSlug: (v: string) => void
  description: string;     setDescription: (v: string) => void
  priceMonthly: number;    setPriceMonthly: (v: number) => void
  priceAnnual: number | null; setPriceAnnual: (v: number | null) => void
  scansLimit: number | null;  setScansLimit: (v: number | null) => void
  tokensLimit: number | null; setTokensLimit: (v: number | null) => void
  targetsLimit: number | null; setTargetsLimit: (v: number | null) => void
  scanTypes: string;       setScanTypes: (v: string) => void
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
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
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
        <Field label="Stripe Product ID">
          <input value={props.stripeProductId} onChange={e => props.setStripeProductId(e.target.value)} placeholder="prod_…" style={{ color: '#a78bfa' }} />
        </Field>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Pricing</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
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
        <Field label="Scan Types" hint="comma-separated, e.g. full, api">
          <input value={props.scanTypes} onChange={e => props.setScanTypes(e.target.value)} />
        </Field>
      </div>
    </div>
  )
}
