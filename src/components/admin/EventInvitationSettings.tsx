import { FormEvent, useEffect, useState } from 'react'
import logger from '@/utils/logger'
import { inviteUserToEvento, type EventInviteRole } from '@/services/invitationService'
import supabaseService from '@/services/supabaseService'
import { getTenantSettings } from '@/config/tenantConfig'
import { Mail, UserPlus, ShieldCheck, Clock, CheckCircle2, XCircle, Send } from 'lucide-react'
import type { AuditLog } from '@/types/index'

export default function EventInvitationSettings() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<EventInviteRole>('supervisor')
  const [expiresInHours, setExpiresInHours] = useState(48)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [inviteHistory, setInviteHistory] = useState<AuditLog[]>([])
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const tenant = getTenantSettings()

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const logs = await supabaseService.getAuditLogs(50)
        setInviteHistory(logs.filter((log) => log.action === 'INVITE_SENT' || log.action === 'INVITE_BLOCKED'))
      } catch (error) {
        logger.error('admin-invite', 'Error cargando historial de invitaciones', error)
      } finally {
        setHistoryLoading(false)
      }
    }

    void loadHistory()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResultMessage(null)
    setErrorMessage(null)

    if (!email.trim()) {
      setErrorMessage('Ingresa un correo electrónico válido')
      return
    }

    setLoading(true)
    try {
      const result = await inviteUserToEvento({
        email: email.trim().toLowerCase(),
        role,
        expiresInHours,
      })

      setResultMessage(
        `✅ Invitación enviada exitosamente a ${result.email}. Expira: ${new Date(result.expiresAt).toLocaleString('es-MX')}.`
      )
      setEmail('')
      logger.info('admin-invite', 'Invitación enviada correctamente', result)
      const logs = await supabaseService.getAuditLogs(50)
      setInviteHistory(logs.filter((log) => log.action === 'INVITE_SENT' || log.action === 'INVITE_BLOCKED'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar invitación'
      setErrorMessage(message)
      logger.error('admin-invite', 'Error enviando invitación', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario de Invitación */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex items-start gap-4 border-b border-slate-800 pb-5">
          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <UserPlus size={24} />
          </div>
          <div>
            <span className="px-3 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-black uppercase tracking-wider">
              Incorporación de Personal · {tenant.clientName}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Invitar Colaborador a la Plataforma</h2>
            <p className="text-xs text-slate-400 mt-1">
              Envía un enlace de invitación temporal por correo para registrar supervisores o administradores vinculados a {tenant.clientName}.
            </p>
          </div>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs" onSubmit={handleSubmit}>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block font-bold text-slate-300">Correo Electrónico del Invitado *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@localito.reisbloc.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold placeholder-slate-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">Rol a Asignar *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EventInviteRole)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold outline-none"
            >
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">Vigencia (Horas) *</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="number"
                min={1}
                max={168}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Math.max(1, Number(e.target.value) || 48))}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl text-white font-bold outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={15} />
              <span>{loading ? 'Enviando invitación...' : 'Enviar Invitación por Correo'}</span>
            </button>

            {resultMessage && (
              <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                {resultMessage}
              </p>
            )}
            {errorMessage && (
              <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
                {errorMessage}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Historial de Invitaciones */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">Historial de Invitaciones Recientes</h3>
            <p className="text-xs text-slate-400">Control de invitaciones enviadas y estados de verificación</p>
          </div>
          {historyLoading && <span className="text-xs text-teal-400 font-bold">Cargando registros...</span>}
        </div>

        {inviteHistory.length === 0 && !historyLoading ? (
          <div className="text-center py-10 text-slate-500 text-xs font-bold bg-slate-950/40 rounded-2xl border border-slate-800">
            No se han registrado invitaciones recientes.
          </div>
        ) : (
          <div className="space-y-3">
            {inviteHistory.map((log) => {
              const blocked = log.action === 'INVITE_BLOCKED'
              const details = log.newValue as { email?: string; role?: string; reason?: string; blocked?: boolean } | undefined

              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                    blocked
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {blocked ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      <span className="font-bold text-xs">
                        {blocked ? 'Invitación Bloqueada' : 'Invitación Enviada'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">
                      {details?.email || log.entityId} · <span className="text-teal-300 font-bold uppercase">Rol: {details?.role || 'N/D'}</span>
                    </p>
                    {details?.reason && <p className="text-[11px] text-slate-400">Motivo: {details.reason}</p>}
                  </div>
                  <div className="text-xs text-slate-400 md:text-right">
                    <p className="font-bold text-slate-300">{new Date(log.timestamp || (log as any).created_at || Date.now()).toLocaleString('es-MX')}</p>
                    {log.ipAddress && <p className="text-[11px] font-mono text-slate-500">IP: {log.ipAddress}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
