/**
 * Reisbloc POS - Sistema POS Profesional
 * ⚠️ CLIENTE: REISBLOC F&B (Producción)
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
import { APP_CONFIG } from '@/config/constants'
import { isLocalitoTenant, LOCALITO_ORG_ID, DEFAULT_DEMO_ORG_ID } from '@/config/tenantConfig'

const LOCAL_ORG_KEY = 'reisbloc_org_id'

const FORCED_ADMIN_EMAILS = new Set(APP_CONFIG.ADMIN_EMAILS)

const normalizeEventRole = (role: unknown): 'admin' | 'supervisor' => {
  if (typeof role !== 'string') return 'supervisor'
  return role === 'admin' ? 'admin' : 'supervisor'
}

const FALLBACK_EVENT_ORG_ID = (import.meta.env.VITE_EVENT_ORGANIZATION_ID as string | undefined)

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
  if (isLocalitoTenant()) {
    persistOrganizationId(LOCALITO_ORG_ID)
    return LOCALITO_ORG_ID
  }

  const metadataOrg = authUser?.user_metadata?.organization_id || authUser?.app_metadata?.organization_id
  if (metadataOrg) {
    persistOrganizationId(metadataOrg)
    return metadataOrg
  }

  const { data: bootstrappedOrgId, error: bootstrapError } = await supabase.rpc('ensure_current_user_profile')
  if (!bootstrapError && bootstrappedOrgId) {
    persistOrganizationId(bootstrappedOrgId)
    return bootstrappedOrgId
  }

  if (bootstrapError) {
    logger.warn('auth', 'No se pudo bootstrapear perfil OAuth en users', bootstrapError)
  }

  const cachedOrg = getStoredOrganizationId()
  // Si no estamos en el tenant de Localito, no usar cachedOrg si era de Localito
  if (cachedOrg && cachedOrg !== LOCALITO_ORG_ID) return cachedOrg

  const { data, error } = await supabase.rpc('current_user_org_id')
  if (!error && data) {
    persistOrganizationId(data)
    return data
  }

  if (error) {
    logger.warn('auth', 'No se pudo resolver organization_id por RPC', error)
  }

  const { data: primaryOrgId, error: primaryOrgError } = await supabase.rpc('get_primary_organization_id')
  if (!primaryOrgError && primaryOrgId) {
    persistOrganizationId(primaryOrgId)
    return primaryOrgId
  }

  if (primaryOrgError) {
    logger.warn('auth', 'No se pudo resolver organization_id primario', primaryOrgError)
  }

  const fallbackOrg = FALLBACK_EVENT_ORG_ID || APP_CONFIG.ORGANIZATION_ID || DEFAULT_DEMO_ORG_ID
  persistOrganizationId(fallbackOrg)
  return fallbackOrg
}

export const mapAuthUserToAppUser = (authUser: any): User => {
  const metadata = authUser?.user_metadata || {}
  const appMetadata = authUser?.app_metadata || {}
  const email = String(authUser?.email || '').toLowerCase()
  const requestedRole = metadata?.role || appMetadata?.role
  const role = FORCED_ADMIN_EMAILS.has(email)
    ? 'admin'
    : normalizeEventRole(requestedRole)

  const isLocalito = isLocalitoTenant()
  const defaultOrgId = isLocalito ? LOCALITO_ORG_ID : (FALLBACK_EVENT_ORG_ID || APP_CONFIG.ORGANIZATION_ID || DEFAULT_DEMO_ORG_ID)

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
      (getStoredOrganizationId() !== LOCALITO_ORG_ID || isLocalito ? getStoredOrganizationId() : undefined) ||
      defaultOrgId,
  }
}

export async function resolveAuthorizedAppUser(authUser: any): Promise<User | null> {
  try {
    const authId = String(authUser?.id || '').trim()
    const email = String(authUser?.email || '').toLowerCase().trim()

    if (!authId || !email) {
      logger.warn('auth', 'OAuth user inválido para autorización', { authId, email })
      return null
    }

    const isLocalito = isLocalitoTenant()
    const defaultOrgId = isLocalito 
      ? LOCALITO_ORG_ID 
      : (FALLBACK_EVENT_ORG_ID || APP_CONFIG.ORGANIZATION_ID || DEFAULT_DEMO_ORG_ID)

    // Consultar usuario en users por id o email (sin restringir previamente por org para no bloquear multi-tenancy)
    let query = supabase
      .from('users')
      .select('id, name, username, email, role, active, organization_id, created_at')
      .or(`id.eq.${authId},email.eq.${email}`)
      .eq('active', true)

    if (isLocalito) {
      query = query.eq('organization_id', LOCALITO_ORG_ID)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
      logger.error('auth', 'Error validando usuario OAuth contra users', error)
      return null
    }

    const targetOrgId = data?.organization_id || defaultOrgId

    // Asegurar que el usuario de Auth exista en la tabla users para evitar errores de clave foránea en ventas/órdenes
    const username = data?.username || data?.name || authUser.user_metadata?.full_name || email.split('@')[0] || (isLocalito ? 'Admin LOCALITO' : `Admin ${APP_CONFIG.CLIENT_NAME}`)
    const role = FORCED_ADMIN_EMAILS.has(email) ? 'admin' : (String(data?.role || 'admin') as User['role'])

    if (!data) {
      try {
        await supabase.from('users').upsert({
          id: authId,
          organization_id: targetOrgId,
          name: username,
          username: username,
          email: email,
          role: role,
          active: true
        })
      } catch (err) {
        logger.warn('auth', 'Upsert usuario auth en users omitido o fallido:', err)
      }
    }

    persistOrganizationId(targetOrgId)

    return {
      id: authId,
      username,
      pin: '1234',
      role,
      email,
      active: true,
      createdAt: data?.created_at ? new Date(data.created_at) : new Date(),
      businessName: isLocalito ? 'LOCALITO - GUISOS & BARRA FRÍA' : `${APP_CONFIG.CLIENT_NAME} - ${APP_CONFIG.CLIENT_TAGLINE}`,
      organizationId: targetOrgId
    }
  } catch (error) {
    logger.error('auth', 'Error resolviendo usuario OAuth autorizado', error as any)
    return null
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
