'use server'

import {
  saveGuideSet, deleteGuideSet,
  saveGuideStep, deleteGuideStep, reorderGuideSteps,
  type GuideSetRow, type GuideStepRow,
} from '@/lib/guides/db'
import { redirect } from 'next/navigation'

export async function saveGuideSetAction(
  payload: Partial<GuideSetRow> & { id: string }
): Promise<{ error?: string }> {
  try {
    await saveGuideSet(payload)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Save failed' }
  }
}

export async function deleteGuideSetAction(id: string): Promise<void> {
  await deleteGuideSet(id)
  redirect('/dashboard/guides')
}

export async function saveGuideStepAction(
  payload: Partial<GuideStepRow> & { guide_set_id: string; id?: string }
): Promise<{ id?: string; error?: string }> {
  try {
    const id = await saveGuideStep(payload)
    return { id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Save failed' }
  }
}

export async function deleteGuideStepAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteGuideStep(id)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Delete failed' }
  }
}

export async function reorderGuideStepsAction(
  guideSetId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  try {
    await reorderGuideSteps(guideSetId, orderedIds)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Reorder failed' }
  }
}
