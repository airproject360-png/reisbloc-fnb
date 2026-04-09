import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import { mapAuthUserToAppUser, resolveCurrentOrganizationId } from '@/services/authService'
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

      const organizationId = await resolveCurrentOrganizationId(session.user)
      const baseUser = mapAuthUserToAppUser(session.user)
      const mappedUser = {
        ...baseUser,
        organizationId: organizationId || baseUser.organizationId,
      }
      setCurrentUser(mappedUser)
      setAuthenticated(true)

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