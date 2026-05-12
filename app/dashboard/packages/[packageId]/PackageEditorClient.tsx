// admin/app/dashboard/packages/[packageId]/PackageEditorClient.tsx
'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type {
  PackageDetail, PackageListItem, SavePackagePayload,
  ModuleSlug, AccessMode, PackageStatus, EnvName,
} from '@/lib/packages/types'
import type { Permission } from '@/lib/permissions'
import { savePackageAction, saveAndDeployAction } from './actions'
import BasicsTab      from './tabs/BasicsTab'
import ModulesTab     from './tabs/ModulesTab'
import RoleCeilingsTab from './tabs/RoleCeilingsTab'
import TenantsTab     from './tabs/TenantsTab'
import AnalyticsTab   from './tabs/AnalyticsTab'
import DeploymentTab  from './tabs/DeploymentTab'

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

  // Dirty / unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false)
  const [pendingNav, setPendingNav] = useState<string | null>(null)
  const [isNavSaving, setIsNavSaving] = useState(false)
  const markDirty = () => setIsDirty(true)

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
    markDirty()
  }
  function setModuleTrialDays(s: ModuleSlug, days: number | null) {
    setModuleModes(prev => ({ ...prev, [s]: { ...prev[s], trialDays: days } }))
    markDirty()
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
    markDirty()
  }

  // ── Unsaved changes guards ─────────────────────────────────────────────

  // Browser close / hard refresh
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // In-app navigation — intercept all internal anchor clicks
  const isDirtyRef = useRef(isDirty)
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isDirtyRef.current) return
      const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return
      e.preventDefault()
      e.stopPropagation()
      setPendingNav(href)
    }
    document.addEventListener('click', handler, { capture: true })
    return () => document.removeEventListener('click', handler, { capture: true })
  }, [])

  // ── Payload / save helpers ──────────────────────────────────────────────

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

  async function savePackage() {
    const result = await savePackageAction(buildPayload())
    setSaveError(result.error ?? null)
    return result
  }

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await savePackage()
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsDirty(false)
        toast.success('Package saved')
        if (isNew) router.push(`/dashboard/packages/${result.id}`)
      }
    })
  }

  async function handleDeploy(env: EnvName): Promise<{ error?: string }> {
    const baseline = pkg
      ? { pkg: pkg as unknown as import('@/lib/packages/types').Package, modules: pkg.modules }
      : null
    const result = await saveAndDeployAction(buildPayload(), env, baseline)
    setSaveError(result.error ?? null)
    if (!result.error) setIsDirty(false)
    return result
  }

  // ── Nav-guard modal actions ─────────────────────────────────────────────

  function handleStay() {
    setPendingNav(null)
  }

  async function handleSaveAndNavigate() {
    if (!pendingNav) return
    setIsNavSaving(true)
    const result = await savePackage()
    setIsNavSaving(false)
    if (result.error) {
      toast.error(result.error)
      setPendingNav(null)
    } else {
      setIsDirty(false)
      const nav = pendingNav
      setPendingNav(null)
      toast.success('Package saved')
      router.push(nav)
    }
  }

  function handleLeaveWithoutSaving() {
    setIsDirty(false)
    const nav = pendingNav!
    setPendingNav(null)
    router.push(nav)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const STATUS_BADGE: Record<PackageStatus, string> = {
    active: 'badge-green', draft: 'badge-grey', archived: 'badge-red',
  }

  const deploymentReady = Boolean(pkg?.id) && Boolean(name) && Boolean(slug)

  const TABS = ['Basics', 'Modules', 'Role Ceilings', `Tenants (${pkg?.tenant_count ?? 0})`, 'Analytics', ...(deploymentReady ? ['Deployment'] : [])]

  return (
    <div>
      {/* Unsaved-changes confirmation modal */}
      {pendingNav && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '28px 32px', width: 380, boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Unsaved changes</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              You have unsaved changes to this package. What would you like to do?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleSaveAndNavigate}
                disabled={isNavSaving}
                className="btn-p"
                style={{ width: '100%', padding: '10px 0', fontSize: 13 }}
              >
                {isNavSaving ? 'Saving…' : 'Save and continue'}
              </button>
              <button
                onClick={handleLeaveWithoutSaving}
                className="btn-s"
                style={{ width: '100%', padding: '10px 0', fontSize: 13, color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}
              >
                Leave without saving
              </button>
              <button
                onClick={handleStay}
                className="btn-s"
                style={{ width: '100%', padding: '10px 0', fontSize: 13 }}
              >
                Stay on this page
              </button>
            </div>
          </div>
        </div>
      )}

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
          {isDirty && <span style={{ fontSize: 11, color: '#f59e0b' }}>Unsaved changes</span>}
          <button
            className="btn-s"
            onClick={() => isDirty ? setPendingNav('/dashboard/packages') : router.push('/dashboard/packages')}
          >
            Discard
          </button>
          <button className="btn-p" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
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
          name={name} setName={v => { setName(v); markDirty() }}
          slug={slug} setSlug={v => { setSlug(v); markDirty() }}
          description={description} setDescription={v => { setDescription(v); markDirty() }}
          priceMonthly={priceMonthly} setPriceMonthly={v => { setPriceMonthly(v); markDirty() }}
          priceAnnual={priceAnnual} setPriceAnnual={v => { setPriceAnnual(v); markDirty() }}
          scansLimit={scansLimit} setScansLimit={v => { setScansLimit(v); markDirty() }}
          tokensLimit={tokensLimit} setTokensLimit={v => { setTokensLimit(v); markDirty() }}
          targetsLimit={targetsLimit} setTargetsLimit={v => { setTargetsLimit(v); markDirty() }}
          scanTypes={scanTypes} setScanTypes={v => { setScanTypes(v); markDirty() }}
          stripeProductId={stripeProductId} setStripeProductId={v => { setStripeProductId(v); markDirty() }}
          status={status} setStatus={v => { setStatus(v); markDirty() }}
        />
      </div>
      <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <ModulesTab
          moduleSlugList={moduleSlugList}
          moduleModes={moduleModes}
          setModuleMode={setModuleMode}
          setModuleTrialDays={setModuleTrialDays}
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
      {deploymentReady && (
        <div style={{ display: activeTab === 5 ? 'block' : 'none' }}>
          <DeploymentTab
            packageId={pkg!.id}
            pushLog={pkg?.push_log ?? []}
            updatedAt={pkg?.updated_at ?? ''}
            onDeploy={handleDeploy}
          />
        </div>
      )}
    </div>
  )
}
