import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import type { Supplier, Purchase } from '@/types/index'
import { Building2, ShoppingBag, Wallet, Loader2, Plus, CalendarDays } from 'lucide-react'

type PurchaseFormState = {
  supplierId: string
  concept: string
  category: string
  amount: string
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other'
  purchaseDate: string
  invoiceFolio: string
  notes: string
}

export default function Purchases() {
  const permissions = usePermissions()
  const canView = permissions.canViewFinancialData
  const isReadOnly = permissions.isReadOnly

  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
    to: new Date().toLocaleDateString('en-CA'),
  })

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    notes: '',
  })

  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>({
    supplierId: '',
    concept: '',
    category: 'insumos',
    amount: '',
    paymentMethod: 'transfer',
    purchaseDate: new Date().toLocaleDateString('en-CA'),
    invoiceFolio: '',
    notes: '',
  })

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
    void loadData()
  }, [dateRange.from, dateRange.to])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const startDate = new Date(`${dateRange.from}T00:00:00`)
      const endDate = new Date(`${dateRange.to}T23:59:59.999`)

      const [suppliersData, purchasesData] = await Promise.all([
        supabaseService.getSuppliers(),
        supabaseService.getPurchasesByDateRange(startDate, endDate),
      ])

      setSuppliers(suppliersData)
      setPurchases(purchasesData)
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar compras/proveedores')
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const totalInvestment = purchases.reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0)
    const categoryMap = new Map<string, number>()
    purchases.forEach((purchase) => {
      const key = purchase.category || 'otros'
      categoryMap.set(key, (categoryMap.get(key) || 0) + Number(purchase.amount || 0))
    })

    const topCategory = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])[0]

    return {
      totalInvestment,
      purchaseCount: purchases.length,
      supplierCount: suppliers.length,
      topCategory: topCategory ? { name: topCategory[0], total: topCategory[1] } : null,
    }
  }, [purchases, suppliers])

  const handleCreateSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isReadOnly) return

    setError(null)
    setSuccess(null)

    if (!supplierForm.name.trim()) {
      setError('El nombre del proveedor es obligatorio')
      return
    }

    try {
      await supabaseService.createSupplier({
        name: supplierForm.name,
        contactName: supplierForm.contactName,
        email: supplierForm.email,
        phone: supplierForm.phone,
        notes: supplierForm.notes,
      })

      setSupplierForm({ name: '', contactName: '', email: '', phone: '', notes: '' })
      setSuccess('Proveedor creado correctamente')
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear el proveedor')
    }
  }

  const handleCreatePurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isReadOnly) return

    setError(null)
    setSuccess(null)

    const amount = Number(purchaseForm.amount)
    if (!purchaseForm.concept.trim()) {
      setError('El concepto de compra es obligatorio')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Captura un monto válido mayor a 0')
      return
    }

    try {
      await supabaseService.createPurchase({
        supplierId: purchaseForm.supplierId || undefined,
        concept: purchaseForm.concept,
        category: purchaseForm.category,
        amount,
        paymentMethod: purchaseForm.paymentMethod,
        purchaseDate: purchaseForm.purchaseDate,
        invoiceFolio: purchaseForm.invoiceFolio,
        notes: purchaseForm.notes,
      })

      setPurchaseForm((prev) => ({
        ...prev,
        supplierId: '',
        concept: '',
        amount: '',
        invoiceFolio: '',
        notes: '',
      }))

      setSuccess('Compra registrada correctamente')
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar la compra')
    }
  }

  if (!canView) {
    return <Navigate to="/pos" replace />
  }

  return (
    <div className="page-shell bg-[color:var(--bg-canvas)] p-6">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-3xl p-8 text-white shadow-xl border border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-sm border border-white/10">
                <ShoppingBag size={34} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Compras y Proveedores</h1>
                <p className="text-cyan-50/85 mt-1">Controla inversión para reportes financieros reales</p>
              </div>
            </div>
            {isReadOnly && <span className="px-3 py-2 rounded-lg bg-white/15 text-sm font-semibold">Solo lectura</span>}
          </div>
        </div>

        <div className="surface-warm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CalendarDays size={18} className="text-teal-700" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="px-4 py-2 border border-slate-300 rounded-lg"
            />
            <span className="text-slate-500">hasta</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="px-4 py-2 border border-slate-300 rounded-lg"
            />
            {loading && (
              <div className="ml-auto text-teal-700 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Cargando…</span>
              </div>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Inversión Total" value={`$${summary.totalInvestment.toFixed(2)}`} icon={Wallet} tone="emerald" />
          <MetricCard title="Compras Registradas" value={String(summary.purchaseCount)} icon={ShoppingBag} tone="slate" />
          <MetricCard title="Proveedores Activos" value={String(summary.supplierCount)} icon={Building2} tone="teal" />
          <MetricCard
            title="Categoría Principal"
            value={summary.topCategory ? `${summary.topCategory.name} ($${summary.topCategory.total.toFixed(0)})` : 'Sin datos'}
            icon={Plus}
            tone="amber"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form className="bg-white rounded-2xl shadow-lg p-6 space-y-4" onSubmit={handleCreateSupplier}>
            <h2 className="text-xl font-bold text-slate-900">Nuevo Proveedor</h2>
            <input
              type="text"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre del proveedor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              disabled={isReadOnly}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={supplierForm.contactName}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, contactName: e.target.value }))}
                placeholder="Contacto"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                disabled={isReadOnly}
              />
              <input
                type="text"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Teléfono"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                disabled={isReadOnly}
              />
            </div>
            <input
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Correo"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              disabled={isReadOnly}
            />
            <textarea
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[88px]"
              disabled={isReadOnly}
            />
            <button
              type="submit"
              disabled={isReadOnly}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              Guardar proveedor
            </button>
          </form>

          <form className="bg-white rounded-2xl shadow-lg p-6 space-y-4" onSubmit={handleCreatePurchase}>
            <h2 className="text-xl font-bold text-slate-900">Registrar Compra</h2>
            <select
              value={purchaseForm.supplierId}
              onChange={(e) => setPurchaseForm((prev) => ({ ...prev, supplierId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              disabled={isReadOnly}
            >
              <option value="">Sin proveedor específico</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={purchaseForm.concept}
              onChange={(e) => setPurchaseForm((prev) => ({ ...prev, concept: e.target.value }))}
              placeholder="Concepto (ej. pescado fresco)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              disabled={isReadOnly}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={purchaseForm.category}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Categoría"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                disabled={isReadOnly}
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={purchaseForm.amount}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Monto"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                disabled={isReadOnly}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={purchaseForm.paymentMethod}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, paymentMethod: e.target.value as PurchaseFormState['paymentMethod'] }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                disabled={isReadOnly}
              >
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otro</option>
              </select>
              <input
                type="date"
                value={purchaseForm.purchaseDate}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                disabled={isReadOnly}
                required
              />
            </div>
            <input
              type="text"
              value={purchaseForm.invoiceFolio}
              onChange={(e) => setPurchaseForm((prev) => ({ ...prev, invoiceFolio: e.target.value }))}
              placeholder="Folio / referencia"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              disabled={isReadOnly}
            />
            <textarea
              value={purchaseForm.notes}
              onChange={(e) => setPurchaseForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[88px]"
              disabled={isReadOnly}
            />
            <button
              type="submit"
              disabled={isReadOnly}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-600 disabled:opacity-50"
            >
              Guardar compra
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Compras Registradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Proveedor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Concepto</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Categoría</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay compras para el período seleccionado</td>
                  </tr>
                )}
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{purchase.purchaseDate.toLocaleDateString('es-MX')}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{purchase.supplierName || 'Sin proveedor'}</td>
                    <td className="px-6 py-4 text-slate-700">{purchase.concept}</td>
                    <td className="px-6 py-4 text-slate-700">{purchase.category}</td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-700">${purchase.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: any
  tone: 'emerald' | 'slate' | 'teal' | 'amber'
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-600 to-teal-700',
    slate: 'from-slate-800 to-slate-600',
    teal: 'from-teal-700 to-cyan-700',
    amber: 'from-amber-600 to-stone-600',
  }

  return (
    <div className={`bg-gradient-to-br ${tones[tone]} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <Icon size={28} className="opacity-35" />
      </div>
    </div>
  )
}
