import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import { authLogout, resolveAuthorizedAppUser } from '@/services/authService'
import supabaseService from '@/services/supabaseService'
import logger from '@/utils/logger'

export const AuthCallback = () => {
  const navigate = useNavigate()
  const { setCurrentUser, setAuthenticated } = useAppStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      
      if (error) {
        logger.error('auth', 'Error en el callback de autenticación', error)
        navigate('/login?error=auth_failed')
        return
      }

      if (!session?.user) {
        navigate('/login?error=auth_failed')
        return
      }

      const authorizedUser = await resolveAuthorizedAppUser(session.user)
      if (!authorizedUser) {
        await authLogout()
        logger.warn('auth', 'OAuth bloqueado: usuario no invitado/no activo')
        navigate('/login?error=not_invited', { replace: true })
        return
      }

      setCurrentUser(authorizedUser)
      setAuthenticated(true)

      await supabaseService.registerLoginSession({
        userId: authorizedUser.id,
        organizationId: authorizedUser.organizationId,
        authMethod: 'google_oauth',
      })

      // Si llegamos aquí, la sesión es válida
      logger.info('auth', 'Sesión social establecida correctamente')
      navigate('/pos', { replace: true })
    }

    handleAuthCallback()
  }, [navigate, setAuthenticated, setCurrentUser])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="ml-4">Verificando credenciales...</p>
    </div>
  )
}