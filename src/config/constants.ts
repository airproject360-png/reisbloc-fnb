// Configuración de Clip
export const CLIP_CONFIG = {
  apiKey: import.meta.env.VITE_CLIP_API_KEY || '',
  merchantId: import.meta.env.VITE_CLIP_MERCHANT_ID || '',
  baseUrl: import.meta.env.VITE_CLIP_BASE_URL || 'https://api.payclip.com/v1',
};

// Configuración de aplicación y cliente
export const APP_CONFIG = {
  CLIENT_NAME: import.meta.env.VITE_CLIENT_NAME || 'REISBLOC RESTAURANTE',
  CLIENT_TAGLINE: import.meta.env.VITE_CLIENT_TAGLINE || 'SISTEMA POS',
  CLIENT_SUBDOMAIN: import.meta.env.VITE_CLIENT_SUBDOMAIN || '',
  LOGO_URL: import.meta.env.VITE_LOGO_URL || '/icon.svg',
  ORGANIZATION_ID: import.meta.env.VITE_EVENT_ORGANIZATION_ID || import.meta.env.VITE_ORGANIZATION_ID || '',
  ADMIN_EMAILS: (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean),
  FEATURES: {
    POS: true,
    TABLES: true,
    ADMIN: true,
    INVENTORY: true,
    PURCHASES: true,
    REPORTS: true,
    CLOSING: true,
    AI_ASSISTANT: true,
    AUTOMATED_AUDITS: true,
  },
  get EVENT_FEATURES() {
    return this.FEATURES
  },


  // Inteligencia Artificial & Auditoría Integrada
  AI_SETTINGS: {
    ENABLE_UPSELL_RECOMMENDATIONS: true,
    ENABLE_CLOSING_AUDIT: true,
    ENABLE_INVENTORY_PREDICTIONS: true,
    ANOMALY_CONFIDENCE_THRESHOLD: 0.75,
  },

  // Auditoría y Controles Operativos
  AUDIT_THRESHOLDS: {
    MAX_CANCELLATION_MINUTES: 5,
    HIGH_DISCOUNT_PERCENTAGE: 20, // Alerta en descuentos mayores al 20%
    MAX_CASH_DISCREPANCY_MXN: 100, // Alerta en descuadres de caja mayores a $100 MXN
  },

  // Tiempo de bloqueo para eliminar productos (en minutos)
  PRODUCT_DELETE_TIMEOUT: 5,
  DEFAULT_TIP_PERCENTAGE: 15, // Propina sugerida por defecto

  // Roles y permisos
  ROLES: {
    ADMIN: 'admin',
    CAPITAN: 'capitan',
    COCINA: 'cocina',
    SUPERVISOR: 'supervisor',
  },


  // Configuración de mesas
  TABLES: {
    NUMBERED_TABLES: 12,
    HAS_COURTESY_TABLE: true,
    COURTESY_TABLE_NUMBER: 13,
  },

  // Mensajes
  MESSAGES: {
    DEVICE_NOT_REGISTERED: 'Este dispositivo no está registrado. Por favor, solicita autorización del administrador.',
    DEVICE_NOT_APPROVED: 'Tu dispositivo aún no ha sido aprobado. Espera a que el administrador lo valide.',
    SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.',
    PRODUCT_CANNOT_DELETE: 'No puedes eliminar este producto (pasaron más de 5 minutos)',
  },

};

// Configuración de logging
export const LOG_CONFIG = {
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_REMOTE_LOGS: true,
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
};

