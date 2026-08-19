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


// Variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_PROJECT_REF') && 
  !supabaseUrl.includes('missing-env-vars')
)

if (!isSupabaseConfigured) {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.info('ℹ️ Reisbloc F&B en Modo Local/IndexedDB (Sin credenciales remotas de Supabase en .env.local).')
  }
}

// Evitar crash si faltan variables (usar placeholder para que la app cargue y muestre error en consola)
const validUrl = isSupabaseConfigured ? supabaseUrl : 'https://missing-env-vars.supabase.co'
const validKey = isSupabaseConfigured ? supabaseAnonKey : 'missing-key'

// Cliente principal de Supabase
export const supabase = createClient(validUrl, validKey, {
  auth: {
    // IMPORTANTE: Usamos localStorage para Web (Vercel) en lugar de Capacitor Preferences
    storage: window.localStorage,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: true,
    detectSessionInUrl: isSupabaseConfigured
  }
})

/**
 * Helper para guardar el token manualmente si es necesario.
 * En web usamos localStorage estándar.
 */
export const setAuthToken = async (token: string) => {
  try {
    window.localStorage.setItem('sb-access-token', token)
    if (isSupabaseConfigured) {
      await supabase.auth.setSession({ access_token: token, refresh_token: token })
    }
  } catch (error) {
    console.error('Error guardando token:', error)
  }
}

export const getAuthToken = async (): Promise<string | null> => {
  return window.localStorage.getItem('sb-access-token')
}

export const removeAuthToken = async () => {
  window.localStorage.removeItem('sb-access-token')
}

/**
 * HACK: Forzar el header de autorización cuando setSession falla
 * (necesario para usuarios virtuales que no existen en auth.users)
 */
export const forceAuthHeader = (token: string) => {
  if (!token || !isSupabaseConfigured) return
  // @ts-ignore - Acceso a propiedad interna para inyectar header
  if (supabase.rest) supabase.rest.headers['Authorization'] = `Bearer ${token}`
  // @ts-ignore - Acceso a propiedad interna para Realtime
  if (supabase.realtime) supabase.realtime.setAuth(token)
}

// Feature flags para Supabase (Requerido por databaseService)
export const SUPABASE_FEATURES = {
  DATABASE_ENABLED: isSupabaseConfigured,
  AUTH_ENABLED: isSupabaseConfigured,
  REALTIME_ENABLED: isSupabaseConfigured,
  STORAGE_ENABLED: isSupabaseConfigured,
  EDGE_FUNCTIONS_ENABLED: isSupabaseConfigured
}

