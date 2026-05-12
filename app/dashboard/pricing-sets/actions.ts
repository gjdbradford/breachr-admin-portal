'use server'

import { revalidatePath } from 'next/cache'
import { clonePricingSet, setPricingSetStatus } from '@/lib/pricing-sets/db'
import type { PricingSetStatus } from '@/lib/pricing-sets/types'

export async function clonePricingSetAction(id: string): Promise<{ newId: string; error?: string }> {
  try {
    const newId = await clonePricingSet(id)
    revalidatePath('/dashboard/pricing-sets')
    return { newId }
  } catch (e) {
    return { newId: '', error: e instanceof Error ? e.message : 'Clone failed' }
  }
}

export async function setPricingSetStatusAction(id: string, status: PricingSetStatus): Promise<{ error?: string }> {
  try {
    await setPricingSetStatus(id, status)
    revalidatePath('/dashboard/pricing-sets')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Update failed' }
  }
}
