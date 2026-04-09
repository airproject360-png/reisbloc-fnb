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
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error('No se pudo validar la sesion actual. Vuelve a iniciar sesion con Google.')
  }

  const accessToken = session?.access_token
  if (!accessToken) {
    throw new Error('Tu sesion no es valida para enviar invitaciones. Inicia sesion con Google e intenta de nuevo.')
  }

  const { data, error } = await supabase.functions.invoke('invite-event-user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      ...params,
    },
  })

  if (error) {
    if (error.message?.includes('401')) {
      throw new Error('No autorizado para invitar. Cierra sesion e inicia de nuevo con Google como admin.')
    }
    throw new Error(error.message || 'No se pudo enviar la invitacion')
  }

  if (!data?.success) {
    throw new Error(data?.error || 'No se pudo enviar la invitacion')
  }

  return data as InviteUserResult
}
