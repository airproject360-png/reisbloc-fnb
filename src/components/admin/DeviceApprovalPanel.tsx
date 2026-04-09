import { useEffect, useState } from 'react'
import { 
  Smartphone, 
  Check, 
  X, 
  Shield, 
  RefreshCw,
  AlertTriangle,
  Laptop
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
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

  const fetchDevices = async () => {
    setLoading(true)
    try {
      // Asegúrate de que este método exista en tu supabaseService
      // Si no, usa: const { data } = await supabase.from('devices').select('*')
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
          fetchDevices() // Recargar lista si hay cambios
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

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando dispositivos...</div>

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <p className="section-kicker bg-slate-900 text-white w-fit">Device trust</p>
        <h2 className="section-title mt-2">Aprobación de Dispositivos</h2>
        <p className="text-slate-600 mt-2 max-w-2xl">Revisa solicitudes nuevas y administra los dispositivos autorizados desde una vista más clara y compacta.</p>
      </div>

      {/* Sección de Pendientes */}
      {pendingDevices.length > 0 && (
        <div className="panel-surface overflow-hidden">
          <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle size={24} />
                Solicitudes Pendientes
              </h2>
              <p className="text-amber-700 text-sm mt-1">Dispositivos esperando autorización.</p>
            </div>
            <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full font-bold text-sm">
              {pendingDevices.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingDevices.map(device => (
              <div key={device.id} className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">{getDeviceIcon(device.deviceName)}</div>
                  <div>
                    <h3 className="font-bold text-slate-900">{device.deviceName || 'Sin nombre'}</h3>
                    <p className="text-sm text-slate-500">Usuario: {(device as any).userName || device.userId}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1 break-all">ID: {device.id}</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => handleStatusChange(device.id, 'reject')} className="flex-1 md:flex-none px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold flex items-center justify-center gap-2"><X size={18} /> Rechazar</button>
                  <button onClick={() => handleStatusChange(device.id, 'approve')} className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"><Check size={18} /> Aprobar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección de Aprobados */}
      <div className="panel-surface overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={24} className="text-emerald-600" />
            Dispositivos Autorizados
          </h2>
          <button onClick={fetchDevices} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><RefreshCw size={20} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-6 py-3 text-left">Dispositivo</th>
                <th className="px-6 py-3 text-left">Usuario</th>
                <th className="px-6 py-3 text-left">Último Acceso</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvedDevices.map(device => (
                <tr key={device.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400">{getDeviceIcon(device.deviceName)}</div>
                      <div>
                        <p className="font-semibold text-slate-900">{device.deviceName}</p>
                        <p className="text-xs text-slate-500 font-mono">{device.macAddress || 'No MAC'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">{(device as any).userName || 'Desconocido'}</div>
                    <div className="text-xs text-slate-400 font-mono">{device.userId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{timeAgo(device.lastAccess)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleStatusChange(device.id, 'reject')}
                      className="px-3 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-sm font-semibold"
                      title="Revocar"
                    >
                      Revocar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}