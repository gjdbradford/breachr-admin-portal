// admin/lib/guides/db.ts
import { createServiceClient } from '@/lib/supabase/server'

export type GuideSetRow = {
  id: string
  title: string
  description: string
  route: string
  roles: string[]
  auto_open: 'always' | 'first_visit' | 'never'
  next_guide_id: string | null
  is_published: boolean
  sort_order: number
  created_at: string
}

export type GuideStepRow = {
  id: string
  guide_set_id: string
  step_order: number
  title: string
  body: string
  image_url: string | null
  video_url: string | null
  target_selector: string | null
  links: Array<{ label: string; href: string; external: boolean }>
}

export type GuideStats = {
  started: number
  completed: number
  thumbsUp: number
  thumbsDown: number
}

export async function listGuideSets(): Promise<GuideSetRow[]> {
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('guide_sets')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as GuideSetRow[]
}

export async function getGuideSet(id: string): Promise<{ guideSet: GuideSetRow; steps: GuideStepRow[] } | null> {
  const admin = createServiceClient()
  const [{ data: gs, error: e1 }, { data: steps, error: e2 }] = await Promise.all([
    admin.from('guide_sets').select('*').eq('id', id).single(),
    admin.from('guide_steps').select('*').eq('guide_set_id', id).order('step_order', { ascending: true }),
  ])
  if (e1 || !gs) return null
  if (e2) throw new Error(e2.message)
  return { guideSet: gs as GuideSetRow, steps: (steps ?? []) as GuideStepRow[] }
}

export async function saveGuideSet(payload: Partial<GuideSetRow> & { id?: string }): Promise<string> {
  const admin = createServiceClient()
  if (payload.id) {
    const { id, ...rest } = payload
    const { error } = await admin.from('guide_sets').update(rest).eq('id', id)
    if (error) throw new Error(error.message)
    return id
  }
  const { data, error } = await admin.from('guide_sets').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function deleteGuideSet(id: string): Promise<void> {
  const admin = createServiceClient()
  const { error } = await admin.from('guide_sets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveGuideStep(payload: Partial<GuideStepRow> & { id?: string }): Promise<string> {
  const admin = createServiceClient()
  if (payload.id) {
    const { id, ...rest } = payload
    const { error } = await admin.from('guide_steps').update(rest).eq('id', id)
    if (error) throw new Error(error.message)
    return id
  }
  const { data, error } = await admin.from('guide_steps').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function deleteGuideStep(id: string): Promise<void> {
  const admin = createServiceClient()
  const { error } = await admin.from('guide_steps').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderGuideSteps(guideSetId: string, orderedIds: string[]): Promise<void> {
  const admin = createServiceClient()
  const results = await Promise.all(
    orderedIds.map((id, idx) =>
      admin.from('guide_steps').update({ step_order: idx + 1 }).eq('id', id).eq('guide_set_id', guideSetId)
    )
  )
  const failed = results.find(r => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}

export async function getGuideStats(guideSetId: string): Promise<GuideStats> {
  const admin = createServiceClient()
  const [
    { count: started },
    { count: completed },
    { count: thumbsUp },
    { count: thumbsDown },
  ] = await Promise.all([
    admin.from('guide_progress').select('id', { count: 'exact', head: true }).eq('guide_set_id', guideSetId),
    admin.from('guide_progress').select('id', { count: 'exact', head: true }).eq('guide_set_id', guideSetId).not('completed_at', 'is', null),
    admin.from('guide_ratings').select('id', { count: 'exact', head: true }).eq('guide_set_id', guideSetId).eq('helpful', true),
    admin.from('guide_ratings').select('id', { count: 'exact', head: true }).eq('guide_set_id', guideSetId).eq('helpful', false),
  ])
  return {
    started:   started ?? 0,
    completed: completed ?? 0,
    thumbsUp:  thumbsUp ?? 0,
    thumbsDown: thumbsDown ?? 0,
  }
}
