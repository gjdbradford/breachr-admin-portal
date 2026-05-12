'use server'

import { savePricingSet } from '@/lib/pricing-sets/db'
import type { SavePricingSetPayload } from '@/lib/pricing-sets/types'

export async function savePricingSetAction(
  payload: SavePricingSetPayload,
): Promise<{ id: string; error?: string }> {
  try {
    const id = await savePricingSet(payload)
    return { id }
  } catch (e) {
    return { id: '', error: e instanceof Error ? e.message : 'Save failed' }
  }
}
