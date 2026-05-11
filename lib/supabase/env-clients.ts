// admin/lib/supabase/env-clients.ts
import { createClient } from '@supabase/supabase-js'
import type { EnvName } from '@/lib/packages/types'

export function createEnvServiceClient(env: EnvName) {
  if (env === 'staging') {
    const url = process.env.SUPABASE_STAGING_URL
    const key = process.env.SUPABASE_STAGING_SERVICE_KEY
    if (!url) throw new Error('Missing env: SUPABASE_STAGING_URL')
    if (!key) throw new Error('Missing env: SUPABASE_STAGING_SERVICE_KEY')
    return createClient(url, key)
  }
  const url = process.env.SUPABASE_PROD_URL
  const key = process.env.SUPABASE_PROD_SERVICE_KEY
  if (!url) throw new Error('Missing env: SUPABASE_PROD_URL')
  if (!key) throw new Error('Missing env: SUPABASE_PROD_SERVICE_KEY')
  return createClient(url, key)
}
