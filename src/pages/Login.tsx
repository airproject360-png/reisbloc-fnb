import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/appStore'
import { Utensils, AlertCircle, KeyRound, ArrowRight } from 'lucide-react'
import { DEMO_ADMIN_USER } from '@/services/demoSeedService'

function Login() {
  const navigate = useNavigate()
  const { loginWithGoogle, loading, error } = useAuth()
  const { setCurrentUser, setAuthenticated } = useAppStore()
  const [searchParams] = useSearchParams()
  const [uiError, setUiError] = useState<string | null>(null)
  const [pin, setPin] = useState('')

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

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) return

    // Acceso instantáneo con PIN en Demo / Producción
    const adminUser = {
      ...DEMO_ADMIN_USER,
      pin: pin
    }
    setCurrentUser(adminUser)
    setAuthenticated(true)
    navigate('/pos', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(24,33,46,0.1),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.12),transparent_24%),linear-gradient(180deg,rgba(15,23,42,1),rgba(30,41,59,1))] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/20 font-black">
            <Utensils size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Reisbloc F&B</h1>
            <p className="text-xs text-slate-400">Restaurante, Café & Servicio para Llevar</p>
          </div>
        </div>

        {(uiError || error) && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/40 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{uiError || error}</span>
          </div>
        )}

        {/* Formulario PIN Rápido */}
        <form onSubmit={handlePinLogin} className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-400">Acceso Rápido por PIN</label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-3 text-slate-500" size={18} />
            <input
              type="password"
              placeholder="Ingresa tu PIN (ej. 1234)"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-900/30"
          >
            <span>Entrar con PIN</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-500">o continuar con</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Botón Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-xs font-black bg-white/10">G</span>
          {loading ? 'Conectando...' : 'Iniciar Sesión con Google'}
        </button>
      </div>
    </div>
  )
}

export default Login