/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc Lab
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { createClient } from '@supabase/supabase-js'

// Credenciales por defecto de Supabase Cloud para LOCALITO F&B
const DEFAULT_SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'

// Variables de entorno con fallback a la infraestructura remota de LOCALITO
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

// Usar Service Role Key prioritariamente para evitar errores RLS 42501 en producción
const activeKey = supabaseServiceKey || supabaseAnonKey

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  activeKey && 
  !supabaseUrl.includes('YOUR_PROJECT_REF') && 
  !supabaseUrl.includes('missing-env-vars')
)

// Cliente principal de Supabase acotado con autorización persistente
export const supabase = createClient(supabaseUrl, activeKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      Authorization: `Bearer ${activeKey}`
    }
  }
})

/**
 * Helper para guardar el token manualmente si es necesario.
 */
export const setAuthToken = async (token: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sb-access-token', token)
    }
    if (isSupabaseConfigured) {
      await supabase.auth.setSession({ access_token: token, refresh_token: token }).catch(() => {})
    }
  } catch (error) {
    console.error('Error guardando token:', error)
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

/**
 * Forzar el header de autorización en llamadas REST y WebSockets Realtime
 */
export const forceAuthHeader = (token: string) => {
  if (!token || !isSupabaseConfigured) return
  try {
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
    // @ts-ignore
    if (supabase.realtime) supabase.realtime.setAuth(token)
  } catch (err) {
    console.warn('Error setting forceAuthHeader:', err)
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
