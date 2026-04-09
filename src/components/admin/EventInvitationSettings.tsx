import { FormEvent, useState } from 'react'
import logger from '@/utils/logger'
import { inviteUserToEvento, type EventInviteRole } from '@/services/invitationService'
import { Mail, UserPlus, ShieldCheck } from 'lucide-react'

export default function EventInvitationSettings() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<EventInviteRole>('supervisor')
  const [expiresInHours, setExpiresInHours] = useState(48)
  const [loading, setLoading] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
            {loading ? 'Enviando...' : 'Enviar Invitacion'}
          </button>

          {resultMessage && <p className="text-sm text-emerald-700">{resultMessage}</p>}
          {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}
        </div>
      </form>
    </div>
  )
}
