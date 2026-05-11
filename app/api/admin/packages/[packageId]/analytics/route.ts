// admin/app/api/admin/packages/[packageId]/analytics/route.ts
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ packageId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packageId } = await params
  const db = createServiceClient()

  const { data: tenantPackages } = await db
    .from('tenant_packages')
    .select('tenant_id, assigned_at, stripe_sub_id, override_reason, tenant:tenants(id, name, last_login_at, scans_this_month, mrr_eur)')
    .eq('package_id', packageId)

  const rows = (tenantPackages ?? []) as any[]
  const tenantIds = rows.map((r: any) => r.tenant_id)

  const { data: trialsForTenants } = tenantIds.length > 0
    ? await db.from('tenant_module_trials').select('*').in('tenant_id', tenantIds)
    : { data: [] }

  const now = new Date()
  const thirtyDaysAgo  = new Date(now.getTime() - 30  * 86400_000)
  const ninetyDaysAgo  = new Date(now.getTime() - 90  * 86400_000)

  const trialRows = (trialsForTenants ?? []) as any[]

  const totalMrr    = rows.reduce((s: number, r: any) => s + (r.tenant?.mrr_eur ?? 0), 0)
  const activeCount = rows.filter(r => r.tenant?.last_login_at && new Date(r.tenant.last_login_at) > thirtyDaysAgo).length
  const idleCount   = rows.filter(r => r.tenant?.last_login_at && new Date(r.tenant.last_login_at) <= thirtyDaysAgo && new Date(r.tenant.last_login_at) > ninetyDaysAgo).length
  const dormantCount = rows.filter(r => !r.tenant?.last_login_at || new Date(r.tenant.last_login_at) <= ninetyDaysAgo).length
  const avgScansUsed = rows.reduce((s: number, r: any) => s + (r.tenant?.scans_this_month ?? 0), 0) / Math.max(rows.length, 1)
  const activeTrials  = trialRows.filter((t: any) => new Date(t.expires_at) > now).length
  const expiredTrials = trialRows.filter((t: any) => new Date(t.expires_at) <= now).length

  return NextResponse.json({
    tenant_count: rows.length,
    mrr: totalMrr,
    cohorts: { active: activeCount, idle: idleCount, dormant: dormantCount },
    trials: { active: activeTrials, expired: expiredTrials },
    avg_scans_used: Math.round(avgScansUsed * 10) / 10,
  })
}
