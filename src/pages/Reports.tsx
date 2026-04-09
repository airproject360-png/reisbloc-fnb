import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Calendar,
  Download,
  Eye,
  Lock,
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
  PieLabel,
} from 'recharts'

type ReportTab = 'sales' | 'inventory' | 'employees'

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
      const [topProductsData, employeeMetricsData, metricsData] = await Promise.all([
        supabaseService.getTopProducts(startDate, endDate, 5),
        supabaseService.getEmployeeMetrics(startDate, endDate),
        supabaseService.getSalesMetrics(startDate, endDate),
      ])

      setSalesData(chartData)
      setTopProducts(topProductsData)
      setEmployeeMetrics(employeeMetricsData)
      setMetrics(metricsData)
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {['#10b981', '#3b82f6', '#f59e0b'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
                        formatter={(value) => `$${value.toFixed(2)}`}
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
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

// Componentes de reportes individuales
function SalesReport({ isReadOnly }: { isReadOnly: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Ventas Totales"
        value="$45,230.00"
        change="+12.5%"
        positive
        icon={DollarSign}
      />
      <StatCard
        title="Tickets Promedio"
        value="$385.00"
        change="+3.2%"
        positive
        icon={TrendingUp}
      />
      <StatCard
        title="Órdenes"
        value="117"
        change="+8.1%"
        positive
        icon={BarChart3}
      />
      <StatCard
        title="Propinas"
        value="$2,150.00"
        change="+15.3%"
        positive
        icon={DollarSign}
      />
      
      <div className="col-span-full card-gradient">
        <h3 className="text-xl font-bold mb-4">Detalle de Ventas</h3>
        <p className="text-gray-600">Gráficas y tabla detallada en desarrollo...</p>
        {isReadOnly && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
            <Eye size={18} />
            <span className="text-sm font-semibold">Modo solo lectura - No puedes modificar datos</span>
          </div>
        )}
      </div>
    </div>
  )
}

function InventoryReport({ isReadOnly }: { isReadOnly: boolean }) {
  return (
    <div className="card-gradient">
      <h3 className="text-xl font-bold mb-4">Estado del Inventario</h3>
      <p className="text-gray-600">Reporte de inventario en desarrollo...</p>
      {isReadOnly && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
          <Eye size={18} />
          <span className="text-sm font-semibold">Modo solo lectura - No puedes ajustar inventario</span>
        </div>
      )}
    </div>
  )
}

function EmployeesReport({ isReadOnly }: { isReadOnly: boolean }) {
  return (
    <div className="card-gradient">
      <h3 className="text-xl font-bold mb-4">Métricas de Empleados</h3>
      <p className="text-gray-600">Reporte de empleados en desarrollo...</p>
    </div>
  )
}

function FinancialReport({ isReadOnly }: { isReadOnly: boolean }) {
  return (
    <div className="card-gradient">
      <h3 className="text-xl font-bold mb-4">Resumen Financiero</h3>
      <p className="text-gray-600">Reporte financiero en desarrollo...</p>
      {isReadOnly && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
          <Eye size={18} />
          <span className="text-sm font-semibold">Modo solo lectura - No puedes realizar ajustes</span>
        </div>
      )}
    </div>
  )
}

// Componente reutilizable de tarjeta de estadística
function StatCard({ 
  title, 
  value, 
  change, 
  positive, 
  icon: Icon 
}: { 
  title: string
  value: string
  change: string
  positive: boolean
  icon: any
}) {
  return (
    <div className="card-gradient hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
          <Icon size={24} />
        </div>
        <span className={`text-sm font-bold ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-semibold">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}
