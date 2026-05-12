// admin/lib/pricing-sets/db.ts
import { createServiceClient } from '@/lib/supabase/server'
import type {
  PricingSet, PricingSetDetail, PricingSetListItem, PricingSetPackage,
  PricingSetStatus, AbTest, AbTestWithSets, SavePricingSetPayload, SaveAbTestPayload,
  AbTestAnalytics, AbTestVariantStats,
} from './types'

function isLive(row: { active_from: string; active_to: string | null; status: string }): boolean {
  if (row.status !== 'active') return false
  const now = new Date()
  if (new Date(row.active_from) > now) return false
  if (row.active_to && new Date(row.active_to) <= now) return false
  return true
}

export async function listPricingSets(): Promise<PricingSetListItem[]> {
  const db = createServiceClient()
  const [{ data: sets }, { data: pkgs }] = await Promise.all([
    db.from('pricing_sets').select('*').order('created_at', { ascending: false }),
    db.from('pricing_set_packages').select('set_id'),
  ])
  return (sets ?? []).map((s: PricingSet) => ({
    ...s,
    package_count: (pkgs ?? []).filter((p: { set_id: string }) => p.set_id === s.id).length,
    is_live: isLive(s),
  }))
}

export async function getPricingSet(id: string): Promise<PricingSetDetail | null> {
  const db = createServiceClient()
  const [{ data: set }, { data: pkgs }] = await Promise.all([
    db.from('pricing_sets').select('*').eq('id', id).single(),
    db.from('pricing_set_packages').select('*').eq('set_id', id).order('display_order'),
  ])
  if (!set) return null
  return { ...(set as PricingSet), packages: (pkgs ?? []) as PricingSetPackage[] }
}

export async function savePricingSet(payload: SavePricingSetPayload): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('pricing_sets')
    .upsert({
      ...(payload.id ? { id: payload.id } : {}),
      name: payload.name,
      description: payload.description,
      status: payload.status,
      active_from: payload.active_from,
      active_to: payload.active_to,
    }, { onConflict: 'id' })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Save failed')
  const setId = data.id

  await db.from('pricing_set_packages').delete().eq('set_id', setId)
  if (payload.packages.length > 0) {
    const { error: pkgErr } = await db.from('pricing_set_packages').insert(
      payload.packages.map(p => ({ set_id: setId, package_id: p.package_id, display_order: p.display_order }))
    )
    if (pkgErr) throw new Error(pkgErr.message)
  }
  return setId
}

export async function listAbTests(): Promise<AbTestWithSets[]> {
  const db = createServiceClient()
  const { data } = await db
    .from('ab_tests')
    .select('*, set_a:pricing_sets!set_a_id(*), set_b:pricing_sets!set_b_id(*)')
    .order('created_at', { ascending: false })
  return ((data ?? []) as AbTestWithSets[]).map(t => ({ ...t, is_live: isLive(t) }))
}

export async function getAbTest(id: string): Promise<AbTestWithSets | null> {
  const db = createServiceClient()
  const { data } = await db
    .from('ab_tests')
    .select('*, set_a:pricing_sets!set_a_id(*), set_b:pricing_sets!set_b_id(*)')
    .eq('id', id)
    .single()
  if (!data) return null
  return { ...(data as AbTestWithSets), is_live: isLive(data as AbTest) }
}

export async function saveAbTest(payload: SaveAbTestPayload): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('ab_tests')
    .upsert({
      ...(payload.id ? { id: payload.id } : {}),
      name: payload.name,
      set_a_id: payload.set_a_id,
      set_b_id: payload.set_b_id,
      traffic_split_a: payload.traffic_split_a,
      status: payload.status,
      active_from: payload.active_from,
      active_to: payload.active_to,
    }, { onConflict: 'id' })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Save failed')
  return data.id
}

export async function endAbTest(id: string): Promise<void> {
  const db = createServiceClient()
  const { error } = await db.from('ab_tests').update({ status: 'ended' }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setPricingSetStatus(id: string, status: PricingSetStatus): Promise<void> {
  const db = createServiceClient()
  const { error } = await db.from('pricing_sets').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAbTestAnalytics(testId: string): Promise<AbTestAnalytics> {
  const db = createServiceClient()
  const { data: events } = await db
    .from('pricing_set_events')
    .select('variant, event_type, package_slug, session_id')
    .eq('ab_test_id', testId)

  const rows = (events ?? []) as { variant: string; event_type: string; package_slug: string | null; session_id: string }[]

  function variantStats(v: 'a' | 'b'): AbTestVariantStats {
    const vRows = rows.filter(r => r.variant === v)
    const views = new Set(vRows.filter(r => r.event_type === 'view').map(r => r.session_id)).size
    const clicks = vRows.filter(r => r.event_type === 'cta_click').length
    const leads = vRows.filter(r => r.event_type === 'lead_submitted').length

    const pkgMap = new Map<string, number>()
    for (const r of vRows.filter(r => r.event_type === 'cta_click' && r.package_slug)) {
      pkgMap.set(r.package_slug!, (pkgMap.get(r.package_slug!) ?? 0) + 1)
    }
    const topPackages = [...pkgMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug, count]) => ({ slug, count }))

    return {
      views,
      clicks,
      leads,
      ctr: views > 0 ? clicks / views : 0,
      cvr: views > 0 ? leads / views : 0,
      topPackages,
    }
  }

  return { a: variantStats('a'), b: variantStats('b'), total_events: rows.length }
}

export async function clonePricingSet(id: string): Promise<string> {
  const db = createServiceClient()
  const source = await getPricingSet(id)
  if (!source) throw new Error('Set not found')

  const { data, error } = await db
    .from('pricing_sets')
    .insert({
      name: `Copy of ${source.name}`,
      description: source.description,
      status: 'draft' as PricingSetStatus,
      active_from: source.active_from,
      active_to: source.active_to,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Clone failed')

  if (source.packages.length > 0) {
    await db.from('pricing_set_packages').insert(
      source.packages.map(p => ({ set_id: data.id, package_id: p.package_id, display_order: p.display_order }))
    )
  }
  return data.id
}
