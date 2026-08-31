import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { getTenantSettings } from '@/config/tenantConfig'
import { generateDemoReportsData, DemoReportsData } from '@/services/reportsDemoData'
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
  Sparkles,
  Printer,
  Award,
  CreditCard,
  Banknote,
  QrCode,
  Clock,
  CheckCircle2,
  Users,
  Percent,
  RefreshCw,
  Info,
  Zap,
  Utensils,
} from 'lucide-react'
import {
  AreaChart,
  Area,
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

type ReportTab = 'sales' | 'financial' | 'employees' | 'monthly_closing'

// Tooltip estilizado para modo oscuro
const CustomDarkTooltip = ({ active, payload, label, prefix = '$', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 min-w-[150px]">
        <p className="font-extrabold text-amber-400 border-b border-slate-800 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-slate-200">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
              <span className="font-medium text-slate-400">{entry.name}:</span>
            </span>
            <span className="font-black text-white">
              {prefix}
              {typeof entry.value === 'number' ? entry.value.toLocaleString('es-MX', { minimumFractionDigits: entry.value % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 }) : entry.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Reports() {
  const { currentUser } = useAppStore()
  const permissions = usePermissions()
  const tenant = getTenantSettings()

  const canViewReports = permissions.canViewReports || currentUser?.role === 'capitan'
  const canViewSalesReport = permissions.canViewSalesReport || currentUser?.role === 'capitan'
  const canViewEmployeeMetrics = permissions.canViewEmployeeMetrics || currentUser?.role === 'capitan'

  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [loading, setLoading] = useState(false)
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [forceDemoData, setForceDemoData] = useState<boolean>(false)

  // Selector de fechas
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
    to: new Date().toLocaleDateString('en-CA'),
  })

  const setPreset = (preset: 'today' | 'week' | 'month' | 'last_month' | 'last30') => {
    const now = new Date()
    if (preset === 'today') {
      const todayStr = now.toLocaleDateString('en-CA')
      setDateRange({ from: todayStr, to: todayStr })
    } else if (preset === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      setDateRange({ from: start.toLocaleDateString('en-CA'), to: now.toLocaleDateString('en-CA') })
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateRange({ from: start.toLocaleDateString('en-CA'), to: now.toLocaleDateString('en-CA') })
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      setDateRange({ from: start.toLocaleDateString('en-CA'), to: end.toLocaleDateString('en-CA') })
    } else if (preset === 'last30') {
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      setDateRange({ from: start.toLocaleDateString('en-CA'), to: now.toLocaleDateString('en-CA') })
    }
  }

  // Estados de datos de reporte
  const [salesData, setSalesData] = useState<any[]>([])
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [employeeMetrics, setEmployeeMetrics] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [purchaseMetrics, setPurchaseMetrics] = useState<any>(null)
  const [financialOverview, setFinancialOverview] = useState<any>(null)
  const [weeklyFinancialTrend, setWeeklyFinancialTrend] = useState<any[]>([])

  // Generar datos demo solo si está habilitado por el tenant
  const demoGenerated: DemoReportsData | null = useMemo(() => {
    if (!tenant.enableDemoMode) return null
    return generateDemoReportsData(dateRange.from, dateRange.to)
  }, [dateRange.from, dateRange.to, tenant.enableDemoMode])

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      loadReports()
    }
  }, [dateRange, forceDemoData])

  const loadReports = async () => {
    if (tenant.enableDemoMode && forceDemoData && demoGenerated) {
      applyDemoData(demoGenerated)
      return
    }

    setLoading(true)
    try {
      const startDate = new Date(dateRange.from + 'T00:00:00')
      const endDate = new Date(dateRange.to + 'T23:59:59.999')

      const sales = await supabaseService.getSalesByDateRange(startDate, endDate)

      if (!sales || sales.length === 0) {
        if (tenant.enableDemoMode && demoGenerated) {
          applyDemoData(demoGenerated)
        } else {
          // Datos reales vacíos para Localito sin mock fake
          setSalesData([])
          setHourlyData([])
          setTopProducts([])
          setEmployeeMetrics([])
          setMetrics({
            totalSales: 0,
            totalOrders: 0,
            averageTicket: 0,
            totalCash: 0,
            totalDigital: 0,
            totalClip: 0,
          })
          setPurchaseMetrics({ totalInvestment: 0, totalPurchases: 0, byCategory: [] })
          setWeeklyFinancialTrend([])
          setFinancialOverview({
            revenue: 0,
            investment: 0,
            grossProfit: 0,
            netProfit: 0,
            margin: 0,
            netMargin: 0,
            suggestedReinvestment: 0,
            suggestedPartnerDistribution: 0,
            suggestedReserve: 0,
            recommendation: 'Aún no se registran ventas en el período seleccionado. Emite comandas desde el POS para ver métricas en tiempo real.',
          })
        }
        return
      }

      // Agrupar ventas por día
      const byDay: Record<string, any[]> = {}
      const hourlyMap: Record<string, { orders: number; total: number }> = {
        '08:00 - 10:00': { orders: 0, total: 0 },
        '10:00 - 12:00': { orders: 0, total: 0 },
        '12:00 - 14:00': { orders: 0, total: 0 },
        '14:00 - 16:00 (Rush)': { orders: 0, total: 0 },
        '16:00 - 18:00': { orders: 0, total: 0 },
        '18:00 - 20:00': { orders: 0, total: 0 },
        '20:00 - 22:00': { orders: 0, total: 0 },
      }

      sales.forEach((sale: any) => {
        const date = sale.created_at ? new Date(sale.created_at) : new Date()
        const dayKey = date.toLocaleDateString('en-CA')
        if (!byDay[dayKey]) byDay[dayKey] = []
        byDay[dayKey].push(sale)

        // Agrupación horaria real
        const hour = date.getHours()
        const total = Number(sale.total || 0)
        if (hour >= 8 && hour < 10) { hourlyMap['08:00 - 10:00'].orders++; hourlyMap['08:00 - 10:00'].total += total }
        else if (hour >= 10 && hour < 12) { hourlyMap['10:00 - 12:00'].orders++; hourlyMap['10:00 - 12:00'].total += total }
        else if (hour >= 12 && hour < 14) { hourlyMap['12:00 - 14:00'].orders++; hourlyMap['12:00 - 14:00'].total += total }
        else if (hour >= 14 && hour < 16) { hourlyMap['14:00 - 16:00 (Rush)'].orders++; hourlyMap['14:00 - 16:00 (Rush)'].total += total }
        else if (hour >= 16 && hour < 18) { hourlyMap['16:00 - 18:00'].orders++; hourlyMap['16:00 - 18:00'].total += total }
        else if (hour >= 18 && hour < 20) { hourlyMap['18:00 - 20:00'].orders++; hourlyMap['18:00 - 20:00'].total += total }
        else if (hour >= 20 && hour <= 23) { hourlyMap['20:00 - 22:00'].orders++; hourlyMap['20:00 - 22:00'].total += total }
      })

      const chartData = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, sList]: [string, any[]]) => ({
          date: new Date(day).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          total: sList.reduce((sum, s: any) => sum + Number(s.total || 0), 0),
          transactions: sList.length,
          averageTicket: sList.length ? Math.round(sList.reduce((sum, s: any) => sum + Number(s.total || 0), 0) / sList.length) : 0,
        }))

      const [topProductsData, employeeMetricsData, metricsData, purchaseMetricsData, purchasesData] = await Promise.all([
        supabaseService.getTopProducts(startDate, endDate, 7),
        supabaseService.getEmployeeMetrics(startDate, endDate),
        supabaseService.getSalesMetrics(startDate, endDate),
        supabaseService.getPurchaseMetrics(startDate, endDate),
        supabaseService.getPurchasesByDateRange(startDate, endDate),
      ])

      const revenue = Number(metricsData?.totalSales || 0)
      const investment = Number(purchaseMetricsData?.totalInvestment || 0)
      const grossProfit = revenue - investment
      const netProfit = grossProfit // En Localito sin deducción de propinas
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
      const distributableProfit = netProfit > 0 ? netProfit : 0
      const suggestedReinvestment = distributableProfit > 0 ? distributableProfit * 0.4 : 0
      const suggestedPartnerDistribution = distributableProfit > 0 ? distributableProfit * 0.4 : 0
      const suggestedReserve = distributableProfit > 0 ? distributableProfit * 0.2 : 0

      let recommendation = 'Mantener operación y monitoreo continuo de inventarios.'
      if (revenue === 0) {
        recommendation = 'Aún no hay ventas en este período. Registra comandas en el POS para ver métricas en tiempo real.'
      } else if (netMargin < 12) {
        recommendation = 'Margen ajustado. Sugerencia: optimizar costos de compras y negociar con proveedores de carne y queso.'
      } else if (netMargin < 25) {
        recommendation = 'Margen saludable y controlado. Buen balance entre costo de insumos y precios al público.'
      } else {
        recommendation = 'Excelente rentabilidad operativa (+25%). Conviene reinvertir en capacidad instalada y empaques To-Go.'
      }

      setSalesData(chartData)
      setHourlyData(Object.entries(hourlyMap).map(([hour, data]) => ({ hour, orders: data.orders, total: data.total })))
      setTopProducts(topProductsData)
      setEmployeeMetrics(employeeMetricsData)
      setMetrics(metricsData)
      setPurchaseMetrics(purchaseMetricsData)

      // Tendencia semanal
      const toWeekStart = (date: Date) => {
        const copy = new Date(date)
        const day = copy.getDay()
        const diff = day === 0 ? -6 : 1 - day
        copy.setDate(copy.getDate() + diff)
        copy.setHours(0, 0, 0, 0)
        return copy
      }

      const weeklyMap = new Map<string, { weekStart: Date; revenue: number; investment: number }>()
      sales.forEach((sale: any) => {
        const sDate = sale.created_at ? new Date(sale.created_at) : new Date()
        const wStart = toWeekStart(sDate)
        const key = wStart.toISOString().split('T')[0]
        const curr = weeklyMap.get(key) || { weekStart: wStart, revenue: 0, investment: 0 }
        curr.revenue += Number(sale.total || 0)
        weeklyMap.set(key, curr)
      })

      purchasesData.forEach((purch: any) => {
        const pDate = purch.purchaseDate ? new Date(purch.purchaseDate) : new Date()
        const wStart = toWeekStart(pDate)
        const key = wStart.toISOString().split('T')[0]
        const curr = weeklyMap.get(key) || { weekStart: wStart, revenue: 0, investment: 0 }
        curr.investment += Number(purch.amount || 0)
        weeklyMap.set(key, curr)
      })

      const weeklyTrend = Array.from(weeklyMap.values())
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
        .map((item) => ({
          week: item.weekStart.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          revenue: item.revenue,
          investment: item.investment,
          net: item.revenue - item.investment,
        }))

      setWeeklyFinancialTrend(weeklyTrend)
      setFinancialOverview({
        revenue,
        investment,
        grossProfit,
        netProfit,
        margin,
        netMargin,
        suggestedReinvestment,
        suggestedPartnerDistribution,
        suggestedReserve,
        recommendation,
      })
    } catch (error) {
      console.error('Error cargando reportes:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyDemoData = (demo: DemoReportsData) => {
    setSalesData(demo.salesData)
    setHourlyData(demo.hourlyData)
    setTopProducts(demo.topProducts)
    setEmployeeMetrics(demo.employeeMetrics)
    setMetrics(demo.metrics)
    setPurchaseMetrics(demo.purchaseMetrics)
    setWeeklyFinancialTrend(demo.weeklyFinancialTrend)
    setFinancialOverview(demo.financialOverview)
  }

  if (!canViewReports) {
    return <Navigate to="/pos" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 select-none relative overflow-x-hidden">
      {/* Resplandor Ambiental de Fondo (Igual al POS) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-slate-900/50 rounded-full blur-3xl" />
      </div>

      {/* Header Banner - Menú & Reportes F&B */}
      <header className="relative bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border-b border-teal-500/20 px-4 py-6 overflow-hidden shadow-2xl z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-1">
              <Sparkles size={14} className="text-amber-400" />
              <span>Business Intelligence & Reportes · {tenant.clientName}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <img
                src={tenant.logoUrl}
                alt={tenant.clientName}
                className="h-14 md:h-16 w-auto object-contain rounded-2xl border border-amber-500/30 shadow-xl shadow-amber-500/10"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Reportes & Analíticas</h1>
                <p className="text-xs md:text-sm text-teal-300 font-semibold">{tenant.clientTagline} · Desempeño Operativo</p>
              </div>
            </div>
          </div>

          {/* Botones de Control Superior */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {/* Solo mostrar toggle demo si el tenant lo permite (NO en Localito) */}
            {tenant.enableDemoMode && (
              <button
                onClick={() => setForceDemoData(!forceDemoData)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 border ${
                  forceDemoData
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                }`}
                title="Alternar entre datos de demostración y datos en vivo"
              >
                <Zap size={15} className={forceDemoData ? 'text-amber-400' : 'text-emerald-400'} />
                <span>{forceDemoData ? 'Modo Muestra' : 'Datos Reales'}</span>
              </button>
            )}

            {/* Auditoría IA */}
            <button
              onClick={() => setShowAIInsights(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Lightbulb size={16} />
              <span>Auditoría IA</span>
            </button>

            {/* Imprimir Reporte */}
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Exportar / Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* Barra de Filtro de Fechas & Presets Rápidos */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 text-teal-400 font-extrabold text-xs uppercase tracking-wider">
                <Calendar size={18} />
                <span>Rango:</span>
              </div>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl text-white text-xs font-bold outline-none"
              />
              <span className="text-slate-500 font-bold text-xs">al</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl text-white text-xs font-bold outline-none"
              />
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setPreset('today')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Hoy
              </button>
              <button
                onClick={() => setPreset('week')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Esta Semana
              </button>
              <button
                onClick={() => setPreset('month')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-extrabold shadow-md shadow-teal-900/30 transition-all"
              >
                Este Mes (Corte)
              </button>
              <button
                onClick={() => setPreset('last_month')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Mes Anterior
              </button>
              <button
                onClick={() => setPreset('last30')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Últimos 30 Días
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                <Loader size={16} className="animate-spin" />
                <span>Actualizando métricas...</span>
              </div>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación del Reporte (Sin mención de propinas para Localito) */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'sales' as const, label: '📊 Ventas & Rendimiento', enabled: canViewSalesReport },
            { id: 'financial' as const, label: '💸 Finanzas & Utilidad Neta', enabled: canViewSalesReport },
            {
              id: 'employees' as const,
              label: tenant.enableTips ? '👥 Meseros & Propinas' : '👥 Personal & Desempeño',
              enabled: canViewEmployeeMetrics,
            },
            { id: 'monthly_closing' as const, label: '📑 Corte Mensual Oficial', enabled: canViewSalesReport },
          ]
            .filter((t) => t.enabled)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 scale-105 border border-amber-300/40'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* ============================================================
            PESTAÑA 1: VENTAS & RENDIMIENTO
           ============================================================ */}
        {activeTab === 'sales' && canViewSalesReport && (
          <div className="space-y-6">
            {/* KPI Metrics Cards */}
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Ventas */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 shadow-xl transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">Total Ventas</span>
                      <p className="text-3xl font-black text-white mt-1">
                        ${(metrics.totalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold mt-1.5">
                        <TrendingUp size={13} /> Facturación en Caja
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <DollarSign size={24} />
                    </div>
                  </div>
                </div>

                {/* Comandas / Transacciones */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-teal-500/40 rounded-3xl p-5 shadow-xl transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-teal-400 uppercase tracking-wider">Comandas Emitidas</span>
                      <p className="text-3xl font-black text-white mt-1">
                        {metrics.totalOrders || metrics.transactionCount || 0}
                      </p>
                      <span className="text-[11px] text-slate-400 font-bold mt-1.5 block">
                        {(metrics.totalOrders ? (metrics.totalOrders / (salesData.length || 1)).toFixed(1) : '0')} órdenes / día prom.
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                      <Package size={24} />
                    </div>
                  </div>
                </div>

                {/* Ticket Promedio */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">Ticket Promedio</span>
                      <p className="text-3xl font-black text-white mt-1">
                        ${(metrics.averageTicket || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <span className="text-[11px] text-amber-300/80 font-bold mt-1.5 block">
                        Gasto medio por mesa
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                </div>

                {/* 4ta Métrica: Platillo Estrella en Localito (o Propinas si estuviera habilitado en otro tenant) */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-5 shadow-xl transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-indigo-400 uppercase tracking-wider">
                        {tenant.enableTips ? 'Propinas Equipo' : 'Platillo Más Vendido'}
                      </span>
                      <p className="text-2xl font-black text-white mt-1 truncate max-w-[180px]">
                        {tenant.enableTips
                          ? `$${(metrics.totalTips || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                          : (topProducts[0]?.name || 'Platillos del Menú')}
                      </p>
                      <span className="text-[11px] text-indigo-300/80 font-bold mt-1.5 block">
                        {tenant.enableTips
                          ? '~10% sugerido al cliente'
                          : `${topProducts[0]?.qty || topProducts[0]?.quantity || 0} piezas registradas`}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      {tenant.enableTips ? <Award size={24} /> : <Utensils size={24} />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fila Gráfica 1: Ventas por Día (Area Chart) + Métodos de Pago (Donut) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfica de Área de Ventas Diarias */}
              <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">Evolución de Ventas Diarias</h3>
                    <p className="text-xs text-slate-400">Comportamiento de ingresos en el período seleccionado</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
                    MXN
                  </span>
                </div>

                {salesData && salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomDarkTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Ventas Totales"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#salesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-center py-16 font-bold text-xs space-y-1">
                    <p>No se encontraron operaciones de venta en el rango de fechas seleccionado.</p>
                    <p className="text-[11px] text-slate-600 font-normal">Realiza ventas desde el POS para visualizar la evolución diaria.</p>
                  </div>
                )}
              </div>

              {/* Métodos de Pago */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white mb-1">Métodos de Cobro</h3>
                  <p className="text-xs text-slate-400 mb-4">Distribución de formas de pago en caja</p>

                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Efectivo', value: metrics?.totalCash || 0, color: '#10b981' },
                          { name: 'Tarjeta / Clip', value: metrics?.totalClip || 0, color: '#f59e0b' },
                          { name: 'Transferencia', value: metrics?.totalDigital || 0, color: '#06b6d4' },
                        ].filter((p) => p.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                      >
                        {[
                          { color: '#10b981' },
                          { color: '#f59e0b' },
                          { color: '#06b6d4' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-emerald-500/20 text-center">
                    <Banknote size={16} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Efectivo</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">
                      ${((metrics?.totalCash || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-amber-500/20 text-center">
                    <CreditCard size={16} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tarjeta</p>
                    <p className="text-xs font-black text-amber-400 mt-0.5">
                      ${((metrics?.totalClip || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-cyan-500/20 text-center">
                    <QrCode size={16} className="text-cyan-400 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Transf.</p>
                    <p className="text-xs font-black text-cyan-400 mt-0.5">
                      ${((metrics?.totalDigital || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila Gráfica 2: Horas Pico (Rush Hours) + Top Platillos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Horas Pico (Rush Hours) */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Clock size={18} className="text-amber-400" />
                      <span>Horas Pico de Venta (Rush Hours)</span>
                    </h3>
                    <p className="text-xs text-slate-400">Afluencia y facturación por franja horaria</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomDarkTooltip />} />
                    <Bar dataKey="total" name="Venta en Franja" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Platillos Vendidos */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Award size={18} className="text-teal-400" />
                      <span>Top Platillos con Mayor Demanda</span>
                    </h3>
                    <p className="text-xs text-slate-400">Ranking por volumen de venta y facturación</p>
                  </div>
                </div>

                {topProducts.length === 0 ? (
                  <div className="text-slate-500 text-center py-12 text-xs font-bold">
                    No hay platillos vendidos registrados en este rango.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(topProducts || []).slice(0, 5).map((prod: any, idx: number) => {
                      const medals = ['🥇', '🥈', '🥉', '4°', '5°']
                      const maxTotal = topProducts[0]?.total || 1
                      const progressPercent = Math.min(100, Math.round((prod.total / maxTotal) * 100))

                      return (
                        <div key={idx} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{medals[idx]}</span>
                              <span className="font-bold text-white text-xs sm:text-sm">{prod.name}</span>
                            </div>
                            <span className="font-black text-emerald-400 text-xs sm:text-sm">
                              ${Number(prod.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>{prod.qty || prod.quantity || 0} piezas vendidas</span>
                            <span>{prod.category || 'Guisado'}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PESTAÑA 2: FINANZAS & ESTADO DE RESULTADOS
           ============================================================ */}
        {activeTab === 'financial' && canViewSalesReport && (
          <div className="space-y-6">
            {financialOverview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: 'Revenue Bruto', value: `$${financialOverview.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: 'border-emerald-500/30 text-emerald-400', icon: DollarSign },
                  { label: 'Costo Insumos', value: `$${financialOverview.investment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: 'border-rose-500/30 text-rose-400', icon: PiggyBank },
                  { label: 'Ganancia Bruta', value: `$${financialOverview.grossProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: 'border-teal-500/30 text-teal-300', icon: TrendingUp },
                  { label: 'Margen Bruto', value: `${financialOverview.margin.toFixed(1)}%`, color: 'border-amber-500/30 text-amber-400', icon: Percent },
                  { label: 'Utilidad Neta', value: `$${financialOverview.netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: 'border-cyan-500/30 text-cyan-300', icon: Award },
                  { label: 'Margen Neto', value: `${financialOverview.netMargin.toFixed(1)}%`, color: 'border-purple-500/30 text-purple-400', icon: Percent },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className={`bg-slate-900/80 backdrop-blur-md border ${card.color} rounded-3xl p-5 shadow-xl`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-slate-400 uppercase">{card.label}</p>
                        <Icon size={18} className="opacity-60" />
                      </div>
                      <p className={`text-2xl font-black mt-2 ${card.color.split(' ')[1]}`}>{card.value}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Comparativa Finanzas & Distribución Sugerida */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica de Tendencia Semanal de Ingresos vs Compras */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-black text-white mb-1">Tendencia Semanal (Revenue vs Compras vs Neto)</h3>
                <p className="text-xs text-slate-400 mb-4">Comportamiento financiero por ciclo semanal</p>

                {weeklyFinancialTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={weeklyFinancialTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomDarkTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Bar dataKey="revenue" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="investment" name="Compras / Insumos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net" name="Utilidad Neta" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-center py-16 text-xs font-bold">
                    Sin registros semanales suficientes en este rango.
                  </div>
                )}
              </div>

              {/* Sugerencia de Distribución de Utilidad */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white mb-1">Distribución Sugerida de Utilidad Neta</h3>
                  <p className="text-xs text-slate-400 mb-4">Estrategia financiera de reinversión y dividendos (F&B)</p>

                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Reinversión Operativa (40%)', value: financialOverview?.suggestedReinvestment || 0, color: '#10b981' },
                          { name: 'Reparto Socios (40%)', value: financialOverview?.suggestedPartnerDistribution || 0, color: '#f59e0b' },
                          { name: 'Fondo de Reserva (20%)', value: financialOverview?.suggestedReserve || 0, color: '#06b6d4' },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={5}
                      >
                        {[
                          { color: '#10b981' },
                          { color: '#f59e0b' },
                          { color: '#06b6d4' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                  <div className="p-2 bg-slate-950/60 rounded-xl border border-emerald-500/20">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Reinversión</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">
                      ${(financialOverview?.suggestedReinvestment || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-950/60 rounded-xl border border-amber-500/20">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Socios</p>
                    <p className="text-xs font-black text-amber-400 mt-0.5">
                      ${(financialOverview?.suggestedPartnerDistribution || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-950/60 rounded-xl border border-cyan-500/20">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Reserva</p>
                    <p className="text-xs font-black text-cyan-400 mt-0.5">
                      ${(financialOverview?.suggestedReserve || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Costos por Categoría de Insumos */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black text-white mb-1">Inversión & Compras por Categoría de Insumo</h3>
              <p className="text-xs text-slate-400 mb-4">Control del Costo de Ventas (COGS) por línea de insumos</p>

              {(purchaseMetrics?.byCategory || []).length === 0 ? (
                <div className="text-slate-500 text-center py-8 text-xs font-bold">
                  No hay compras a proveedores registradas en este período.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {(purchaseMetrics?.byCategory || []).map((cat: any, i: number) => (
                    <div key={i} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">{cat.category}</p>
                      <p className="text-xl font-black text-rose-400">
                        ${Number(cat.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">{cat.percentage || 20}% del gasto total</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            PESTAÑA 3: PERSONAL & DESEMPEÑO (CERO PROPINAS EN LOCALITO)
           ============================================================ */}
        {activeTab === 'employees' && canViewEmployeeMetrics && (
          <div className="space-y-6">
            {/* Gráfica de Empleados */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black text-white mb-1">Desempeño en Ventas por Personal</h3>
              <p className="text-xs text-slate-400 mb-4">Ventas acumuladas y comandas atendidas por mesero / cajero</p>

              {employeeMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={employeeMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="userName" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomDarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="totalSales" name="Venta Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    {tenant.enableTips && (
                      <Bar dataKey="totalTips" name="Propinas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-center py-12 text-xs font-bold">
                  No hay ventas registradas por colaboradores en este rango.
                </div>
              )}
            </div>

            {/* Tabla Detallada de Personal */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Tabla de Rendimiento Individual</h3>
                  <p className="text-xs text-slate-400">Detalle de comandas y facturación por colaborador</p>
                </div>
                <Users size={20} className="text-teal-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-950 text-slate-400 text-xs font-black uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Colaborador</th>
                      <th className="px-6 py-4 text-center">Rol</th>
                      <th className="px-6 py-4 text-right">Comandas</th>
                      <th className="px-6 py-4 text-right">Total Vendido</th>
                      <th className="px-6 py-4 text-right">Ticket Prom.</th>
                      {tenant.enableTips && <th className="px-6 py-4 text-right">Propinas</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {employeeMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={tenant.enableTips ? 6 : 5} className="px-6 py-8 text-center text-slate-500 font-bold text-xs">
                          Sin actividad registrada para este período.
                        </td>
                      </tr>
                    ) : (
                      employeeMetrics.map((emp: any, idx: number) => (
                        <tr key={emp.userId || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-xs font-black">
                              {emp.userName.charAt(0)}
                            </div>
                            <span>{emp.userName}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-800 text-teal-300 border border-slate-700">
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-300">{emp.salesCount}</td>
                          <td className="px-6 py-4 text-right font-black text-emerald-400">
                            ${Number(emp.totalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-300">
                            ${Number(emp.averageTicket || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          {tenant.enableTips && (
                            <td className="px-6 py-4 text-right font-black text-amber-400">
                              ${Number(emp.totalTips || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PESTAÑA 4: CORTE MENSUAL & BALANCE OFICIAL
           ============================================================ */}
        {activeTab === 'monthly_closing' && canViewSalesReport && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-2xl border border-teal-500/30 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="px-3 py-1 bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-black rounded-full uppercase tracking-wider">
                    Balance Ejecutivo Oficial · {tenant.clientName}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black mt-2">Corte & Estado Financiero</h2>
                  <p className="text-slate-400 text-xs mt-1">Período: {dateRange.from} al {dateRange.to}</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Printer size={16} />
                  <span>Imprimir Balance Oficial</span>
                </button>
              </div>

              {/* Grid Métricas Principales del Corte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-xs font-bold uppercase">Ingresos Brutos (Ventas)</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    ${Number(metrics?.totalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{metrics?.totalOrders || 0} comandas cerradas</p>
                </div>

                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-xs font-bold uppercase">Inversión / Compras Insumos</p>
                  <p className="text-2xl font-black text-rose-400 mt-1">
                    ${Number(purchaseMetrics?.totalInvestment || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{purchaseMetrics?.totalPurchases || 0} compras registradas</p>
                </div>

                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-xs font-bold uppercase">Utilidad Operativa Neta</p>
                  <p className="text-2xl font-black text-teal-300 mt-1">
                    ${((metrics?.totalSales || 0) - (purchaseMetrics?.totalInvestment || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-teal-400 mt-1">
                    Margen: {(metrics?.totalSales ? (((metrics.totalSales - (purchaseMetrics?.totalInvestment || 0)) / metrics.totalSales) * 100).toFixed(1) : 0)}%
                  </p>
                </div>

                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-xs font-bold uppercase">Ticket Promedio</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">
                    ${Number(metrics?.averageTicket || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Gasto medio por mesa</p>
                </div>
              </div>

              {/* Diagnóstico Inteligente */}
              <div className="p-4 rounded-2xl bg-teal-950/50 border border-teal-500/30 flex items-start gap-3">
                <Lightbulb size={24} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-black text-teal-200 uppercase tracking-wide">Diagnóstico Operativo del Corte:</p>
                  <p className="text-slate-300 leading-relaxed">{financialOverview?.recommendation || 'Opera con rentabilidad estable y márgenes saludables.'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE AUDITORÍA IA DE REPORTES */}
        {showAIInsights && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white shadow-2xl space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <Lightbulb size={24} />
                  <span className="text-xl">Auditoría IA & Diagnóstico Financiero</span>
                </div>
                <button
                  onClick={() => setShowAIInsights(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-teal-400 font-black uppercase text-[10px]">Resumen Ejecutivo Generado por IA:</p>
                  <p className="text-slate-200 leading-relaxed">
                    Durante el período seleccionado ({dateRange.from} al {dateRange.to}), el establecimiento <strong>{tenant.clientName}</strong> facturó un total de <strong>${(metrics?.totalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> en <strong>{metrics?.totalOrders || 0}</strong> operaciones de venta, alcanzando un ticket promedio de <strong>${(metrics?.averageTicket || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-amber-400 font-black uppercase text-[10px]">Sugerencias de Optimización de Costos & Márgenes:</p>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                    <li>Garantizar disponibilidad de insumos para el platillo estrella: <strong>{topProducts[0]?.name || 'Platillos principales'}</strong>.</li>
                    <li>Margen de utilidad neta actual proyectado en <strong>{financialOverview?.netMargin?.toFixed(1) || '0.0'}%</strong>.</li>
                    <li>Mantener control de cancelaciones y ajustes en comandas para preservar la integridad de caja.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowAIInsights(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
