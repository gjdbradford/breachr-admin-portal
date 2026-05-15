// admin/app/dashboard/guides/new/page.tsx
import { redirect } from 'next/navigation'
import { saveGuideSet } from '@/lib/guides/db'

export default async function NewGuidePage() {
  const id = await saveGuideSet({
    title: 'Untitled Guide',
    description: '',
    route: '/dashboard',
    roles: ['account_owner'],
    auto_open: 'first_visit',
    is_published: false,
    sort_order: 0,
  })
  redirect(`/dashboard/guides/${id}`)
}
