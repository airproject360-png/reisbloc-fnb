// Configuración de Clip
export const CLIP_CONFIG = {
  // Cambiar por tus credenciales reales
  apiKey: import.meta.env.VITE_CLIP_API_KEY || 'test_key',
  merchantId: import.meta.env.VITE_CLIP_MERCHANT_ID || 'test_merchant',
  baseUrl: import.meta.env.VITE_CLIP_BASE_URL || 'https://api.clip.mx/v1',
};

// Configuración de aplicación
export const APP_CONFIG = {
  EVENT_MODE: true,
  EVENT_FEATURES: {
    POS: true,
    TABLES: true,
    ADMIN: true,
    INVENTORY: true,
    REPORTS: true,
    CLOSING: true,
  },

  // Tiempo de bloqueo para eliminar productos (en minutos)
  PRODUCT_DELETE_TIMEOUT: 5,
  DEFAULT_TIP_PERCENTAGE: 15, // Propina sugerida por defecto

  // Roles y permisos
  ROLES: {
    ADMIN: 'admin',
    CAPITAN: 'capitan',
    COCINA: 'cocina',
    BAR: 'bar',
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
    PIN_INVALID: 'PIN incorrecto',
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
