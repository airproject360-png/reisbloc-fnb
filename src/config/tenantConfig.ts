/**
 * Tenant Configuration & Isolation Service
 * Reisbloc F&B Multi-Tenant Manager
 */

import { APP_CONFIG } from './constants'

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
 * Detecta de forma reactiva si el tenant actual es LOCALITO
 * (a través de subdominio, hostname o variables de entorno)
 */
export function isLocalitoTenant(): boolean {
  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase()
    if (host.includes('localito')) return true
  }
  return (
    (APP_CONFIG.CLIENT_NAME || '').toUpperCase().includes('LOCALITO') ||
    (APP_CONFIG.CLIENT_SUBDOMAIN || '').toLowerCase().includes('localito')
  )
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
      organizationId: '1a70643e-23a3-4224-939e-d7daf381c083',
    }
  }

  // Tenant Genérico / Otros Restaurantes de Reisbloc F&B
  return {
    isLocalito: false,
    enableTips: true,
    enableDemoMode: true,
    clientName: APP_CONFIG.CLIENT_NAME || 'REISBLOC RESTAURANTE',
    clientTagline: APP_CONFIG.CLIENT_TAGLINE || 'SISTEMA POS',
    logoUrl: APP_CONFIG.LOGO_URL || '/logo_localito.jpg',
    organizationId: APP_CONFIG.ORGANIZATION_ID,
  }
}
