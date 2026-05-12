// admin/lib/packages/db.ts
import { createServiceClient } from '@/lib/supabase/server'
import { createEnvServiceClient } from '@/lib/supabase/env-clients'
import { buildChangesSummary } from './diff'
import type {
  Package, PackageModule, PackageRoleCeiling, PackagePushLog,
  PackageListItem, PackageDetail, SavePackagePayload, EnvName,
} from './types'

export async function listPackages(): Promise<PackageListItem[]> {
  const db = createServiceClient()

  const [
    { data: packages, error: pkgsErr },
    { data: allModules },
    { data: tenantRows },
    { data: pushRows },
  ] = await Promise.all([
    db.from('packages').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    db.from('package_modules').select('*'),
    db.from('tenant_packages').select('package_id'),
    db.from('package_push_log')
      .select('package_id, environment, pushed_at, status')
      .eq('status', 'success')
      .order('pushed_at', { ascending: false }),
  ])

  if (pkgsErr) throw new Error(pkgsErr.message)

  const tenantCountMap = new Map<string, number>()
  for (const r of tenantRows ?? []) {
    tenantCountMap.set(r.package_id, (tenantCountMap.get(r.package_id) ?? 0) + 1)
  }

  const lastPushMap = new Map<string, { staging: string | null; production: string | null }>()
  for (const r of pushRows ?? []) {
    const entry = lastPushMap.get(r.package_id) ?? { staging: null, production: null }
    if (r.environment === 'staging' && !entry.staging) entry.staging = r.pushed_at
    if (r.environment === 'production' && !entry.production) entry.production = r.pushed_at
    lastPushMap.set(r.package_id, entry)
  }

  return (packages ?? []).map((pkg: Package) => ({
    ...pkg,
    modules: (allModules ?? []).filter((m: PackageModule) => m.package_id === pkg.id),
    tenant_count: tenantCountMap.get(pkg.id) ?? 0,
    last_push_staging: lastPushMap.get(pkg.id)?.staging ?? null,
    last_push_production: lastPushMap.get(pkg.id)?.production ?? null,
  }))
}

export async function getPackage(id: string): Promise<PackageDetail | null> {
  const db = createServiceClient()

  const [
    { data: pkg, error: pkgErr },
    { data: modules },
    { data: ceilings },
    { data: pushLog },
    { data: tenantRows },
  ] = await Promise.all([
    db.from('packages').select('*').eq('id', id).single(),
    db.from('package_modules').select('*').eq('package_id', id),
    db.from('package_role_ceilings').select('*').eq('package_id', id),
    db.from('package_push_log').select('*').eq('package_id', id).order('pushed_at', { ascending: false }).limit(20),
    db.from('tenant_packages').select('id').eq('package_id', id),
  ])

  if (pkgErr) throw new Error(pkgErr.message)
  if (!pkg) return null

  return {
    ...pkg,
    modules: (modules ?? []) as PackageModule[],
    ceilings: (ceilings ?? []) as PackageRoleCeiling[],
    push_log: (pushLog ?? []) as PackagePushLog[],
    tenant_count: tenantRows?.length ?? 0,
  }
}

export async function savePackageFull(payload: SavePackagePayload): Promise<string> {
  const db = createServiceClient()

  const pkgRow = {
    ...(payload.id ? { id: payload.id } : {}),
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    price_monthly: payload.is_poa ? 0 : (payload.price_monthly ?? 0),
    price_annual: payload.is_poa ? null : payload.price_annual,
    is_poa: payload.is_poa,
    scans_limit: payload.scans_limit,
    tokens_limit: payload.tokens_limit,
    targets_limit: payload.targets_limit,
    scan_types: payload.scan_types,
    stripe_product_id: payload.is_poa ? null : payload.stripe_product_id,
    status: payload.status,
    features: payload.features,
    badge: payload.badge,
    cta_label: payload.cta_label,
  }

  const { data: saved, error: pkgErr } = await db
    .from('packages')
    .upsert(pkgRow, { onConflict: 'id' })
    .select('id')
    .single()

  if (pkgErr || !saved) throw new Error(pkgErr?.message ?? 'Package save failed')

  const packageId = saved.id

  await db.from('package_modules').delete().eq('package_id', packageId)
  if (payload.modules.length > 0) {
    const { error: modErr } = await db.from('package_modules').insert(
      payload.modules.map(m => ({ ...m, package_id: packageId }))
    )
    if (modErr) throw new Error(modErr.message)
  }

  await db.from('package_role_ceilings').delete().eq('package_id', packageId)
  if (payload.ceilings.length > 0) {
    const { error: ceilErr } = await db.from('package_role_ceilings').insert(
      payload.ceilings.map(c => ({ ...c, package_id: packageId }))
    )
    if (ceilErr) throw new Error(ceilErr.message)
  }

  return packageId
}

