// admin/app/api/admin/packages/[packageId]/tenants/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackageTenants } from '@/lib/packages/db'

export async function GET(_req: Request, { params }: { params: Promise<{ packageId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packageId } = await params
  const data = await getPackageTenants(packageId)
  return NextResponse.json(data)
}
