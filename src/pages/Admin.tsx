import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { 
  Users, 
  Smartphone, 
  FileText, 
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react'
import DeviceApprovalPanel from '@/components/admin/DeviceApprovalPanel'
import UsersManagement from '@/components/admin/UsersManagement'
import AuditLogsPanel from '@/components/admin/AuditLogsPanel'
import EventInvitationSettings from '@/components/admin/EventInvitationSettings'

type AdminTab = 'devices' | 'users' | 'logs' | 'settings'

export default function Admin() {
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { canManageUsers, canManageDevices, canViewLogs } = usePermissions()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as AdminTab) || 'devices'
  const [activeTab, setActiveTab] = useState<AdminTab>('devices')

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/pos" replace />
  }

  const tabs = [
    { id: 'devices' as AdminTab, label: 'Dispositivos', icon: Smartphone, enabled: canManageDevices },
    { id: 'users' as AdminTab, label: 'Usuarios', icon: Users, enabled: canManageUsers },
    { id: 'logs' as AdminTab, label: 'Logs de Auditoría', icon: FileText, enabled: canViewLogs },
    { id: 'settings' as AdminTab, label: 'Configuración', icon: Settings, enabled: true },
  ]

  const enabledTabs = tabs.filter(tab => tab.enabled)
  const selectedTab = enabledTabs.some(tab => tab.id === activeTab)
    ? activeTab
    : enabledTabs.some(tab => tab.id === initialTab)
    ? initialTab
    : enabledTabs[0]?.id || 'devices'

  return (
    <div className="page-shell bg-slate-100">
      {/* Background Doodle */}
      <div 
        className="fixed inset-0 z-0 opacity-25 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '420px',
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.1),transparent_30%),radial-gradient(circle_at_top_right,rgba(24,33,46,0.1),transparent_28%),linear-gradient(180deg,rgba(247,246,242,0.92),rgba(242,239,232,1))] z-0 pointer-events-none" />

      <div className="relative z-10">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <header className="page-hero p-6 md:p-8 text-white bg-[linear-gradient(130deg,rgba(24,33,46,0.98),rgba(15,118,110,0.9),rgba(139,111,71,0.82))] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-sm border border-white/15">
              <ShieldCheck size={32} />
            </div>
            <div>
              <p className="section-kicker bg-white/15 text-white border border-white/15">Control center</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">Panel de Administración</h1>
              <p className="text-cyan-50/90 mt-2 max-w-2xl">Gestión completa del sistema con una interfaz más limpia, rápida y consistente.</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-bold backdrop-blur-sm border border-white/10 w-fit"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </header>

        {/* Tabs Navigation */}
        <div className="panel-surface p-2 flex gap-2 overflow-x-auto">
          {enabledTabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedTab === tab.id
                    ? 'bg-gradient-to-r from-slate-900 to-teal-700 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {selectedTab === 'devices' && <DeviceApprovalPanel />}
          {selectedTab === 'users' && <UsersManagement />}
          {selectedTab === 'logs' && <AuditLogsPanel />}
          {selectedTab === 'settings' && <EventInvitationSettings />}
        </div>
      </div>
      </div>
    </div>
  )
}