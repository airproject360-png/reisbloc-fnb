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
  Utensils,
  Zap
} from 'lucide-react'
import AIAssistantModal from '@/components/ui/AIAssistantModal'
import { usePerformanceMode } from '@/hooks/usePerformanceMode'

export default function NavBar() {
  const location = useLocation()
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { isReadOnly, currentRole } = usePermissions()
  const { isLowPerf, toggleLowPerf } = usePerformanceMode()
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

  // Filtrar items según rol y remover 'clientes' y 'compras'
  const navItems = [
    { path: '/pos', label: 'Menú & Caja', icon: Utensils, roles: ['admin', 'supervisor', 'capitan', 'mesero'], row: 1 },
    { path: '/cuentas', label: 'Cuentas / Mesas', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'capitan', 'mesero'], row: 1 },
    { path: '/kitchen', label: 'Cocina', icon: ChefHat, roles: ['admin', 'supervisor', 'cocina', 'capitan', 'mesero'], row: 1 },
    { path: '/closing', label: 'Cierre de Caja', icon: DollarSign, roles: ['admin'], row: 1 },
    { path: '/inventory', label: 'Inventario & Recetas', icon: Package, roles: ['admin', 'supervisor'], row: 2 },
    { path: '/menu', label: 'Menú Publico QR', icon: Sparkles, roles: ['admin', 'supervisor', 'capitan', 'mesero', 'cocina'], row: 2 },
    { path: '/admin', label: 'Administración', icon: ShieldCheck, roles: ['admin'], row: 2 },
  ].filter(item => {
    if (item.path === '/closing') return APP_CONFIG.EVENT_FEATURES.CLOSING
    return true
  })

  const visibleItems = navItems.filter(item => 
    item.roles.includes(currentUser?.role || '')
  )

  const row1Items = visibleItems.filter(item => item.row === 1)
  const row2Items = visibleItems.filter(item => item.row === 2)

  return (
    <nav className="bg-slate-950 text-white shadow-2xl sticky top-0 z-50 border-b border-slate-800 select-none p-2 sm:p-3 space-y-2">
      {/* FILA 1: Logo + Accesos Operativos Principales + Notificaciones + Logout */}
      <div className="flex items-center justify-between gap-3">
        {/* Logo / Brand - LOCALITO */}
        <Link to="/pos" className="flex items-center gap-2.5 shrink-0 active:scale-95 transition-transform">
          <img 
            src={APP_CONFIG.LOGO_URL} 
            alt={APP_CONFIG.CLIENT_NAME}
            className="h-11 sm:h-12 w-auto object-contain rounded-xl border border-amber-500/40 shadow-lg shadow-amber-500/20"
          />
          <div className="hidden sm:block">
            <h1 className="font-black text-sm sm:text-base tracking-tight text-white leading-tight">
              {APP_CONFIG.CLIENT_NAME}
            </h1>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none">
              {APP_CONFIG.CLIENT_TAGLINE}
            </p>
          </div>
        </Link>

        {/* Fila 1 - Pestañas Principales (POS, Cuentas, Cocina, Cierre) */}
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-center sm:justify-start">
          {row1Items.map(item => {
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black transition-all whitespace-nowrap min-h-[48px] active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/30 border border-amber-300/50 scale-105'
                    : 'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <Icon size={22} className="shrink-0" />
                <span className="text-sm font-extrabold">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Usuario & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative z-50">
            <NotificationCenter 
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 min-h-[48px]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <div className="text-xs">
              <div className="font-extrabold truncate max-w-[80px] text-white">{currentUser?.username}</div>
              <div className="text-[9px] text-teal-400 font-bold capitalize flex items-center gap-1">
                {isReadOnly && <Eye size={10} />}
                {currentRole}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="min-h-[48px] px-3.5 bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl active:scale-95 transition-all border border-rose-500/30 flex items-center justify-center gap-1.5"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline text-xs font-black">Salir</span>
          </button>
        </div>
      </div>

      {/* FILA 2: Inventario + Menú QR + Admin + Asistente IA + Fullscreen */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {row2Items.map(item => {
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap min-h-[42px] text-xs active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon size={18} className="shrink-0 text-amber-400" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botón Modo Tablet Viejita / 60 FPS */}
          <button
            onClick={toggleLowPerf}
            className={`min-h-[42px] px-3 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 ${
              isLowPerf
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title={isLowPerf ? 'Modo Tablet Viejita Activo (60 FPS)' : 'Activar Modo Tablet Viejita (Sin Lag)'}
          >
            <Zap size={16} className={isLowPerf ? 'text-slate-950 fill-slate-950' : 'text-amber-400'} />
            <span className="hidden sm:inline">{isLowPerf ? 'Modo Tablet ⚡' : 'Modo Tablet'}</span>
          </button>

          {/* Asistente IA POS */}
          <button
            onClick={() => setShowAIModal(true)}
            className="min-h-[42px] px-3 bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 border border-purple-500/40 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 text-xs font-black shadow-md"
            title="Asistente IA POS"
          >
            <Sparkles size={16} className="text-purple-400 animate-pulse" />
            <span>IA POS</span>
          </button>

          {/* Fullscreen Touch */}
          {supportsFullscreen && (
            <button
              onClick={toggleFullScreen}
              className="min-h-[42px] px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl active:scale-95 transition-all text-xs font-bold flex items-center gap-1"
              title={isFullscreen ? 'Salir Pantalla Completa' : 'Modo Touch Pantalla Completa'}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              <span className="hidden sm:inline">{isFullscreen ? 'Normal' : 'Touch Screen'}</span>
            </button>
          )}
        </div>
      </div>

      <AIAssistantModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
    </nav>
  )
}



