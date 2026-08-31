import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { getTenantSettings } from '@/config/tenantConfig'
import { User, UserRole } from '@/types/index'
import { 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Eye, 
  Lock, 
  UserCog, 
  BadgeCheck,
  Search,
  Users,
  Shield,
  ChefHat,
  Smartphone,
  X,
  Sparkles,
} from 'lucide-react'

async function cropImageToSquare(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const size = Math.min(bitmap.width, bitmap.height)
  const offsetX = Math.floor((bitmap.width - size) / 2)
  const offsetY = Math.floor((bitmap.height - size) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo preparar el recorte de la imagen')
  }

  context.drawImage(bitmap, offsetX, offsetY, size, size, 0, 0, size, size)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('No se pudo procesar la imagen'))
          return
        }
        resolve(result)
      },
      file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      0.92
    )
  })

  bitmap.close()

  const extension = blob.type === 'image/png' ? 'png' : 'jpg'
  return new File([blob], `avatar-${Date.now()}.${extension}`, { type: blob.type })
}

export default function UsersManagement() {
  const { users, setUsers, currentUser } = useAppStore()
  const { canManageUsers, isReadOnly } = usePermissions()
  const tenant = getTenantSettings()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadingAvatarUserId, setUploadingAvatarUserId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const loadedUsers = await supabaseService.getAllUsers()
      setUsers(loadedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    if (isReadOnly) return
    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propio usuario')
      return
    }

    try {
      await supabaseService.updateUser(user.id, { active: !user.active })
      await loadUsers()
    } catch (error) {
      console.error('Error toggling user:', error)
      alert('Error al actualizar usuario')
    }
  }

  const handleAvatarUpload = async (user: User, file?: File | null) => {
    if (!canManageUsers || isReadOnly || !file) return

    const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!isValidType) {
      alert('Formato no válido. Usa JPG, PNG o WEBP')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen supera 2MB. Usa una imagen más ligera.')
      return
    }

    setUploadingAvatarUserId(user.id)
    try {
      const croppedFile = await cropImageToSquare(file)
      await supabaseService.updateUserAvatar(user.id, croppedFile, user.username)
      await loadUsers()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('No se pudo actualizar la foto del usuario')
    } finally {
      setUploadingAvatarUserId(null)
    }
  }

  const roleBadges: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: 'Administrador', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    capitan: { label: 'Capitán', color: 'text-teal-300', bg: 'bg-teal-500/10 border-teal-500/30' },
    cocinero: { label: 'Cocinero/a', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    cocina: { label: 'Cocina KDS', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    bar: { label: 'Barra & Bebidas', color: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    mesero: { label: 'Mesero / Salón', color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/30' },
    supervisor: { label: 'Supervisor', color: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/30' },
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      return (
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q)
      )
    })
  }, [users, searchTerm])

  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'capitan').length,
    staff: users.filter(u => u.role === 'mesero' || u.role === 'cocina' || u.role === 'cocinero' || u.role === 'bar').length,
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas de Personal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Colaboradores</span>
            <p className="text-3xl font-black text-teal-400 mt-1">{stats.total}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">Usuarios Activos</span>
            <p className="text-3xl font-black text-emerald-400 mt-1">{stats.active}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">Admins & Capitanes</span>
            <p className="text-3xl font-black text-amber-400 mt-1">{stats.admins}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Shield size={24} />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">Operación & Cocina</span>
            <p className="text-3xl font-black text-cyan-400 mt-1">{stats.staff}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ChefHat size={24} />
          </div>
        </div>
      </div>

      {/* Toolbar: Búsqueda y Botón Crear */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, correo o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-2xl text-xs font-bold text-white placeholder-slate-500 outline-none"
          />
        </div>

        {canManageUsers && !isReadOnly && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>+ Crear Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-300">
          <Eye size={20} className="shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Modo Solo Lectura</p>
            <p className="text-slate-400">No cuentas con permisos para crear o modificar usuarios.</p>
          </div>
        </div>
      )}

      {/* Users Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold text-xs">
          Cargando colaboradores de {tenant.clientName}...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-slate-500 font-bold text-xs bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          No se encontraron usuarios que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map(user => {
            const badge = roleBadges[user.role] || { label: user.role, color: 'text-slate-300', bg: 'bg-slate-800 border-slate-700' }
            const isSelf = user.id === currentUser?.id

            return (
              <div
                key={user.id}
                className="bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:border-teal-500/40 rounded-3xl overflow-hidden shadow-xl transition-all flex flex-col justify-between group"
              >
                {/* User Header */}
                <div className="p-6 border-b border-slate-800/80 relative">
                  <div className="absolute right-4 top-4">
                    {user.active ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={12} />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                        <XCircle size={12} />
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-500/40 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400 font-black text-xl shadow-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {canManageUsers && !isReadOnly && (
                        <label className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-300 hover:text-white cursor-pointer shadow-md transition-colors">
                          <Camera size={12} />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingAvatarUserId === user.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              void handleAvatarUpload(user, file)
                              event.currentTarget.value = ''
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-black text-lg text-white group-hover:text-amber-400 transition-colors leading-tight">
                        {user.username}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${badge.bg} ${badge.color}`}>
                        <BadgeCheck size={11} />
                        {badge.label}
                      </span>
                      {user.email && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{user.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Stats & Devices */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Dispositivos</p>
                      <p className="text-base font-black text-teal-400 mt-0.5">{user.devices?.length || 0}</p>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Permisos</p>
                      <p className="text-base font-black text-amber-400 mt-0.5">{user.role}</p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    {isSelf ? (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                        <Lock size={14} className="text-amber-400" />
                        <span>Sesión Activa</span>
                      </div>
                    ) : (
                      canManageUsers && !isReadOnly && (
                        <>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                              user.active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {user.active ? 'Desactivar' : 'Activar'}
                          </button>

                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all"
                            title="Editar usuario"
                          >
                            <Edit2 size={15} />
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={loadUsers}
        />
      )}
    </div>
  )
}

// Modal para crear usuario
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'capitan' as UserRole,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabaseService.createUser({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        active: true,
      } as any)

      alert('✅ Usuario creado exitosamente')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating user:', error)
      if (error.code === 'PGRST204' || error.message?.includes('duplicate')) {
        alert('❌ El nombre de usuario o correo ya existe')
      } else {
        alert('❌ Error al crear usuario: ' + (error.message || 'Error desconocido'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-teal-400 font-black">
            <UserCog size={20} />
            <span className="text-base">Alta de Nuevo Colaborador</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Nombre de Usuario *</label>
            <input
              type="text"
              placeholder="Ej. JuanPerez, AnaGomez"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-teal-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Correo Electrónico *</label>
            <input
              type="email"
              placeholder="usuario@localito.reisbloc.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Rol & Nivel de Acceso *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-teal-500"
            >
              <option value="mesero">Mesero (Toma de Comandas & Salón)</option>
              <option value="capitan">Capitán (Ajustes, Cuentas & Supervisión)</option>
              <option value="cocinero">Cocinero/a (Guisos, Recetas & Materias Primas)</option>
              <option value="cocina">Cocina (KDS Pantalla de Producción)</option>
              <option value="bar">Bar (Bebidas & Barra Fría)</option>
              <option value="supervisor">Supervisor (Auditoría & Turno)</option>
              <option value="admin">Administrador (Control Total)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black shadow-lg"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para editar usuario
function EditUserModal({ 
  user, 
  onClose, 
  onSuccess 
}: { 
  user: User
  onClose: () => void
  onSuccess: () => void 
}) {
  const [formData, setFormData] = useState({
    username: user.username,
    role: user.role,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabaseService.updateUser(user.id, {
        username: formData.username.trim(),
        role: formData.role,
      } as any)

      alert('✅ Usuario actualizado exitosamente')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert('❌ Error al actualizar usuario: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-black">
            <Edit2 size={20} />
            <span className="text-base">Modificar Colaborador</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Nombre de Usuario *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Rol & Nivel de Acceso *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="mesero">Mesero (Toma de Comandas & Salón)</option>
              <option value="capitan">Capitán (Ajustes, Cuentas & Supervisión)</option>
              <option value="cocinero">Cocinero/a (Guisos, Recetas & Materias Primas)</option>
              <option value="cocina">Cocina (KDS Pantalla de Producción)</option>
              <option value="bar">Bar (Bebidas & Barra Fría)</option>
              <option value="supervisor">Supervisor (Auditoría & Turno)</option>
              <option value="admin">Administrador (Control Total)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Actualizar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
