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
    <nav className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white shadow-2xl sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo / Brand - LOCALITO Guisos & Barra Fría */}
          <Link to="/pos" className="flex items-center gap-2.5 shrink-0 group">
            <img 
              src={APP_CONFIG.LOGO_URL} 
              alt={APP_CONFIG.CLIENT_NAME}
              className="h-9 sm:h-11 w-auto object-contain rounded-lg border border-amber-500/30 shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform"
            />
            <div className="hidden xs:block">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white leading-tight">
                {APP_CONFIG.CLIENT_NAME}
              </h1>
              <p className="text-[9px] font-extrabold text-amber-400 uppercase tracking-widest leading-none">
                {APP_CONFIG.CLIENT_TAGLINE}
              </p>
            </div>
          </Link>


          {/* Navigation Links - UX Fluida */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1 flex-1 justify-center sm:justify-start">
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline text-sm">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Info & Notifications */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Fullscreen Toggle - El toque pro */}
            {supportsFullscreen && (
              <button
                onClick={toggleFullScreen}
                className="flex p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
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

            {/* AI Assistant Button */}
            <button
              onClick={() => setShowAIModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 border border-purple-500/40 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/20"
              title="Asistente IA"
            >
              <Sparkles size={18} className="text-purple-300 animate-pulse" />
              <span className="hidden lg:inline text-xs font-bold">IA F&B</span>
            </button>

            {/* User Badge - Compacto en móvil */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center">
                <User size={14} className="text-gray-300" />
              </div>
              <div className="text-xs">
                <div className="font-bold truncate max-w-[80px] text-gray-100">{currentUser?.username}</div>
                <div className="text-[10px] text-gray-400 capitalize flex items-center gap-1">
                  {isReadOnly && <Eye size={10} />}
                  {currentRole}
                </div>
              </div>
            </div>

            {/* Logout Button - Icono solo en móvil */}
            <button
              onClick={handleLogout}
              className="p-2 sm:px-4 sm:py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/20 hover:border-rose-600 shadow-lg hover:shadow-rose-600/20"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
              <span className="hidden md:inline ml-2 font-bold">Salir</span>
            </button>
          </div>
        </div>
      </div>

      <AIAssistantModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
    </nav>
  )
}
