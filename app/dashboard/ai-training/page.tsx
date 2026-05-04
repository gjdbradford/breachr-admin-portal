import { createServiceClient } from '@/lib/supabase/server'
import AITrainingEditor from '@/components/AITrainingEditor'

export default async function AITrainingPage() {
  const db = createServiceClient()
  const { data: contexts } = await db
    .from('ai_training_context')
    .select('*')
    .order('category')
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">AI Training & Context</div>
          <div className="page-sub">Manage probe rules, vulnerability definitions, and system prompts injected into the scanner</div>
        </div>
      </div>
      <AITrainingEditor initialContexts={contexts ?? []} />
    </>
  )
}
