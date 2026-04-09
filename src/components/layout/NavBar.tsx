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
  LogOut,
  User,
  Eye,
  Maximize,
  Minimize
} from 'lucide-react'

export default function NavBar() {
  const location = useLocation()
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { isReadOnly, currentRole } = usePermissions()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supportsFullscreen, setSupportsFullscreen] = useState(true)
  
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
    { path: '/pos', label: 'POS', icon: ShoppingCart, roles: ['admin', 'supervisor', 'capitan'] },
    { path: '/tables', label: 'Cuentas', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'capitan'] },
    { path: '/inventory', label: 'Inventario', icon: Package, roles: ['admin', 'supervisor'] },
    { path: '/reports', label: 'Reportes', icon: BarChart3, roles: ['admin', 'supervisor'] },
    { path: '/closing', label: 'Cierre', icon: DollarSign, roles: ['admin'] },
    { path: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin'] },
  ].filter(item => {
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
          {/* Logo / Brand - Marca Blanca y Premium */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-slate-200 via-teal-300 to-emerald-400 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg shadow-teal-500/15 ring-1 ring-white/20 text-slate-950">
              {currentUser?.businessName?.[0] || 'R'}
            </div>
            <h1 className="font-black text-sm sm:text-lg tracking-tighter hidden xs:block bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-teal-200">
              {currentUser?.businessName || 'REISBLOC F&B'}
            </h1>
          </div>

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
    </nav>
  )
}
