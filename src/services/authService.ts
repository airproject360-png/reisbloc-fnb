/**
 * Reisbloc POS - Sistema POS Profesional
 * ⚠️ CLIENTE: CEVICHERIA MEXA (Producción)
 * 
 * NOTA IMPORTANTE: Este archivo pertenece a una instancia Single-Tenant.
 * NO SOBREESCRIBIR con lógica del SaaS Multi-Tenant sin revisión manual.
 * 
 * Copyright (C) 2026 Reisbloc POS
 */

// Servicio de autenticación solo Supabase
import { supabase } from '@/config/supabase'
import { clearAuthToken } from './jwtService'

import logger from '@/utils/logger'
import { User } from '@/types/index'

const LOCAL_ORG_KEY = 'reisbloc_org_id'

const FORCED_ADMIN_EMAILS = new Set([
  'airproject360@gmail.com',
])

const normalizeEventRole = (role: unknown): 'admin' | 'supervisor' => {
  if (typeof role !== 'string') return 'supervisor'
  return role === 'admin' ? 'admin' : 'supervisor'
}

const FALLBACK_EVENT_ORG_ID = (import.meta.env.VITE_EVENT_ORGANIZATION_ID as string | undefined) || undefined

export const getStoredOrganizationId = (): string | undefined => {
  try {
    const value = localStorage.getItem(LOCAL_ORG_KEY)
    return value || undefined
  } catch {
    return undefined
  }
}

const persistOrganizationId = (orgId?: string | null) => {
  if (!orgId) return
  try {
    localStorage.setItem(LOCAL_ORG_KEY, orgId)
  } catch {
    // Ignore storage errors in private mode.
  }
}

export async function resolveCurrentOrganizationId(authUser?: any): Promise<string | undefined> {
  const metadataOrg = authUser?.user_metadata?.organization_id || authUser?.app_metadata?.organization_id
  if (metadataOrg) {
    persistOrganizationId(metadataOrg)
    return metadataOrg
  }

  const cachedOrg = getStoredOrganizationId()
  if (cachedOrg) return cachedOrg

  const { data, error } = await supabase.rpc('current_user_org_id')
  if (!error && data) {
    persistOrganizationId(data)
    return data
  }

  if (error) {
    logger.warn('auth', 'No se pudo resolver organization_id por RPC', error)
  }

  if (FALLBACK_EVENT_ORG_ID) {
    persistOrganizationId(FALLBACK_EVENT_ORG_ID)
  }

  return FALLBACK_EVENT_ORG_ID
}

export const mapAuthUserToAppUser = (authUser: any): User => {
  const metadata = authUser?.user_metadata || {}
  const appMetadata = authUser?.app_metadata || {}
  const email = String(authUser?.email || '').toLowerCase()
  const requestedRole = metadata?.role || appMetadata?.role
  const role = FORCED_ADMIN_EMAILS.has(email)
    ? 'admin'
    : normalizeEventRole(requestedRole)

  return {
    id: authUser.id,
    username: metadata?.full_name || metadata?.name || authUser.email || 'Usuario',
    pin: '',
    role,
    email: authUser.email,
    active: true,
    createdAt: authUser.created_at ? new Date(authUser.created_at) : new Date(),
    devices: [],
    organizationId:
      metadata?.organization_id ||
      appMetadata?.organization_id ||
      getStoredOrganizationId() ||
      FALLBACK_EVENT_ORG_ID,
  }
}

export async function authLoginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    logger.error('auth', '❌ Error iniciando Google OAuth', { message: error?.message, details: error })
    return { success: false, error: error?.message || 'No se pudo iniciar sesión con Google' }
  }
}

export async function authLogout(): Promise<void> {
  try {
    clearAuthToken() // Limpiar token local
    logger.info('auth', '🗑️ Token local eliminado')
    
    // Intentar logout de Supabase, pero no bloquear si falla
    const { error } = await supabase.auth.signOut()
    if (error) logger.warn('auth', 'Supabase signOut warning', error)
    
    logger.info('auth', '✅ Logout exitoso')
  } catch (error: any) {
    logger.error('auth', 'Error en logout', error)
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return null // useAuth maneja el estado
  } catch (error) {
    logger.error('auth', 'Error getting user', error)
  }
  return null
}
