'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  savePackageFull, saveAndPushToEnv, pushPackageToEnv, redactPushLogEntry,
  setPackageStatus, reassignTenant, reorderPackages,
} from '@/lib/packages/db'
import type { SavePackagePayload, EnvName, Package, PackageModule } from '@/lib/packages/types'

async function getAdminEmail(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? 'unknown'
}

export async function savePackageAction(payload: SavePackagePayload): Promise<{ id: string; error?: string }> {
  try {
    const id = await savePackageFull(payload)
    return { id }
  } catch (e) {
    return { id: '', error: e instanceof Error ? e.message : 'Save failed' }
  }
}

export async function saveAndDeployAction(
  payload: SavePackagePayload,
  env: EnvName,
  baseline: { pkg: Package; modules: PackageModule[] } | null,
): Promise<{ id: string; error?: string }> {
  try {
    const pushedBy = await getAdminEmail()
    const id = await saveAndPushToEnv(payload, env, pushedBy, baseline)
    return { id }
  } catch (e) {
    return { id: '', error: e instanceof Error ? e.message : 'Deploy failed' }
  }
}

export async function pushToEnvAction(packageId: string, env: EnvName): Promise<{ error?: string }> {
  try {
    const pushedBy = await getAdminEmail()
    await pushPackageToEnv(packageId, env, pushedBy)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Push failed' }
  }
}

export async function redactLogEntryAction(logId: string): Promise<{ error?: string }> {
  try {
    const redactedBy = await getAdminEmail()
    await redactPushLogEntry(logId, redactedBy)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Redact failed' }
  }
}

export async function archivePackageAction(packageId: string): Promise<void> {
  await setPackageStatus(packageId, 'archived')
  redirect('/dashboard/packages')
}

export async function restorePackageAction(packageId: string): Promise<void> {
  await setPackageStatus(packageId, 'active')
  redirect('/dashboard/packages')
}

export async function reorderPackagesAction(orderedIds: string[]): Promise<{ error?: string }> {
  try {
    await reorderPackages(orderedIds)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Reorder failed' }
  }
}

export async function reassignTenantAction(tenantId: string, newPackageId: string): Promise<{ error?: string }> {
  try {
    const assignedBy = await getAdminEmail()
    await reassignTenant(tenantId, newPackageId, assignedBy)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Reassign failed' }
  }
}
