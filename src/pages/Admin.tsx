import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { getTenantSettings } from '@/config/tenantConfig'
import { 
  Users, 
  Smartphone, 
  FileText, 
  Mail,
  ShieldCheck,
  LogOut,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import DeviceApprovalPanel from '@/components/admin/DeviceApprovalPanel'
import UsersManagement from '@/components/admin/UsersManagement'
import AuditLogsPanel from '@/components/admin/AuditLogsPanel'
import EventInvitationSettings from '@/components/admin/EventInvitationSettings'

type AdminTab = 'users' | 'devices' | 'logs' | 'settings'

export default function Admin() {
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { canManageUsers, canViewLogs } = usePermissions()
  const tenant = getTenantSettings()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as AdminTab) || 'users'
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab)

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'capitan') {
    return <Navigate to="/pos" replace />
  }

  const tabs = [
    { id: 'users' as AdminTab, label: '👥 Usuarios & Accesos', icon: Users, enabled: canManageUsers },
    { id: 'devices' as AdminTab, label: '📱 Dispositivos Autorizados', icon: Smartphone, enabled: true },
    { id: 'logs' as AdminTab, label: '📑 Logs de Auditoría', icon: FileText, enabled: canViewLogs },
    { id: 'settings' as AdminTab, label: '✉️ Invitaciones de Personal', icon: Mail, enabled: true },
  ]

  const enabledTabs = tabs.filter(tab => tab.enabled)
  const selectedTab = enabledTabs.some(tab => tab.id === activeTab)
    ? activeTab
    : enabledTabs[0]?.id || 'users'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 select-none relative overflow-x-hidden">
      {/* Resplandor Ambiental de Fondo (Mismo estilo que POS y Reportes) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-slate-900/50 rounded-full blur-3xl" />
      </div>

      {/* Header Banner F&B */}
      <header className="relative bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border-b border-teal-500/20 px-4 py-6 overflow-hidden shadow-2xl z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-1">
              <Sparkles size={14} className="text-amber-400" />
              <span>Centro de Control & Seguridad · {tenant.clientName}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <img
                src={tenant.logoUrl}
                alt={tenant.clientName}
                className="h-14 md:h-16 w-auto object-contain rounded-2xl border border-amber-500/30 shadow-xl shadow-amber-500/10"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Panel de Administración</h1>
                <p className="text-xs md:text-sm text-teal-300 font-semibold">{tenant.clientTagline} · Gestión de Usuarios & Auditoría</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-300">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Sesión: {currentUser?.username} ({currentUser?.role})</span>
            </div>

            <button 
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition-all text-xs font-black shadow-md active:scale-95"
            >
              <LogOut size={15} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* Navegación por Pestañas */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {enabledTabs.map(tab => {
            const isSelected = selectedTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 scale-105 border border-amber-300/40'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="animate-fadeIn">
          {selectedTab === 'users' && <UsersManagement />}
          {selectedTab === 'devices' && <DeviceApprovalPanel />}
          {selectedTab === 'logs' && <AuditLogsPanel />}
          {selectedTab === 'settings' && <EventInvitationSettings />}
        </div>
      </main>
    </div>
  )
}