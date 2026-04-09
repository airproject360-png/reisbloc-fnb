import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import {
  TrendingUp,
  DollarSign,
  PiggyBank,
  Lightbulb,
  Package,
  Calendar,
  Eye,
  BarChart3,
  Loader,
} from 'lucide-react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ReportTab = 'sales' | 'financial' | 'employees'

export default function Reports() {
  const { currentUser } = useAppStore()
  const permissions = usePermissions()
  const canViewReports = permissions.canViewReports || currentUser?.role === 'capitan'
  const canViewSalesReport = permissions.canViewSalesReport || currentUser?.role === 'capitan'
  const canViewEmployeeMetrics = permissions.canViewEmployeeMetrics || currentUser?.role === 'capitan'
  const isReadOnly = permissions.isReadOnly

  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
    to: new Date().toLocaleDateString('en-CA'),
  })

  const [salesData, setSalesData] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [employeeMetrics, setEmployeeMetrics] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [purchaseMetrics, setPurchaseMetrics] = useState<any>(null)
  const [financialOverview, setFinancialOverview] = useState<any>(null)
  const [weeklyFinancialTrend, setWeeklyFinancialTrend] = useState<any[]>([])

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      loadReports()
    }
  }, [dateRange])

  const loadReports = async () => {
    setLoading(true)
    try {
      // Crear fechas locales explícitas para evitar desfases de zona horaria
      const startDate = new Date(dateRange.from + 'T00:00:00')
      const endDate = new Date(dateRange.to + 'T23:59:59.999')

      // Obtener ventas desde Supabase
      const sales = await supabaseService.getSalesByDateRange(startDate, endDate)

      // Agrupar por día
      const byDay: Record<string, any[]> = {}
      sales.forEach((sale: any) => {
        const date = sale.created_at ? new Date(sale.created_at) : new Date()
        const dayKey = date.toLocaleDateString('en-CA')
        if (!byDay[dayKey]) byDay[dayKey] = []
        byDay[dayKey].push(sale)
      })

      // Chart data por día
      const chartData = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, sales]: [string, any[]]) => ({
          date: new Date(day).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          total: sales.reduce((sum, s: any) => sum + Number(s.total || 0), 0),
          transactions: sales.length,
        }))

      // Usar los nuevos métodos de agregación
      const [topProductsData, employeeMetricsData, metricsData, purchaseMetricsData, purchasesData] = await Promise.all([
        supabaseService.getTopProducts(startDate, endDate, 5),
        supabaseService.getEmployeeMetrics(startDate, endDate),
        supabaseService.getSalesMetrics(startDate, endDate),
        supabaseService.getPurchaseMetrics(startDate, endDate),
        supabaseService.getPurchasesByDateRange(startDate, endDate),
      ])

      const revenue = Number(metricsData?.totalSales || 0)
      const investment = Number(purchaseMetricsData?.totalInvestment || 0)
      const grossProfit = revenue - investment
      const totalTips = Number(metricsData?.totalTips || 0)
      const netProfit = grossProfit - totalTips
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
      const distributableProfit = netProfit > 0 ? netProfit : 0
      const suggestedReinvestment = distributableProfit > 0 ? distributableProfit * 0.4 : 0
      const suggestedPartnerDistribution = distributableProfit > 0 ? distributableProfit * 0.4 : 0
      const suggestedReserve = distributableProfit > 0 ? distributableProfit * 0.2 : 0

      let recommendation = 'Mantener operación actual y seguir monitoreando costos por categoría.'
      if (revenue === 0) {
        recommendation = 'Aún no hay ingresos en el período. Registra ventas y compras para recomendaciones confiables.'
      } else if (netMargin < 8) {
        recommendation = 'Margen bajo. Conviene frenar expansión y renegociar compras/proveedores antes de crecer.'
      } else if (netMargin < 20) {
        recommendation = 'Margen saludable moderado. Reinvertir de forma selectiva en productos de mayor rotación.'
      } else {
        recommendation = 'Margen fuerte. Conviene reinvertir en capacidad e inventario estratégico para aumentar volumen.'
      }

      const toWeekStart = (date: Date) => {
        const copy = new Date(date)
        const day = copy.getDay()
        const diff = day === 0 ? -6 : 1 - day // Monday as week start
        copy.setDate(copy.getDate() + diff)
        copy.setHours(0, 0, 0, 0)
        return copy
      }

      const weeklyMap = new Map<string, { weekStart: Date; revenue: number; investment: number }>()

      sales.forEach((sale: any) => {
        const saleDate = sale.created_at ? new Date(sale.created_at) : new Date()
        const weekStart = toWeekStart(saleDate)
        const key = weekStart.toISOString().split('T')[0]
        const current = weeklyMap.get(key) || { weekStart, revenue: 0, investment: 0 }
        current.revenue += Number(sale.total || 0)
        weeklyMap.set(key, current)
      })

      purchasesData.forEach((purchase: any) => {
        const purchaseDate = purchase.purchaseDate ? new Date(purchase.purchaseDate) : new Date()
        const weekStart = toWeekStart(purchaseDate)
        const key = weekStart.toISOString().split('T')[0]
        const current = weeklyMap.get(key) || { weekStart, revenue: 0, investment: 0 }
        current.investment += Number(purchase.amount || 0)
        weeklyMap.set(key, current)
      })

      const weeklyTrend = Array.from(weeklyMap.values())
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
        .map((item) => ({
          week: item.weekStart.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          revenue: item.revenue,
          investment: item.investment,
          net: item.revenue - item.investment,
        }))

      setSalesData(chartData)
      setTopProducts(topProductsData)
      setEmployeeMetrics(employeeMetricsData)
      setMetrics(metricsData)
      setPurchaseMetrics(purchaseMetricsData)
      setWeeklyFinancialTrend(weeklyTrend)
      setFinancialOverview({
        revenue,
        investment,
        grossProfit,
        netProfit,
        margin,
        netMargin,
        totalTips,
        suggestedReinvestment,
        suggestedPartnerDistribution,
        suggestedReserve,
        recommendation,
      })
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!canViewReports) {
    return <Navigate to="/pos" replace />
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']

  return (
    <div className="page-shell bg-[color:var(--bg-canvas)] p-6">
      {/* Background Doodle */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '450px',
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,33,46,0.06),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.08),transparent_26%),linear-gradient(180deg,rgba(247,246,242,1),rgba(242,239,232,1))] z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-3xl p-8 text-white shadow-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-sm border border-white/10">
                <BarChart3 size={36} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Reportes</h1>
                <p className="text-cyan-50/85 mt-2">Análisis y métricas del negocio</p>
              </div>
            </div>
            {isReadOnly && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <Eye size={20} />
                <span className="font-semibold">Solo lectura</span>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="surface-warm p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-teal-700" />
              <span className="font-semibold text-slate-700">Período:</span>
            </div>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-teal-600 focus:outline-none"
            />
            <span className="text-slate-500">hasta</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-teal-600 focus:outline-none"
            />
            {loading && (
              <div className="flex items-center gap-2 text-teal-700 ml-auto">
                <Loader size={18} className="animate-spin" />
                <span>Cargando...</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          {[
            { id: 'sales' as const, label: '📊 Ventas', enabled: canViewSalesReport },
            { id: 'financial' as const, label: '💸 Finanzas', enabled: canViewSalesReport },
            { id: 'employees' as const, label: '👥 Empleados', enabled: canViewEmployeeMetrics },
          ]
            .filter(t => t.enabled)
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-slate-900 to-teal-700 text-white shadow-lg'
                    : 'bg-white text-slate-700 shadow-md hover:shadow-lg border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Sales Report */}
        {activeTab === 'sales' && canViewSalesReport && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Ventas', value: `$${metrics.totalSales?.toFixed(2)}`, icon: DollarSign, color: 'from-emerald-600 to-teal-700' },
                  { label: 'Transacciones', value: metrics.transactionCount || 0, icon: Package, color: 'from-slate-800 to-slate-600' },
                  { label: 'Ticket Promedio', value: `$${metrics.averageTicket?.toFixed(2)}`, icon: TrendingUp, color: 'from-teal-700 to-cyan-700' },
                  { label: 'Propinas', value: `$${metrics.totalTips?.toFixed(2)}`, icon: DollarSign, color: 'from-amber-600 to-stone-600' },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white shadow-lg`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/80 text-sm font-medium">{card.label}</p>
                          <p className="text-3xl font-bold mt-2">{card.value}</p>
                        </div>
                        <Icon size={40} className="opacity-30" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Métodos de Pago</h3>
                {metrics && (metrics.totalCash || metrics.totalDigital || metrics.totalClip) ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Efectivo', value: metrics.totalCash || 0 },
                            { name: 'Transferencia', value: metrics.totalDigital || 0 },
                            { name: 'Tarjeta', value: metrics.totalClip || 0 },
                          ].filter(p => p.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {['#10b981', '#3b82f6', '#f59e0b'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 rounded-lg p-3 border-l-4 border-emerald-500">
                        <p className="text-sm text-gray-600">Efectivo</p>
                        <p className="text-lg font-bold text-emerald-600">${(metrics.totalCash || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                        <p className="text-sm text-gray-600">Transferencia</p>
                        <p className="text-lg font-bold text-blue-600">${(metrics.totalDigital || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
                        <p className="text-sm text-gray-600">Tarjeta</p>
                        <p className="text-lg font-bold text-amber-600">${(metrics.totalClip || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>

              {/* Sales by Day */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Día</h3>
                {salesData && salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total Ventas" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Productos</h3>
                {topProducts && topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topProducts}
                        dataKey="qty"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} unidades`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>
            </div>

            {/* Top Products Table */}
            {topProducts && topProducts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Detalle de Productos Vendidos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Cantidad</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {topProducts.map((product: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-medium">{product.name}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{product.qty}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">${product.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Financial Report */}
        {activeTab === 'financial' && canViewSalesReport && (
          <div className="space-y-6">
            {financialOverview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: 'Revenue', value: `$${financialOverview.revenue.toFixed(2)}`, icon: DollarSign, color: 'from-emerald-600 to-teal-700' },
                  { label: 'Inversión', value: `$${financialOverview.investment.toFixed(2)}`, icon: PiggyBank, color: 'from-rose-600 to-orange-600' },
                  { label: 'Ganancia Bruta', value: `$${financialOverview.grossProfit.toFixed(2)}`, icon: TrendingUp, color: 'from-slate-800 to-slate-600' },
                  { label: 'Margen Bruto', value: `${financialOverview.margin.toFixed(1)}%`, icon: BarChart3, color: 'from-teal-700 to-cyan-700' },
                  { label: 'Utilidad Neta', value: `$${financialOverview.netProfit.toFixed(2)}`, icon: TrendingUp, color: 'from-indigo-700 to-slate-700' },
                  { label: 'Margen Neto', value: `${financialOverview.netMargin.toFixed(1)}%`, icon: BarChart3, color: 'from-cyan-700 to-blue-700' },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white shadow-lg`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/80 text-sm font-medium">{card.label}</p>
                          <p className="text-3xl font-bold mt-2">{card.value}</p>
                        </div>
                        <Icon size={40} className="opacity-30" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Resumen Revenue vs Inversión</h3>
                {financialOverview ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: 'Período',
                          revenue: financialOverview.revenue,
                          inversion: financialOverview.investment,
                          ganancia: Math.max(financialOverview.grossProfit, 0),
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Bar dataKey="inversion" fill="#f97316" name="Inversión" />
                      <Bar dataKey="ganancia" fill="#0f172a" name="Ganancia" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sugerencia de Distribución de Ganancia</h3>
                {financialOverview && financialOverview.netProfit > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Reinversión sugerida', value: financialOverview.suggestedReinvestment },
                            { name: 'Reserva operativa', value: financialOverview.suggestedReserve },
                            { name: 'Distribución de utilidad', value: financialOverview.suggestedPartnerDistribution },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={90}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#0f766e" />
                          <Cell fill="#334155" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-slate-700 mt-2">
                      Referencia simple sobre utilidad neta: 40% reinversión, 20% reserva, 40% utilidad distribuible.
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hay ganancia positiva en el período para distribuir. Prioriza optimizar costo de compras.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Costo por Categoría</h3>
                {purchaseMetrics?.byCategory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={purchaseMetrics.byCategory.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="total" fill="#f97316" name="Inversión" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin compras registradas en el período</p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Tendencia Semanal (Revenue, Inversión, Neto)</h3>
                {weeklyFinancialTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyFinancialTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="investment" name="Inversión" stroke="#f97316" strokeWidth={2} />
                      <Line type="monotone" dataKey="net" name="Neto" stroke="#0f172a" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos para tendencia semanal</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Indicadores y Recomendación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Costo sobre Revenue</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {financialOverview?.revenue > 0
                      ? `${((financialOverview.investment / financialOverview.revenue) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </p>
                </div>
                <div className="bg-slate-50 border-l-4 border-slate-600 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Compras del período</p>
                  <p className="text-2xl font-bold text-slate-800">{purchaseMetrics?.purchaseCount || 0}</p>
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Categoría principal de costo</p>
                  <p className="text-xl font-bold text-amber-700">{purchaseMetrics?.byCategory?.[0]?.category || 'Sin datos'}</p>
                </div>
                <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Costo en propinas</p>
                  <p className="text-2xl font-bold text-indigo-700">${(financialOverview?.totalTips || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                <Lightbulb size={20} className="text-teal-700 mt-0.5" />
                <p className="text-teal-900 font-medium">{financialOverview?.recommendation || 'Sin recomendación disponible'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Employee Report */}
        {activeTab === 'employees' && canViewEmployeeMetrics && (
          <div className="space-y-6">
            {/* Employee Chart */}
            {employeeMetrics && employeeMetrics.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Empleado</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={employeeMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="userName" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: any) => `$${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Bar dataKey="totalSales" name="Total Ventas" fill="#3b82f6" />
                    <Bar dataKey="totalTips" name="Propinas" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Employee Metrics Table */}
            {employeeMetrics && employeeMetrics.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Métricas Detalladas por Empleado</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Empleado</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Rol</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ventas</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total Vendido</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ticket Prom.</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Propinas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employeeMetrics.map((emp: any) => (
                        <tr key={emp.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{emp.userName}</td>
                          <td className="px-6 py-4 text-center text-gray-700 capitalize text-sm">{emp.role}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{emp.salesCount}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">${emp.totalSales.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-gray-700">${emp.averageTicket.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-orange-600 font-semibold">${emp.totalTips.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
