import { supabase } from '@/config/supabase'

export type EventInviteRole = 'admin' | 'supervisor'

export interface InviteUserParams {
  email: string
  role: EventInviteRole
  expiresInHours?: number
}

export interface InviteUserResult {
  success: boolean
  message: string
  email: string
  role: EventInviteRole
  expiresAt: string
  organization: {
    id: string
    slug: string
    name: string
  }
}

export async function inviteUserToEvento(params: InviteUserParams): Promise<InviteUserResult> {
  const { data, error } = await supabase.functions.invoke('invite-event-user', {
    body: {
      ...params,
      organizationSlug: 'evento',
    },
  })

  if (error) {
    throw new Error(error.message || 'No se pudo enviar la invitacion')
  }

  if (!data?.success) {
    throw new Error(data?.error || 'No se pudo enviar la invitacion')
  }

  return data as InviteUserResult
}
