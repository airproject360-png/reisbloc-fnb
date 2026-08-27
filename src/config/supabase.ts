/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc Lab
 * 
 * Este módulo configura el cliente seguro de Supabase para la aplicación web client-side.
 * Siguiendo las buenas prácticas internacionales de arquitectura multi-tenant:
 * - Se utiliza EXCLUSIVAMENTE la clave pública anónima (VITE_SUPABASE_ANON_KEY).
 * - NUNCA se exponen claves maestras (service_role) en el cliente web.
 * - El aislamiento entre inquilinos (tenants) se delega a las políticas RLS y organization_id.
 */

import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'

// Clave pública del cliente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_PROJECT_REF') && 
  !supabaseUrl.includes('missing-env-vars')
)

// Cliente seguro público (Anon Key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

/**
 * Guardar el token de sesión autenticada en el cliente web
 */
export const setAuthToken = async (token: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sb-access-token', token)
    }
    if (isSupabaseConfigured && token) {
      await supabase.auth.setSession({ access_token: token, refresh_token: token }).catch(() => {})
    }
  } catch (error) {
    console.error('Error guardando token de usuario:', error)
  }
}

export const getAuthToken = async (): Promise<string | null> => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('sb-access-token')
  }
  return null
}

export const removeAuthToken = async () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('sb-access-token')
  }
}

export const forceAuthHeader = (token: string) => {
  if (!token || !isSupabaseConfigured) return
  try {
    // @ts-ignore
    if (supabase.realtime) supabase.realtime.setAuth(token)
  } catch (err) {
    console.warn('Error configurando auth realtime:', err)
  }
}

// Feature flags para Supabase
export const SUPABASE_FEATURES = {
  DATABASE_ENABLED: true,
  AUTH_ENABLED: true,
  REALTIME_ENABLED: true,
  STORAGE_ENABLED: true,
  EDGE_FUNCTIONS_ENABLED: true
}
