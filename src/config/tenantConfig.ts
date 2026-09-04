/**
 * Tenant Configuration & Isolation Service
 * Reisbloc F&B Multi-Tenant Manager
 */

import { APP_CONFIG } from './constants'

export const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'
export const DEFAULT_DEMO_ORG_ID = 'cb86de9f-48b9-4680-b6bc-6da0a15a98fa'

export interface TenantSettings {
  isLocalito: boolean
  enableTips: boolean
  enableDemoMode: boolean
  clientName: string
  clientTagline: string
  logoUrl: string
  organizationId: string
}

/**
 * Detecta de forma estricta y reactiva si el tenant actual es LOCALITO.
 * Solo es true si el dominio incluye 'localito', el usuario/org pertenece a Localito
 * o las variables de entorno lo indican explícitamente.
 */
export function isLocalitoTenant(): boolean {
  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase()
    if (host.includes('localito')) return true

    try {
      const persisted = localStorage.getItem('app-store')
      if (persisted) {
        const parsed = JSON.parse(persisted)
        if (parsed?.state?.currentUser?.organizationId === LOCALITO_ORG_ID) {
          return true
        }
      }
      const storedOrg = localStorage.getItem('reisbloc_org_id')
      if (storedOrg === LOCALITO_ORG_ID) {
        return true
      }
    } catch {
      // Ignorar errores en private mode o parses inválidos
    }
  }

  // Variables de entorno explícitas
  const envOrg = import.meta.env.VITE_EVENT_ORGANIZATION_ID
  if (envOrg === LOCALITO_ORG_ID) return true

  const envClient = import.meta.env.VITE_CLIENT_NAME
  if (envClient && envClient.toUpperCase().includes('LOCALITO')) return true

  const envSubdomain = import.meta.env.VITE_CLIENT_SUBDOMAIN
  if (envSubdomain && envSubdomain.toLowerCase().includes('localito')) return true

  return false
}

/**
 * Retorna la configuración y reglas de negocio específicas del tenant activo
 */
export function getTenantSettings(): TenantSettings {
  const isLocalito = isLocalitoTenant()

  if (isLocalito) {
    return {
      isLocalito: true,
      enableTips: false,      // CERO menciones de propinas en ninguna pantalla
      enableDemoMode: false,  // CERO datos demo ni botones demo
      clientName: 'LOCALITO',
      clientTagline: 'GUISOS & BARRA FRÍA',
      logoUrl: '/logo_localito.jpg',
      organizationId: LOCALITO_ORG_ID,
    }
  }

  // Tenant Genérico / Otros Restaurantes de Reisbloc F&B
  return {
    isLocalito: false,
    enableTips: true,
    enableDemoMode: true,
    clientName: APP_CONFIG.CLIENT_NAME || 'REISBLOC RESTAURANTE',
    clientTagline: APP_CONFIG.CLIENT_TAGLINE || 'SISTEMA POS',
    logoUrl: APP_CONFIG.LOGO_URL || '/icon.svg',
    organizationId: APP_CONFIG.ORGANIZATION_ID || DEFAULT_DEMO_ORG_ID,
  }
}
