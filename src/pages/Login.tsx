import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/appStore'
import { Utensils, AlertCircle, KeyRound, ArrowRight, ShieldCheck, Database, CheckCircle2 } from 'lucide-react'
import { DEMO_ADMIN_USER } from '@/services/demoSeedService'
import { APP_CONFIG } from '@/config/constants'

function Login() {
  const navigate = useNavigate()
  const { loginWithGoogle, loading, error } = useAuth()
  const { setCurrentUser, setAuthenticated } = useAppStore()
  const [searchParams] = useSearchParams()
  const [uiError, setUiError] = useState<string | null>(null)
  const [pin, setPin] = useState('')

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_PROJECT_REF')
  )

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setUiError('No se pudo completar la autenticación con Google. Intenta de nuevo.')
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      setUiError('Google OAuth requiere configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local')
      return
    }
    const result = await loginWithGoogle()
    if (!result.success) {
      setUiError(result.error || 'No se pudo iniciar sesión con Google')
    }
  }

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) {
      setUiError('Por favor ingresa un PIN')
      return
    }

    // Acceso PIN Master (1234, 9999 o cualquier PIN para desarrollo local)
    const masterRole = pin === '9999' ? 'admin' : 'admin'
    const adminUser = {
      ...DEMO_ADMIN_USER,
      username: `Admin Master (${pin})`,
      pin: pin,
      role: masterRole as any,
      businessName: APP_CONFIG.CLIENT_NAME
    }

    setCurrentUser(adminUser)
    setAuthenticated(true)
    navigate('/pos', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(24,33,46,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.18),transparent_24%),linear-gradient(180deg,rgba(15,23,42,1),rgba(30,41,59,1))] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow decorative background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Branding - LOCALITO Guisos & Barra Fría */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img 
            src={APP_CONFIG.LOGO_URL} 
            alt={APP_CONFIG.CLIENT_NAME} 
            className="w-full max-w-[280px] h-auto object-contain rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10"
          />
          <p className="text-xs text-amber-400 font-extrabold tracking-widest uppercase">
            Sistema POS, Guisos & Barra Fría
          </p>
        </div>


        {/* Estado de Configuración DB / Supabase */}
        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
          isSupabaseConfigured 
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
            : 'bg-slate-800/80 border-slate-700 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <Database size={15} className={isSupabaseConfigured ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="font-semibold">
              {isSupabaseConfigured ? 'Supabase Cloud Conectado' : 'Modo DB Local / Offline Activo'}
            </span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {isSupabaseConfigured ? 'Nube' : 'IndexedDB'}
          </span>
        </div>

        {(uiError || error) && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/40 text-red-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{uiError || error}</span>
          </div>
        )}

        {/* Formulario PIN Rápido / Master PIN */}
        <form onSubmit={handlePinLogin} className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-teal-400" />
              Acceso PIN Master / Personal
            </label>
            <span className="text-[11px] text-teal-400 font-extrabold bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-500/30">
              PIN Master: 1234
            </span>
          </div>
          
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-3 text-slate-500" size={18} />
            <input
              type="password"
              placeholder="Ingresa tu PIN Master (ej. 1234)"
              value={pin}
              onChange={e => {
                setPin(e.target.value)
                setUiError(null)
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-900/30"
          >
            <span>Iniciar Sesión con PIN Master</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-500 font-semibold">o con OAuth</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Botón Google OAuth */}
        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl border text-white font-bold text-sm flex items-center justify-center gap-3 transition-all ${
              isSupabaseConfigured
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 shadow-md'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 cursor-pointer'
            }`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-xs font-black bg-white/10">G</span>
            {loading ? 'Conectando con Google...' : 'Iniciar Sesión con Google'}
          </button>
          {!isSupabaseConfigured && (
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              * Para Google OAuth, configura las llaves de Supabase en `.env.local`.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login