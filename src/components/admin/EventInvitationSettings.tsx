import { FormEvent, useEffect, useState } from 'react'
import logger from '@/utils/logger'
import { inviteUserToEvento, type EventInviteRole } from '@/services/invitationService'
import supabaseService from '@/services/supabaseService'
import { Mail, UserPlus, ShieldCheck } from 'lucide-react'
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
      setErrorMessage('Ingresa un correo valido')
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
        `Invitacion enviada a ${result.email}. Expira: ${new Date(result.expiresAt).toLocaleString('es-MX')}. Organización: ${result.organization.name}`
      )
      setEmail('')
      logger.info('admin-invite', 'Invitacion enviada correctamente', result)
      const logs = await supabaseService.getAuditLogs(50)
      setInviteHistory(logs.filter((log) => log.action === 'INVITE_SENT' || log.action === 'INVITE_BLOCKED'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar invitacion'
      setErrorMessage(message)
      logger.error('admin-invite', 'Error enviando invitacion', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
          <UserPlus size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invitar Usuario a Evento</h2>
          <p className="text-sm text-gray-600">
            Crea invitacion por correo con expiracion y alta en auth.users, vinculando el usuario a la organizacion Evento.
          </p>
        </div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
        <label className="md:col-span-2 flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700">Correo</span>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@correo.com"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700">Rol</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as EventInviteRole)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700">Expira (horas)</span>
          <input
            type="number"
            min={1}
            max={168}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Math.max(1, Number(e.target.value) || 48))}
            className="px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <div className="md:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            <ShieldCheck size={18} />
              {loading ? 'Enviando…' : 'Enviar Invitacion'}
          </button>

            {resultMessage && (
              <p className="text-sm text-emerald-700" aria-live="polite" role="status">
                {resultMessage}
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-700" aria-live="polite" role="status">
                {errorMessage}
              </p>
            )}
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-slate-900">Historial de invitaciones</h3>
            <p className="text-sm text-slate-600">Los últimos envíos y bloqueos quedan aquí, no solo en los logs del servidor.</p>
          </div>
          {historyLoading && <span className="text-sm text-slate-500">Cargando historial…</span>}
        </div>

        {inviteHistory.length === 0 && !historyLoading ? (
          <div className="text-sm text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 p-4">
            No hay invitaciones registradas todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {inviteHistory.map((log) => {
              const blocked = log.action === 'INVITE_BLOCKED'
              const details = log.newValue as { email?: string; role?: string; reason?: string; blocked?: boolean } | undefined

              return (
                <div
                  key={log.id}
                  className={`rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                    blocked ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div>
                    <p className={`font-semibold ${blocked ? 'text-red-900' : 'text-emerald-900'}`}>
                      {blocked ? 'Invitación bloqueada' : 'Invitación enviada'}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      {details?.email || log.entityId} · Rol: {details?.role || 'N/D'}
                    </p>
                    {details?.reason && <p className="text-sm text-slate-600 mt-1">Motivo: {details.reason}</p>}
                  </div>
                  <div className="text-sm text-slate-500 md:text-right">
                    <p>{new Date(log.timestamp).toLocaleString('es-MX')}</p>
                    {log.ipAddress && <p>IP: {log.ipAddress}</p>}
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
