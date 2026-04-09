import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ShieldCheck, AlertCircle } from 'lucide-react'

/**
 * Login Page (Evento)
 *
 * Esta versión usa Google OAuth como método principal.
 */

function Login() {
  const { loginWithGoogle, loading, error } = useAuth()
  const [searchParams] = useSearchParams()
  const [uiError, setUiError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setUiError('No se pudo completar la autenticación con Google. Intenta de nuevo.')
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle()
    if (!result.success) {
      setUiError(result.error || 'No se pudo iniciar sesión con Google')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(24,33,46,0.1),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.12),transparent_24%),linear-gradient(180deg,rgba(247,246,242,1),rgba(242,239,232,1))] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl surface-warm p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Reisbloc Evento</h1>
            <p className="text-sm text-slate-500">Acceso con Google OAuth</p>
          </div>
        </div>

        {(uiError || error) && (
          <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{uiError || error}</span>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-[color:var(--primary)] hover:bg-[color:var(--primary-hover)] text-white font-bold flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-xs font-black bg-white/10">G</span>
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Si aún no configuraste Google en Supabase, verás un error hasta completar esa configuración.
        </p>
      </div>
    </div>
  )
}

export default Login