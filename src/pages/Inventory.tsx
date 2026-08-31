import { Navigate } from 'react-router-dom'
import { Package, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { getTenantSettings } from '@/config/tenantConfig'
import InventoryManagement from '@/components/admin/InventoryManagement'

export default function Inventory() {
  const { currentUser } = useAppStore()
  const tenant = getTenantSettings()

  if (!['admin', 'supervisor', 'cocina', 'cocinero', 'capitan'].includes(currentUser?.role || '')) {
    return <Navigate to="/pos" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 select-none relative overflow-x-hidden">
      {/* Resplandor Ambiental de Fondo */}
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
              <span>Gestión de Insumos & Recetas · {tenant.clientName}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <img
                src={tenant.logoUrl}
                alt={tenant.clientName}
                className="h-14 md:h-16 w-auto object-contain rounded-2xl border border-amber-500/30 shadow-xl shadow-amber-500/10"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Inventario & Escandallos</h1>
                <p className="text-xs md:text-sm text-teal-300 font-semibold">{tenant.clientTagline} · Stock, Materias Primas & Menú</p>
              </div>
            </div>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl">
            <Package size={28} />
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 mt-6">
        <InventoryManagement />
      </div>
    </div>
  )
}