export async function pushPackageToEnv(
  packageId: string,
  env: EnvName,
  pushedBy: string,
): Promise<void> {
  const adminDb  = createServiceClient()
  const targetDb = createEnvServiceClient(env)

  const detail = await getPackage(packageId)
  if (!detail) throw new Error('Package not found')

  const { data: targetPkg } = await targetDb
    .from('packages').select('*').eq('id', packageId).maybeSingle()
  const { data: targetMods } = await targetDb
    .from('package_modules').select('*').eq('package_id', packageId)

  const before = targetPkg
    ? { pkg: targetPkg as Package, modules: (targetMods ?? []) as PackageModule[] }
    : null

  const after = {
    pkg: detail as Package,
    modules: detail.modules,
  }

  const summary = buildChangesSummary(before, after)

  const deployedConfig = {
    name: detail.name, slug: detail.slug, description: detail.description,
    price_monthly: detail.is_poa ? 0 : (detail.price_monthly ?? 0),
    price_annual: detail.is_poa ? null : detail.price_annual,
    is_poa: detail.is_poa ?? false,
    features: detail.features, badge: detail.badge, cta_label: detail.cta_label,
    display_order: detail.display_order,
  }

  const { error: upsertErr } = await targetDb
    .from('packages')
    .upsert({
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      description: detail.description,
      price_monthly: detail.is_poa ? 0 : (detail.price_monthly ?? 0),
      price_annual: detail.is_poa ? null : detail.price_annual,
      is_poa: detail.is_poa ?? false,
      scans_limit: detail.scans_limit,
      tokens_limit: detail.tokens_limit,
      targets_limit: detail.targets_limit,
      scan_types: detail.scan_types,
      stripe_product_id: detail.is_poa ? null : detail.stripe_product_id,
      status: detail.status,
      features: detail.features,
      badge: detail.badge,
      cta_label: detail.cta_label,
      deployed_config: deployedConfig,
    }, { onConflict: 'id' })

  if (upsertErr) {
    await adminDb.from('package_push_log').insert({
      package_id: packageId, environment: env, pushed_by: pushedBy,
      changes_summary: summary, status: 'failed',
    })
    throw new Error(`Push to ${env} failed: ${upsertErr.message}`)
  }

  // modules
  await targetDb.from('package_modules').delete().eq('package_id', packageId)
  if (detail.modules.length > 0) {
    const { error: modErr } = await targetDb.from('package_modules').insert(
      detail.modules.map(m => ({
        package_id: m.package_id, module_slug: m.module_slug,
        access_mode: m.access_mode, trial_days: m.trial_days,
      }))
    )
    if (modErr) {
      await adminDb.from('package_push_log').insert({
        package_id: packageId, environment: env, pushed_by: pushedBy,
        changes_summary: summary, status: 'failed',
      })
      throw new Error(`Push to ${env} failed (modules): ${modErr.message}`)
    }
  }

  // ceilings
  await targetDb.from('package_role_ceilings').delete().eq('package_id', packageId)
  if (detail.ceilings.length > 0) {
    const { error: ceilErr } = await targetDb.from('package_role_ceilings').insert(
      detail.ceilings.map(c => ({
        package_id: c.package_id, role: c.role,
        permission: c.permission, enabled: c.enabled,
      }))
    )
    if (ceilErr) {
      await adminDb.from('package_push_log').insert({
        package_id: packageId, environment: env, pushed_by: pushedBy,
        changes_summary: summary, status: 'failed',
      })
      throw new Error(`Push to ${env} failed (ceilings): ${ceilErr.message}`)
    }
  }

  await adminDb.from('package_push_log').insert({
    package_id: packageId, environment: env, pushed_by: pushedBy,
    changes_summary: summary, status: 'success',
  })
}

