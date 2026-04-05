import { supabase } from './supabase'

export type LogTargetType = 'usuario' | 'canal' | 'postagem' | 'curso' | 'nivel'

export async function logAction(params: {
  action: string
  targetType?: LogTargetType
  targetId?: string
  targetName?: string
  details?: Record<string, any>
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    target_name: params.targetName ?? null,
    details: params.details ?? null,
  })
}
