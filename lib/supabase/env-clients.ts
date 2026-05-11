// admin/lib/supabase/env-clients.ts
import { createClient } from '@supabase/supabase-js'
import type { EnvName } from '@/lib/packages/types'

export function createEnvServiceClient(env: EnvName) {
  if (env === 'staging') {
    return createClient(
      process.env.SUPABASE_STAGING_URL!,
      process.env.SUPABASE_STAGING_SERVICE_KEY!,
    )
  }
  return createClient(
    process.env.SUPABASE_PROD_URL!,
    process.env.SUPABASE_PROD_SERVICE_KEY!,
  )
}