export async function saveAndPushToEnv(
  payload: SavePackagePayload,
  env: EnvName,
  pushedBy: string,
  baseline: { pkg: Package; modules: PackageModule[] } | null,
): Promise<string> {
  if (!payload.id) throw new Error('Cannot deploy an unsaved package')

  const adminDb  = createServiceClient()
  const targetDb = createEnvServiceClient(env)
  const packageId = payload.id

  // For production we always diff against what's actually in prod right now.
  // For staging (admin DB == staging DB) the baseline from page-load is the
  // only reliable source of truth — by the time Deploy runs, any prior Save
  // will have already written the new state to staging, making a live query
  // return identical data and produce "No changes".
  let before: { pkg: Package; modules: PackageModule[] } | null = baseline

  if (env === 'production') {
    const [{ data: targetPkg }, { data: targetMods }] = await Promise.all([
      targetDb.from('packages').select('*').eq('id', packageId).maybeSingle(),
      targetDb.from('package_modules').select('*').eq('package_id', packageId),
    ])
    before = targetPkg
      ? { pkg: targetPkg as Package, modules: (targetMods ?? []) as PackageModule[] }
      : null
  }

  const after = {
    pkg: payload as unknown as Package,
    modules: payload.modules as unknown as PackageModule[],
  }

  const summary = buildChangesSummary(before, after)

  await savePackageFull(payload)

  const deployedConfig = {
    name: payload.name, slug: payload.slug, description: payload.description,
    price_monthly: payload.is_poa ? 0 : (payload.price_monthly ?? 0),
    price_annual: payload.is_poa ? null : payload.price_annual,
    is_poa: payload.is_poa,
    features: payload.features, badge: payload.badge, cta_label: payload.cta_label,
  }

  const { error: upsertErr } = await targetDb.from('packages').upsert({
    id: packageId,
    name: payload.name, slug: payload.slug, description: payload.description,
    price_monthly: payload.is_poa ? 0 : (payload.price_monthly ?? 0),
    price_annual: payload.is_poa ? null : payload.price_annual,
    is_poa: payload.is_poa,
    scans_limit: payload.scans_limit, tokens_limit: payload.tokens_limit,
    targets_limit: payload.targets_limit, scan_types: payload.scan_types,
    stripe_product_id: payload.is_poa ? null : payload.stripe_product_id,
    status: payload.status,
    features: payload.features, badge: payload.badge, cta_label: payload.cta_label,
    deployed_config: deployedConfig,
  }, { onConflict: 'id' })

  if (upsertErr) {
    await adminDb.from('package_push_log').insert({
      package_id: packageId, environment: env, pushed_by: pushedBy,
      changes_summary: summary, status: 'failed',
    })
    throw new Error(`Deploy to ${env} failed: ${upsertErr.message}`)
  }

  await targetDb.from('package_modules').delete().eq('package_id', packageId)
  if (payload.modules.length > 0) {
    const { error: modErr } = await targetDb.from('package_modules').insert(
      payload.modules.map(m => ({ ...m, package_id: packageId }))
    )
    if (modErr) {
      await adminDb.from('package_push_log').insert({
        package_id: packageId, environment: env, pushed_by: pushedBy,
        changes_summary: summary, status: 'failed',
      })
      throw new Error(`Deploy to ${env} failed (modules): ${modErr.message}`)
    }
  }

  await targetDb.from('package_role_ceilings').delete().eq('package_id', packageId)
  if (payload.ceilings.length > 0) {
    const { error: ceilErr } = await targetDb.from('package_role_ceilings').insert(
      payload.ceilings.map(c => ({ ...c, package_id: packageId }))
    )
    if (ceilErr) {
      await adminDb.from('package_push_log').insert({
        package_id: packageId, environment: env, pushed_by: pushedBy,
        changes_summary: summary, status: 'failed',
      })
      throw new Error(`Deploy to ${env} failed (ceilings): ${ceilErr.message}`)
    }
  }

  await adminDb.from('package_push_log').insert({
    package_id: packageId, environment: env, pushed_by: pushedBy,
    changes_summary: summary, status: 'success',
  })

  return packageId
}

export async function redactPushLogEntry(logId: string, redactedBy: string): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('package_push_log')
    .update({ status: 'redacted', redacted_at: new Date().toISOString(), redacted_by: redactedBy })
    .eq('id', logId)
  if (error) throw new Error(error.message)
}

export async function setPackageStatus(id: string, status: 'active' | 'archived' | 'draft'): Promise<void> {
  const db = createServiceClient()
  const { error } = await db.from('packages').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

type TenantPackageRow = {
  id: string
  assigned_at: string
  assigned_by: string | null
  override_reason: string | null
  stripe_sub_id: string | null
  tenant: { id: string; name: string; subdomain: string } | null
  trials: Array<{ module_slug: string; expires_at: string; first_accessed_at: string }>
}

export async function getPackageTenants(packageId: string): Promise<TenantPackageRow[]> {
  const db = createServiceClient()
  const { data } = await db
    .from('tenant_packages')
    .select(`
      id,
      assigned_at,
      assigned_by,
      override_reason,
      stripe_sub_id,
      tenant:tenants(id, name, subdomain),
      trials:tenant_module_trials(module_slug, expires_at, first_accessed_at)
    `)
    .eq('package_id', packageId)
    .order('assigned_at', { ascending: false })
  return data ?? []
}

export async function reassignTenant(tenantId: string, newPackageId: string, assignedBy: string): Promise<void> {
  const db = createServiceClient()
  const { error: deleteErr } = await db.from('tenant_packages').delete().eq('tenant_id', tenantId)
  if (deleteErr) throw new Error(deleteErr.message)
  const { error } = await db.from('tenant_packages').insert({
    tenant_id: tenantId,
    package_id: newPackageId,
    assigned_by: assignedBy,
    override_reason: 'Manual reassignment via admin portal',
  })
  if (error) throw new Error(error.message)
}

export async function reorderPackages(orderedIds: string[]): Promise<void> {
  const db = createServiceClient()
  await Promise.all(
    orderedIds.map((id, idx) =>
      db.from('packages').update({ display_order: idx }).eq('id', id)
    )
  )
}
