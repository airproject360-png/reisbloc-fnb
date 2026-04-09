import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'

interface LoginPayload {
  userId?: string
  pin: string
  deviceId: string
  deviceInfo?: any
  googleToken?: string // ✅ Nuevo: Para 2FA con Google OAuth
}

interface TokenResponse {
  accessToken: string
  userId: string
  userRole: string
  username: string
  organizationId?: string
  deviceStatus?: string
  device?: any
  expiresAt?: number
  expiresIn?: number
  requires2FA?: boolean // ✅ Nuevo
  anomalies?: any // ✅ Nuevo
  sessionId?: string // ✅ Nuevo
}

/**
 * Generar JWT personalizado después de validar PIN
 * Ahora detecta anomalías y requiere 2FA si es necesario
 */
export async function generateAccessToken(payload: LoginPayload): Promise<TokenResponse> {
  try {
    logger.info('auth', '🔐 Iniciando generación de token con seguridad adaptativa')
    
    // Llamar a Edge Function
    const { data, error, status } = await supabase.functions.invoke('generate-access-token', {
      body: {
        userId: payload.userId,
        role: 'anon',
        deviceId: payload.deviceId || 'unknown',
        pin: payload.pin,
        deviceInfo: payload.deviceInfo,
        googleToken: payload.googleToken // Pasar token de Google si está disponible
      }
    })

    // ⚠️ CRÍTICO: Si la Edge Function retorna 403, significa 2FA requerida
    if (status === 403 && data?.requires_2fa) {
      logger.warn('auth', '🔐 2FA Requerida - Anomalía detectada', {
        anomalies: data.anomalies,
        message: data.message
      })
      
      // Lanzar error especial que el componente puede capturar
      const err = new Error(data.message || '2FA requerida')
      ;(err as any).requires2FA = true
      ;(err as any).anomalies = data.anomalies
      ;(err as any).status = 403
      throw err
    }

    // ❌ Error en autenticación
    if (error || !data || !data.access_token) {
      logger.error('auth', 'Error generating token', { error, data, status })
      throw new Error('No se pudo generar token de acceso')
    }

    // ✅ Token generado exitosamente
    const expiresInSeconds = data.expires_in || (24 * 60 * 60)
    const expiresAt = Date.now() + (expiresInSeconds * 1000)

    const tokenData: TokenResponse = {
      accessToken: data.access_token,
      userId: data.user?.id || payload.userId || '',
      userRole: data.user?.role || 'authenticated',
      username: data.user?.name || 'User',
      organizationId: data.user?.org_id,
      deviceStatus: data.device?.status,
      device: data.device,
      sessionId: data.session?.id, // ✅ Nuevo
      requires2FA: data.session?.requires_2fa || false, // ✅ Nuevo
      anomalies: data.session?.anomalies || {}, // ✅ Nuevo
      expiresIn: expiresInSeconds,
      expiresAt
    }

    // Guardar en localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reisbloc_auth_token', JSON.stringify(tokenData))
    }

    logger.info('auth', '✅ Token generado exitosamente', {
      userId: tokenData.userId,
      sessionId: tokenData.sessionId,
      requires2FA: tokenData.requires2FA
    })
    
    return tokenData
  } catch (error) {
    // Re-lanzar errores especiales de 2FA
    if ((error as any).requires2FA) {
      throw error
    }
    
    logger.error('auth', 'Error en generateAccessToken', error)
    throw error
  }
}

/**
 * Obtener token actual del localStorage
 */
export function getStoredToken(): TokenResponse | null {
  try {
    if (typeof localStorage === 'undefined') return null
    
    const stored = localStorage.getItem('reisbloc_auth_token')
    if (!stored) return null

    const token = JSON.parse(stored)
    
    // Verificar que no esté expirado
    if (token.expiresAt && token.expiresAt < Date.now()) {
      localStorage.removeItem('reisbloc_auth_token')
      return null
    }

    return token
  } catch (error) {
    logger.error('auth', 'Error leyendo token almacenado', error)
    return null
  }
}

/**
 * Limpiar token al logout
 */
export function clearAuthToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('reisbloc_auth_token')
  }
}

/**
 * Verificar si el token es válido y está en la sesión
 */
export function isTokenValid(): boolean {
  const token = getStoredToken()
  return !!(token && token.accessToken && token.expiresAt && token.expiresAt > Date.now())
}
