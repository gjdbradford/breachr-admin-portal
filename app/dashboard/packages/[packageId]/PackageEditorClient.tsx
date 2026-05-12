// admin/app/dashboard/packages/[packageId]/PackageEditorClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  PackageDetail, PackageListItem, SavePackagePayload,
  ModuleSlug, AccessMode, PackageStatus, EnvName,
} from '@/lib/packages/types'
import type { Permission } from '@/lib/permissions'
import { savePackageAction, pushToEnvAction } from './actions'
import BasicsTab     from './tabs/BasicsTab'
import ModulesTab    from './tabs/ModulesTab'
import RoleCeilingsTab from './tabs/RoleCeilingsTab'
import TenantsTab    from './tabs/TenantsTab'
import AnalyticsTab  from './tabs/AnalyticsTab'

type Props = {
  pkg: PackageDetail | null
  allPackages: PackageListItem[]
  allPermissions: readonly Permission[]
  permissionGroups: { label: string; permissions: { key: Permission; label: string }[] }[]
  moduleSlugList: ModuleSlug[]
  isNew: boolean
}

export default function PackageEditorClient({ pkg, allPackages, allPermissions, permissionGroups, moduleSlugList, isNew }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Basics state
  const [name,            setName]            = useState(pkg?.name ?? '')
  const [slug,            setSlug]            = useState(pkg?.slug ?? '')
  const [description,     setDescription]     = useState(pkg?.description ?? '')
  const [priceMonthly,    setPriceMonthly]    = useState(pkg?.price_monthly ?? 0)
  const [priceAnnual,     setPriceAnnual]     = useState<number | null>(pkg?.price_annual ?? null)
  const [scansLimit,      setScansLimit]      = useState<number | null>(pkg?.scans_limit ?? null)
  const [tokensLimit,     setTokensLimit]     = useState<number | null>(pkg?.tokens_limit ?? null)
  const [targetsLimit,    setTargetsLimit]    = useState<number | null>(pkg?.targets_limit ?? null)
  const [scanTypes,       setScanTypes]       = useState<string[]>(pkg?.scan_types ?? [])
  const [stripeProductId, setStripeProductId] = useState(pkg?.stripe_product_id ?? '')
  const [status,          setStatus]          = useState<PackageStatus>(pkg?.status ?? 'draft')

  // Modules state
  const defaultModes: Record<ModuleSlug, { mode: AccessMode; trialDays: number | null }> = {} as any
  for (const s of moduleSlugList) {
    const existing = pkg?.modules.find(m => m.module_slug === s)
    defaultModes[s] = { mode: existing?.access_mode ?? 'off', trialDays: existing?.trial_days ?? null }
  }
  const [moduleModes, setModuleModes] = useState(defaultModes)

  function setModuleMode(s: ModuleSlug, mode: AccessMode) {
    setModuleModes(prev => ({ ...prev, [s]: { ...prev[s], mode } }))
  }
  function setModuleTrialDays(s: ModuleSlug, days: number | null) {
    setModuleModes(prev => ({ ...prev, [s]: { ...prev[s], trialDays: days } }))
  }

  // Role ceilings state
  const initCeilings: Record<string, boolean> = {}
  if (pkg?.ceilings) {
    for (const c of pkg.ceilings) {
      initCeilings[`${c.role}:${c.permission}`] = c.enabled
    }
  }
  const [ceilings, setCeilingsState] = useState(initCeilings)

  function setCeiling(role: 'admin' | 'member', permission: string, enabled: boolean) {
    setCeilingsState(prev => ({ ...prev, [`${role}:${permission}`]: enabled }))
  }

  function buildPayload(): SavePackagePayload {
    return {
      id: pkg?.id ?? null,
      name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || null,
      price_monthly: priceMonthly,
      price_annual: priceAnnual,
      scans_limit: scansLimit,
      tokens_limit: tokensLimit,
      targets_limit: targetsLimit,
      scan_types: scanTypes,
      stripe_product_id: stripeProductId || null,
      status,
      modules: moduleSlugList.map(s => ({
        module_slug: s,
        access_mode: moduleModes[s].mode,
        trial_days:  moduleModes[s].trialDays,
      })),
      ceilings: allPermissions.flatMap(perm =>
        (['admin', 'member'] as const).map(role => ({
          role, permission: perm,
          enabled: ceilings[`${role}:${perm}`] ?? (role === 'admin'),
        }))
      ),
    }
  }

  function handleSave() {
    setSaveError(null)
    setSaveSuccess(false)
    startTransition(async () => {
      const result = await savePackageAction(buildPayload())
      if (result.error) {
        setSaveError(result.error)
      } else {
        setSaveSuccess(true)
        if (isNew) router.push(`/dashboard/packages/${result.id}`)
      }
    })
  }

  const STATUS_BADGE: Record<PackageStatus, string> = {
    active: 'badge-green', draft: 'badge-grey', archived: 'badge-red',
  }

  const TABS = ['Basics', 'Modules', 'Role Ceilings', `Tenants (${pkg?.tenant_count ?? 0})`, 'Analytics']

  return (
    <div>
      {/* Topbar */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/dashboard/packages" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Packages</a>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? 'New Package' : name}</span>
          <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveError && <span style={{ fontSize: 11, color: '#ef4444' }}>{saveError}</span>}
          {saveSuccess && <span style={{ fontSize: 11, color: '#22c55e' }}>Saved</span>}
          <button className="btn-s" onClick={() => router.push('/dashboard/packages')}>Discard</button>
          <button className="btn-p" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: 22 }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{ padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === i ? '#42a5f5' : 'transparent'}`, color: activeTab === i ? '#42a5f5' : '#64748b', marginBottom: -1, whiteSpace: 'nowrap' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <BasicsTab
          name={name} setName={setName}
          slug={slug} setSlug={setSlug}
          description={description} setDescription={setDescription}
          priceMonthly={priceMonthly} setPriceMonthly={setPriceMonthly}
          priceAnnual={priceAnnual} setPriceAnnual={setPriceAnnual}
          scansLimit={scansLimit} setScansLimit={setScansLimit}
          tokensLimit={tokensLimit} setTokensLimit={setTokensLimit}
          targetsLimit={targetsLimit} setTargetsLimit={setTargetsLimit}
          scanTypes={scanTypes} setScanTypes={setScanTypes}
          stripeProductId={stripeProductId} setStripeProductId={setStripeProductId}
          status={status} setStatus={setStatus}
        />
      </div>
      <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <ModulesTab
          moduleSlugList={moduleSlugList}
          moduleModes={moduleModes}
          setModuleMode={setModuleMode}
          setModuleTrialDays={setModuleTrialDays}
          packageId={pkg?.id ?? null}
          pushLog={pkg?.push_log ?? []}
          updatedAt={pkg?.updated_at ?? ''}
        />
      </div>
      <div style={{ display: activeTab === 2 ? 'block' : 'none' }}>
        <RoleCeilingsTab
          permissionGroups={permissionGroups}
          moduleModes={moduleModes}
          ceilings={ceilings}
          setCeiling={setCeiling}
        />
      </div>
      <div style={{ display: activeTab === 3 ? 'block' : 'none' }}>
        <TenantsTab
          packageId={pkg?.id ?? null}
          allPackages={allPackages}
        />
      </div>
      <div style={{ display: activeTab === 4 ? 'block' : 'none' }}>
        <AnalyticsTab packageId={pkg?.id ?? null} />
      </div>
    </div>
  )
}
