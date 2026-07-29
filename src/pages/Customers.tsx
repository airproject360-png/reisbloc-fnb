import { useState } from 'react'
import { Users, Search, Plus, Star, Gift, Phone, Mail, Award, History, Heart } from 'lucide-react'

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  loyaltyPoints: number
  totalVisits: number
  totalSpent: number
  favoriteItems: string[]
  allergiesOrPreferences?: string
  lastVisit: string
}

const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Carlos Mendoza',
    phone: '984 123 4567',
    email: 'carlos.mendoza@email.com',
    loyaltyPoints: 340,
    totalVisits: 14,
    totalSpent: 4850,
    favoriteItems: ['Margarita Artesanal', 'Ceviche Mixto'],
    allergiesOrPreferences: 'Prefiere mesa al aire libre / Sin cilantro',
    lastVisit: '2026-07-26'
  },
  {
    id: 'cust-2',
    name: 'Sofia Rodríguez',
    phone: '984 987 6543',
    email: 'sofia.r@email.com',
    loyaltyPoints: 520,
    totalVisits: 22,
    totalSpent: 8200,
    favoriteItems: ['Espresso Doble', 'Cheesecake de Frutos Rojos', 'Carajillo'],
    allergiesOrPreferences: 'Leche de Almendra',
    lastVisit: '2026-07-28'
  }
]

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    allergiesOrPreferences: ''
  })

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomer.name || !newCustomer.phone) return

    const customer: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email || undefined,
      loyaltyPoints: 50, // Puntos de bienvenida
      totalVisits: 1,
      totalSpent: 0,
      favoriteItems: [],
      allergiesOrPreferences: newCustomer.allergiesOrPreferences || undefined,
      lastVisit: new Date().toISOString().split('T')[0]
    }

    setCustomers([customer, ...customers])
    setNewCustomer({ name: '', phone: '', email: '', allergiesOrPreferences: '' })
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Users className="text-teal-400" size={32} />
            Gestión de Clientes & Puntos F&B
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Fidelización de comensales, historial de consumo y preferencias gastronómicas
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      {/* Bar de búsqueda */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">{customer.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                    <Phone size={14} />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                      <Mail size={12} />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold flex items-center gap-1">
                  <Award size={14} />
                  <span>{customer.loyaltyPoints} pts</span>
                </div>
              </div>

              {customer.allergiesOrPreferences && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-950/40 border border-red-900/40 text-red-300 text-xs">
                  <strong>Nota / Preferencias:</strong> {customer.allergiesOrPreferences}
                </div>
              )}

              {customer.favoriteItems.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <Heart size={12} className="text-rose-400" />
                    Platillos / Bebidas Favoritas:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.favoriteItems.map((fav, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">
                        {fav}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <History size={14} />
                <span>{customer.totalVisits} visitas</span>
              </div>
              <div className="font-semibold text-teal-400">
                Total consumido: ${customer.totalSpent.toLocaleString()} MXN
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Registrar Nuevo Cliente</h2>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Alergias / Preferencias</label>
                <textarea
                  rows={2}
                  value={newCustomer.allergiesOrPreferences}
                  onChange={e => setNewCustomer({ ...newCustomer, allergiesOrPreferences: e.target.value })}
                  placeholder="ej. Vegano, Intolerante a la lactosa, mesa preferida..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
