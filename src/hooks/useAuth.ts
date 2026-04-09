import { useAppStore } from '@/store/appStore'
import { authLogout, authLoginWithGoogle } from '@/services/authService'
import logger from '@/utils/logger'
import { useState } from 'react'

export function useAuth() {
  // Obtenemos el store completo con los nombres CORRECTOS
  const store = useAppStore()
  const user = store.currentUser // ✅ El store usa currentUser, no user
  const isAuthenticated = store.isAuthenticated
  
  // Estados locales para loading y error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logout = async () => {
    try {
      logger.info('auth', 'Iniciando proceso de logout...')
      
      // 1. Limpiar sesión en servidor y local storage
      await authLogout()
      
      // 2. Limpiar usuario y dispositivo en estado global
      store.setCurrentUser(null)
      store.setCurrentDevice(null)
      store.setAuthenticated(false)
      
      logger.info('auth', 'Estado de sesión limpiado correctamente')
    } catch (error) {
      logger.error('auth', 'Error crítico en logout', error)
      // En caso de cualquier error, sacamos al usuario a la fuerza
      window.location.href = '/'
    }
  }

  const loginWithGoogle = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await authLoginWithGoogle()
      if (!result.success) {
        setError(result.error || 'No se pudo iniciar sesión con Google')
      }
      return result
    } catch (err: any) {
      const errorMsg = err?.message || 'Error inesperado al iniciar Google OAuth'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: loginWithGoogle,
    loginWithGoogle,
    logout
  }
}
