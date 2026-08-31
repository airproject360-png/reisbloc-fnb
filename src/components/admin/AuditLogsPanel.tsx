import { useState, useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { AuditLog } from '@/types/index'
import supabaseService from '@/services/supabaseService'
import logger from '@/utils/logger'
import { 
  FileText, 
  Filter, 
  User, 
  Search, 
  AlertCircle, 
  RefreshCw,
  Calendar,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AuditLogsPanel() {
  const { canViewLogs, isReadOnly } = usePermissions()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    action: 'all',
    entityType: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await supabaseService.getAuditLogs()
      setLogs(data || [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los logs')
      logger.error('audit-panel', 'Error loading logs', error as any)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter.action !== 'all' && log.action !== filter.action) return false
    if (filter.entityType !== 'all' && log.entityType !== filter.entityType) return false
    if (filter.search && !JSON.stringify(log).toLowerCase().includes(filter.search.toLowerCase())) return false
    const logDate = new Date(log.timestamp || (log as any).created_at || Date.now())
    if (filter.dateFrom && logDate < new Date(filter.dateFrom)) return false
    if (filter.dateTo && logDate > new Date(filter.dateTo)) return false
    return true
  })

  const actionStyles: Record<string, { label: string; badge: string }> = {
    LOGIN_SUCCESS: { label: 'Inicio de Sesión', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    LOGIN_FAILED: { label: 'Login Fallido', badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    LOGOUT: { label: 'Cierre de Sesión', badge: 'text-slate-400 bg-slate-800 border-slate-700' },
    PRODUCT_CREATED: { label: 'Platillo / Receta Creada', badge: 'text-teal-300 bg-teal-500/10 border-teal-500/30' },
    PRODUCT_UPDATED: { label: 'Platillo / Receta Editada', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    PRODUCT_DELETED: { label: 'Platillo / Receta Archivada', badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    INVENTORY_CHANGE: { label: 'Ajuste de Stock / Insumo', badge: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
    USER_CREATED: { label: 'Nuevo Usuario Registrado', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    USER_MODIFIED: { label: 'Usuario Modificado', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    USER_DELETED: { label: 'Usuario Desactivado', badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    INVITE_SENT: { label: 'Invitación Enviada', badge: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
    INVITE_BLOCKED: { label: 'Invitación Bloqueada', badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    VIEW_REPORT: { label: 'Consulta de Reporte', badge: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
    SALE_COMPLETED: { label: 'Comanda Cobrada', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    DELETE_PRODUCT_FROM_ORDER: { label: 'Platillo Cancelado de Comanda', badge: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  }

  if (!canViewLogs) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl text-center py-16 p-6">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Acceso Restringido</h3>
        <p className="text-slate-400 text-xs">No cuentas con los permisos requeridos para auditar los registros del sistema.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Recargar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            Trazabilidad & Seguridad
          </span>
          <h2 className="text-2xl font-black text-white mt-1">Logs de Auditoría Operativa</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro de eventos, inicios de sesión y modificaciones del sistema · {filteredLogs.length} eventos listados
          </p>
        </div>

        <button
          onClick={() => void loadLogs()}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-teal-400' : 'text-teal-400'} />
          <span>{loading ? 'Actualizando...' : 'Recargar Logs'}</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-teal-400 font-extrabold text-xs uppercase tracking-wider">
          <Filter size={16} />
          <span>Filtros de Búsqueda</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Búsqueda por texto */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="Buscar por usuario, ID o acción..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold placeholder-slate-500 outline-none"
            />
          </div>

          {/* Filtro por Acción */}
          <div>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold outline-none"
            >
              <option value="all">Todas las Acciones</option>
              {Object.keys(actionStyles).map(act => (
                <option key={act} value={act}>
                  {actionStyles[act].label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Entidad */}
          <div>
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold outline-none"
            >
              <option value="all">Todos los Tipos</option>
              <option value="AUTH">Autenticación / Sesiones</option>
              <option value="PRODUCT">Platillos / Menú</option>
              <option value="USER">Usuarios / Personal</option>
              <option value="REPORT">Reportes & Cierres</option>
              <option value="ORDER">Comandas & Mesas</option>
              <option value="SALE">Ventas & Cobros</option>
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold outline-none"
            />
          </div>
        </div>

        {(filter.search || filter.action !== 'all' || filter.entityType !== 'all' || filter.dateFrom) && (
          <div className="pt-2">
            <button
              onClick={() => setFilter({ action: 'all', entityType: 'all', dateFrom: '', dateTo: '', search: '' })}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Eventos */}
      {loadError ? (
        <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
          <p className="font-bold">Error cargando logs de auditoría:</p>
          <p className="mt-1 text-slate-400">{loadError}</p>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-slate-400 font-bold text-xs">
          Consultando registros de auditoría...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 text-slate-500 font-bold text-xs bg-slate-900/60 rounded-3xl border border-slate-800 p-8 space-y-2">
          <FileText size={36} className="mx-auto text-slate-600 mb-2" />
          <p>No hay eventos registrados que coincidan con los criterios de búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const style = actionStyles[log.action] || { label: log.action, badge: 'text-slate-300 bg-slate-800 border-slate-700' }

            return (
              <div
                key={log.id}
                className="bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-xl transition-all space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      por <strong className="text-white">{log.userId || 'Sistema'}</strong>
                    </span>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-bold text-slate-300">
                      {format(new Date(log.timestamp || (log as any).created_at || Date.now()), 'dd MMM yyyy', { locale: es })}
                    </span>
                    <span className="text-slate-500 ml-2 font-mono text-[11px]">
                      {format(new Date(log.timestamp || (log as any).created_at || Date.now()), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 font-bold">Tipo: </span>
                    <span className="font-bold text-teal-300">{log.entityType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">ID: </span>
                    <span className="font-mono text-slate-400 text-[11px] truncate">{log.entityId}</span>
                  </div>
                  {log.deviceId && (
                    <div>
                      <span className="text-slate-500 font-bold">Dispositivo: </span>
                      <span className="font-mono text-slate-400 text-[11px] truncate">{log.deviceId}</span>
                    </div>
                  )}
                </div>

                {/* Desglose de cambios antes / después */}
                {(log.oldValue || log.newValue) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
                    {log.oldValue && (
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                        <p className="font-bold text-rose-400 mb-1">Estado Anterior:</p>
                        <pre className="text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                          {typeof log.oldValue === 'string' ? log.oldValue : JSON.stringify(log.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newValue && (
                      <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/20">
                        <p className="font-bold text-emerald-400 mb-1">Nuevo Estado:</p>
                        <pre className="text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                          {typeof log.newValue === 'string' ? log.newValue : JSON.stringify(log.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
