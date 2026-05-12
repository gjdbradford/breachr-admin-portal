'use server'

import { saveAbTest, endAbTest } from '@/lib/pricing-sets/db'
import type { SaveAbTestPayload } from '@/lib/pricing-sets/types'

export async function saveAbTestAction(
  payload: SaveAbTestPayload,
): Promise<{ id: string; error?: string }> {
  try {
    const id = await saveAbTest(payload)
    return { id }
  } catch (e) {
    return { id: '', error: e instanceof Error ? e.message : 'Save failed' }
  }
}

export async function endAbTestAction(testId: string): Promise<{ error?: string }> {
  try {
    await endAbTest(testId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'End test failed' }
  }
}
