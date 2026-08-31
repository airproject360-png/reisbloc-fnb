import { useEffect, useState } from 'react'
import { 
  Smartphone, 
  Check, 
  X, 
  Shield, 
  RefreshCw,
  AlertTriangle,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  Ban
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { getTenantSettings } from '@/config/tenantConfig'
import { Device } from '@/types'
import { supabase } from '@/config/supabase'

// Helper simple para mostrar tiempo relativo
const timeAgo = (date: Date | string) => {
  if (!date) return 'Hace un momento'
  const d = new Date(date)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + " años"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + " meses"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + " días"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + " horas"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + " min"
  return "Hace un momento"
}

export default function DeviceApprovalPanel() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const tenant = getTenantSettings()

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const data = await supabaseService.getAllDevices()
      setDevices(data || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()

    // Suscripción en tiempo real a cambios en dispositivos
    const channel = supabase
      .channel('devices_approval_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          fetchDevices()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleStatusChange = async (deviceId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await supabaseService.approveDevice(deviceId)
      } else {
        await supabaseService.revokeDevice(deviceId)
      }
      await fetchDevices()
    } catch (error) {
      console.error('Error updating device:', error)
      alert('Error al actualizar el dispositivo')
    }
  }

  const getDeviceIcon = (name?: string | null) => {
    const n = (name || '').toLowerCase()
    if (n.includes('mobile') || n.includes('android') || n.includes('iphone')) return <Smartphone size={20} />
    return <Laptop size={20} />
  }

  const pendingDevices = devices.filter(d => !d.isApproved && !d.isRejected)
  const approvedDevices = devices.filter(d => d.isApproved)

  if (loading) return (
    <div className="p-12 text-center text-slate-400 font-bold text-xs">
      Cargando dispositivos autorizados de {tenant.clientName}...
    </div>
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sección de Pendientes */}
      {pendingDevices.length > 0 && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl space-y-0">
          <div className="p-6 bg-amber-500/10 border-b border-amber-500/30 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
                <AlertTriangle size={22} className="text-amber-400" />
                <span>Solicitudes de Dispositivos Pendientes</span>
              </h2>
              <p className="text-slate-300 text-xs mt-1">Terminales móviles o tablets esperando autorización para operar el POS.</p>
            </div>
            <span className="bg-amber-500 text-slate-950 px-3.5 py-1 rounded-full font-black text-xs">
              {pendingDevices.length} por aprobar
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {pendingDevices.map(device => (
              <div key={device.id} className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-2xl">
                    {getDeviceIcon(device.deviceName)}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">{device.deviceName || 'Terminal POS'}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      Usuario Solicitante: <span className="text-teal-300">{(device as any).userName || device.userId}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">ID: {device.id}</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => handleStatusChange(device.id, 'reject')} 
                    className="flex-1 md:flex-none px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <X size={15} />
                    <span>Rechazar</span>
                  </button>
                  <button 
                    onClick={() => handleStatusChange(device.id, 'approve')} 
                    className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Check size={15} />
                    <span>Aprobar Terminal</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección de Aprobados */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-400" />
              <span>Dispositivos Autorizados ({approvedDevices.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Terminales con credenciales activas en {tenant.clientName}</p>
          </div>
          <button 
            onClick={fetchDevices} 
            className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 active:scale-95 transition-all"
            title="Recargar lista"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs font-black uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Dispositivo</th>
                <th className="px-6 py-4">Usuario Asignado</th>
                <th className="px-6 py-4">Último Acceso</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {approvedDevices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-bold text-xs">
                    No hay terminales autorizadas registradas actualmente.
                  </td>
                </tr>
              ) : (
                approvedDevices.map(device => (
                  <tr key={device.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-950 border border-slate-800 text-teal-400 rounded-xl">
                          {getDeviceIcon(device.deviceName)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs sm:text-sm">{device.deviceName || 'Terminal POS'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{device.macAddress || 'ID: ' + device.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-300">
                      <div className="text-white font-black">{(device as any).userName || 'Personal'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">UID: {device.userId.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{timeAgo(device.lastAccess)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleStatusChange(device.id, 'reject')}
                        className="px-3 py-1.5 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ml-auto"
                        title="Revocar acceso a esta terminal"
                      >
                        <Ban size={13} />
                        <span>Revocar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}