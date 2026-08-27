import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/common/NotificationCenter'
import { APP_CONFIG } from '@/config/constants'
import {
  ShoppingCart,
  BarChart3,
  LayoutDashboard,
  DollarSign,
  ShieldCheck,
  Package,
  Building2,
  LogOut,
  User,
  Eye,
  Maximize,
  Minimize,
  ChefHat,
  Wine,
  Users,
  Sparkles,
  Utensils
} from 'lucide-react'
import AIAssistantModal from '@/components/ui/AIAssistantModal'

export default function NavBar() {
  const location = useLocation()
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { isReadOnly, currentRole } = usePermissions()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supportsFullscreen, setSupportsFullscreen] = useState(true)
  const [showAIModal, setShowAIModal] = useState(false)
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications(currentUser?.id || null)

  // Verificar soporte al montar el componente
  useEffect(() => {
    setSupportsFullscreen(!!document.documentElement.requestFullscreen)
  }, [])

  // Lógica de Pantalla Completa (Ideal para tablets y TVs de cocina)
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error al activar pantalla completa: ${e.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // El return condicional debe ir DESPUÉS de todos los hooks
  if (location.pathname === '/login' || !currentUser) {
    return null
  }

  const handleLogout = async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  const navItems = [
    { path: '/pos', label: 'POS', icon: ShoppingCart, roles: ['admin', 'supervisor', 'capitan', 'mesero'] },
    { path: '/menu', label: 'Menú Online (localito.reisbloc.com)', icon: Utensils, roles: ['admin', 'supervisor', 'capitan', 'mesero', 'cocina'] },
    { path: '/tables', label: 'Cuentas', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'capitan', 'mesero'] },
    { path: '/kitchen', label: 'Cocina', icon: ChefHat, roles: ['admin', 'supervisor', 'cocina', 'capitan', 'mesero'] },
    { path: '/customers', label: 'Clientes', icon: Users, roles: ['admin', 'supervisor', 'capitan', 'mesero'] },
    { path: '/inventory', label: 'Inventario', icon: Package, roles: ['admin', 'supervisor'] },
    { path: '/purchases', label: 'Compras', icon: Building2, roles: ['admin', 'supervisor'] },
    { path: '/reports', label: 'Reportes', icon: BarChart3, roles: ['admin', 'supervisor'] },
    { path: '/closing', label: 'Cierre', icon: DollarSign, roles: ['admin'] },
    { path: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin'] },
  ].filter(item => {

    if (item.path === '/purchases') return APP_CONFIG.EVENT_FEATURES.PURCHASES
    if (item.path === '/reports') return APP_CONFIG.EVENT_FEATURES.REPORTS
    if (item.path === '/closing') return APP_CONFIG.EVENT_FEATURES.CLOSING
    return true
  })

  const visibleItems = navItems.filter(item => 
    item.roles.includes(currentUser?.role || '')
  )

  return (
    <nav className="bg-slate-950 text-white shadow-2xl sticky top-0 z-50 border-b border-slate-800 select-none">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-20 sm:h-24 gap-3">
          {/* Logo / Brand - LOCALITO Touch POS */}
          <Link to="/pos" className="flex items-center gap-3 shrink-0 group active:scale-95 transition-transform">
            <img 
              src={APP_CONFIG.LOGO_URL} 
              alt={APP_CONFIG.CLIENT_NAME}
              className="h-12 sm:h-14 w-auto object-contain rounded-xl border border-amber-500/40 shadow-lg shadow-amber-500/20"
            />
            <div className="hidden md:block">
              <h1 className="font-black text-base sm:text-xl tracking-tight text-white leading-tight">
                {APP_CONFIG.CLIENT_NAME}
              </h1>
              <p className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest leading-none">
                {APP_CONFIG.CLIENT_TAGLINE}
              </p>
            </div>
          </Link>

          {/* Navigation Touch Tabs - Botones Grandes para Pantalla Táctil */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 flex-1 justify-center sm:justify-start">
            {visibleItems.map(item => {
              const Icon = item.icon
              const pathOnly = item.path.split('?')[0]
              const isActive =
                location.pathname === pathOnly &&
                (item.path.includes('?')
                  ? location.search === `?${item.path.split('?')[1]}`
                  : !location.search)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl font-black transition-all whitespace-nowrap min-h-[52px] sm:min-h-[58px] active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/30 scale-105 border border-amber-300/50'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  <Icon size={24} className="shrink-0" />
                  <span className="text-sm sm:text-base font-extrabold tracking-wide">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Controles Táctiles Rápidos (Fullscreen, IA, Notificaciones, Salir) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Pantalla Completa POS */}
            {supportsFullscreen && (
              <button
                onClick={toggleFullScreen}
                className="min-w-[50px] min-h-[50px] sm:min-w-[56px] sm:min-h-[56px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-2xl active:scale-95 transition-all shadow-md"
                title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Touch Pantalla Completa'}
              >
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            )}

            <div className="relative z-50">
              <NotificationCenter 
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
              />
            </div>

            {/* Asistente IA POS */}
            <button
              onClick={() => setShowAIModal(true)}
              className="min-h-[50px] sm:min-h-[56px] px-3.5 sm:px-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-900/70 hover:to-indigo-900/70 text-purple-200 border border-purple-500/40 rounded-2xl active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-purple-950/40"
              title="Asistente IA POS"
            >
              <Sparkles size={22} className="text-purple-400 animate-pulse shrink-0" />
              <span className="hidden xl:inline text-xs sm:text-sm font-black">IA POS</span>
            </button>

            {/* Usuario Activo */}
            <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900/80 rounded-2xl border border-slate-800 min-h-[50px] sm:min-h-[56px]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md">
                <User size={16} className="text-white" />
              </div>
              <div className="text-xs">
                <div className="font-extrabold truncate max-w-[90px] text-white">{currentUser?.username}</div>
                <div className="text-[10px] text-teal-400 font-bold capitalize flex items-center gap-1">
                  {isReadOnly && <Eye size={10} />}
                  {currentRole}
                </div>
              </div>
            </div>

            {/* Botón Salir / Logout Táctil */}
            <button
              onClick={handleLogout}
              className="min-w-[50px] min-h-[50px] sm:min-w-[56px] sm:min-h-[56px] px-3.5 sm:px-4 bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white rounded-2xl active:scale-95 transition-all border border-rose-500/30 hover:border-rose-600 shadow-lg flex items-center justify-center gap-2"
              title="Cerrar Sesión"
            >
              <LogOut size={22} />
              <span className="hidden md:inline text-sm font-black">Salir</span>
            </button>
          </div>
        </div>
      </div>

      <AIAssistantModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
    </nav>
  )
}


