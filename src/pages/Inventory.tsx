import { Navigate } from 'react-router-dom'
import { Package, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import InventoryManagement from '@/components/admin/InventoryManagement'

export default function Inventory() {
  const { currentUser } = useAppStore()

  if (!['admin', 'supervisor'].includes(currentUser?.role || '')) {
    return <Navigate to="/pos" replace />
  }

  return (
    <div className="min-h-screen relative bg-[#f5f6f2]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(22,163,74,0.12),transparent_45%),radial-gradient(circle_at_85%_12%,rgba(14,116,144,0.14),transparent_40%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.9))]" />
        <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(45deg,rgba(15,23,42,0.04)_0,rgba(15,23,42,0.04)_2px,transparent_2px,transparent_18px)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
        <header className="rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-[linear-gradient(130deg,rgba(15,23,42,0.94),rgba(3,105,161,0.9),rgba(22,163,74,0.82))] text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  <Sparkles size={14} /> Reisbloc Labs
                </p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Inventario Inteligente</h1>
                <p className="text-sm md:text-base text-cyan-50/90 max-w-2xl">
                  Controla stock, disponibilidad e imagen de producto en un solo flujo para celular y tablet.
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center">
                <Package size={30} />
              </div>
            </div>
          </div>
        </header>

        <InventoryManagement />
      </div>
    </div>
  )
}
