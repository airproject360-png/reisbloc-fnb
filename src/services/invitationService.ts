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

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]))
    const exp = Number(payload?.exp)
    return Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

function isTokenNearExpiry(token: string, thresholdSeconds = 90): boolean {
  const exp = decodeJwtExp(token)
  if (!exp) return false
  const now = Math.floor(Date.now() / 1000)
  return exp - now <= thresholdSeconds
}

function isUnauthorizedFunctionError(error: unknown): boolean {
  const err = error as any
  const message = String(err?.message || '').toLowerCase()
  const status = Number(err?.status || err?.context?.status || err?.context?.response?.status)
  return status === 401 || message.includes('401') || message.includes('unauthorized')
}

async function getFreshAccessToken(): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error('No se pudo validar la sesion actual. Vuelve a iniciar sesion con Google.')
  }

  if (session?.access_token && !isTokenNearExpiry(session.access_token)) {
    return session.access_token
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshed.session?.access_token) {
    throw new Error('Tu sesion no es valida para enviar invitaciones. Inicia sesion con Google e intenta de nuevo.')
  }

  return refreshed.session.access_token
}

async function invokeInvite(accessToken: string, params: InviteUserParams) {
  return supabase.functions.invoke('invite-event-user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      ...params,
      appUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })
}

export async function inviteUserToEvento(params: InviteUserParams): Promise<InviteUserResult> {
  const accessToken = await getFreshAccessToken()

  let { data, error } = await invokeInvite(accessToken, params)

  // Si el JWT expiró entre getSession e invoke, refrescamos y reintentamos una sola vez.
  if (isUnauthorizedFunctionError(error)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    const retryToken = refreshed.session?.access_token
    if (!refreshError && retryToken) {
      const retry = await invokeInvite(retryToken, params)
      data = retry.data
      error = retry.error
    }
  }

  if (error) {
    if (isUnauthorizedFunctionError(error)) {
      throw new Error('No autorizado para invitar. Cierra sesion e inicia de nuevo con Google como admin.')
    }
    throw new Error(error.message || 'No se pudo enviar la invitacion')
  }

  if (!data?.success) {
    throw new Error(data?.error || 'No se pudo enviar la invitacion')
  }

  return data as InviteUserResult
}
