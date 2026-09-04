import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/config/supabase'
import { AlertCircle, ArrowRight, Database, CheckCircle2 } from 'lucide-react'
import { APP_CONFIG } from '@/config/constants'
import { getTenantSettings } from '@/config/tenantConfig'

function Login() {
  const navigate = useNavigate()
  const tenant = getTenantSettings()
  const { loginWithGoogle, loading, error } = useAuth()
  const { setCurrentUser, setAuthenticated } = useAppStore()
  const [searchParams] = useSearchParams()
  const [uiError, setUiError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)

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


  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      setUiError('Ingresa un correo electrónico válido')
      return
    }

    if (!isSupabaseConfigured) {
      setUiError('La autenticación en la nube requiere configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
      return
    }

    setIsSendingMagicLink(true)
    setUiError(null)
    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (error) {
        throw error
      }

      setMagicLinkSent(true)
    } catch (err: any) {
      setUiError(err?.message || 'Error al enviar enlace de verificación')
    } finally {
      setIsSendingMagicLink(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(24,33,46,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.18),transparent_24%),linear-gradient(180deg,rgba(15,23,42,1),rgba(30,41,59,1))] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow decorative background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          {tenant.logoUrl ? (
            <img 
              src={tenant.logoUrl} 
              alt={tenant.clientName} 
              className="w-full max-w-[280px] h-auto object-contain rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10"
            />
          ) : (
            <h1 className="text-2xl font-black text-white">{tenant.clientName}</h1>
          )}
          <p className="text-xs text-amber-400 font-extrabold tracking-widest uppercase">
            {tenant.isLocalito ? 'Sistema POS, Guisos & Barra Fría' : `${tenant.clientName} · ${tenant.clientTagline}`}
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

        {/* Botón Google OAuth Principal */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl border text-white font-bold text-sm flex items-center justify-center gap-3 transition-all ${
              isSupabaseConfigured
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 border-teal-500/30 shadow-lg shadow-teal-900/30'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 cursor-pointer'
            }`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs font-black bg-white/20">G</span>
            {loading ? 'Conectando con Google...' : 'Iniciar Sesión con Google'}
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-500 font-semibold">o con Invitación por Correo</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Formulario Invitación por Correo / Token de Verificación */}
        {magicLinkSent ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs space-y-2 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
            <p className="font-bold text-sm text-white">¡Enlace de verificación enviado!</p>
            <p className="text-slate-300">
              Revisa tu correo <strong className="text-emerald-300">{inviteEmail}</strong> y haz clic en el enlace seguro de acceso.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="mt-2 text-[11px] text-teal-400 underline font-bold"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLinkLogin} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Verificar Acceso por Enlace Seguro (Token)
            </label>
            
            <div className="relative">
              <input
                type="email"
                placeholder="Ingresa tu correo de invitado"
                value={inviteEmail}
                onChange={e => {
                  setInviteEmail(e.target.value)
                  setUiError(null)
                }}
                className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSendingMagicLink}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <span>{isSendingMagicLink ? 'Enviando...' : 'Enviar Token / Enlace de Acceso'}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

      </div>
    </div>
  )
}

export default Login