/**
 * Generador de Datos Demo & Muestra Realista para Reisbloc F&B
 * Simula estadísticas completas para restaurantes de antojitos, guisados y barra fría (Localito).
 */

export interface DemoSaleDay {
  date: string
  rawDate: string
  total: number
  transactions: number
  averageTicket: number
  cash: number
  card: number
  transfer: number
}

export interface DemoHourlyTraffic {
  hour: string
  orders: number
  total: number
}

export interface DemoProductStat {
  name: string
  category: string
  qty: number
  total: number
  percentage: number
  imageUrl?: string
}

export interface DemoEmployeeStat {
  userId: string
  userName: string
  role: string
  salesCount: number
  totalSales: number
  averageTicket: number
  totalTips: number
  averageTip: number
}

export interface DemoReportsData {
  salesData: DemoSaleDay[]
  hourlyData: DemoHourlyTraffic[]
  topProducts: DemoProductStat[]
  employeeMetrics: DemoEmployeeStat[]
  metrics: {
    totalSales: number
    totalOrders: number
    averageTicket: number
    totalTips: number
    totalCash: number
    totalDigital: number
    totalClip: number
    cashPercentage: number
    cardPercentage: number
    transferPercentage: number
    cancellationRate: number
    grossMarginPercent: number
    netMarginPercent: number
  }
  purchaseMetrics: {
    totalInvestment: number
    totalPurchases: number
    byCategory: { category: string; total: number; percentage: number }[]
  }
  weeklyFinancialTrend: {
    week: string
    revenue: number
    investment: number
    net: number
    margin: number
  }[]
  financialOverview: {
    revenue: number
    investment: number
    grossProfit: number
    netProfit: number
    margin: number
    netMargin: number
    totalTips: number
    suggestedReinvestment: number
    suggestedPartnerDistribution: number
    suggestedReserve: number
    recommendation: string
  }
}

/**
 * Genera un conjunto completo de datos de reporte coherente con las fechas seleccionadas
 */
export function generateDemoReportsData(fromStr: string, toStr: string): DemoReportsData {
  const startDate = new Date(fromStr + 'T00:00:00')
  const endDate = new Date(toStr + 'T23:59:59')

  // Calcular número de días del rango
  const diffTime = Math.max(1000 * 60 * 60 * 24, Math.abs(endDate.getTime() - startDate.getTime()))
  const diffDays = Math.min(60, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))))

  const salesData: DemoSaleDay[] = []
  let totalSalesAccum = 0
  let totalOrdersAccum = 0
  let totalTipsAccum = 0
  let totalCashAccum = 0
  let totalCardAccum = 0
  let totalTransferAccum = 0

  // Semilla diaria coherente
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    if (d > endDate) break

    const dayOfWeek = d.getDay() // 0 = Domingo, 5 = Viernes, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
    
    // Ventas más altas fines de semana
    const baseSales = isWeekend ? 6200 : 3800
    const variance = (Math.sin(i * 1.5) * 800) + ((i % 3) * 350)
    const dayTotal = Math.round(baseSales + variance)
    const orders = Math.max(15, Math.round(dayTotal / (110 + (i % 20))))
    const tips = Math.round(dayTotal * 0.10)

    const cash = Math.round(dayTotal * 0.48)
    const card = Math.round(dayTotal * 0.34)
    const transfer = dayTotal - cash - card

    totalSalesAccum += dayTotal
    totalOrdersAccum += orders
    totalTipsAccum += tips
    totalCashAccum += cash
    totalCardAccum += card
    totalTransferAccum += transfer

    salesData.push({
      date: d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
      rawDate: d.toISOString().split('T')[0],
      total: dayTotal,
      transactions: orders,
      averageTicket: Math.round(dayTotal / orders),
      cash,
      card,
      transfer,
    })
  }

  // Si el rango es de 1 solo día, asegurar valores realistas
  if (salesData.length === 0) {
    salesData.push({
      date: 'Hoy',
      rawDate: fromStr,
      total: 5850,
      transactions: 42,
      averageTicket: 139.28,
      cash: 2800,
      card: 2050,
      transfer: 1000,
    })
    totalSalesAccum = 5850
    totalOrdersAccum = 42
    totalTipsAccum = 585
    totalCashAccum = 2800
    totalCardAccum = 2050
    totalTransferAccum = 1000
  }

  // 1. Distribución Horaria (Comida y Cena rush)
  const hourlyData: DemoHourlyTraffic[] = [
    { hour: '08:00 - 10:00', orders: Math.round(totalOrdersAccum * 0.06), total: Math.round(totalSalesAccum * 0.05) },
    { hour: '10:00 - 12:00', orders: Math.round(totalOrdersAccum * 0.12), total: Math.round(totalSalesAccum * 0.11) },
    { hour: '12:00 - 14:00', orders: Math.round(totalOrdersAccum * 0.22), total: Math.round(totalSalesAccum * 0.23) },
    { hour: '14:00 - 16:00 (Rush)', orders: Math.round(totalOrdersAccum * 0.28), total: Math.round(totalSalesAccum * 0.29) },
    { hour: '16:00 - 18:00', orders: Math.round(totalOrdersAccum * 0.10), total: Math.round(totalSalesAccum * 0.09) },
    { hour: '18:00 - 20:00', orders: Math.round(totalOrdersAccum * 0.14), total: Math.round(totalSalesAccum * 0.15) },
    { hour: '20:00 - 22:00', orders: Math.round(totalOrdersAccum * 0.08), total: Math.round(totalSalesAccum * 0.08) },
  ]

  // 2. Top Platillos F&B
  const topProductsBase = [
    { name: 'Quesadilla Maíz c/ Guisado', category: 'Quesadillas Maíz', qtyRatio: 0.26, price: 48, img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop' },
    { name: 'Quesadilla Harina c/ Guisado', category: 'Quesadillas Harina', qtyRatio: 0.21, price: 55, img: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=800&auto=format&fit=crop' },
    { name: 'Platillo Especial (2 guisados)', category: 'Platos', qtyRatio: 0.18, price: 125, img: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop' },
    { name: 'Orden Frijoles Puercos Especial', category: 'Especialidades', qtyRatio: 0.14, price: 65, img: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop' },
    { name: 'Coca-Cola 600ml Fría', category: 'Bebidas', qtyRatio: 0.22, price: 35, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop' },
    { name: 'Sope Normal c/ Guisado', category: 'Platos', qtyRatio: 0.11, price: 45, img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop' },
    { name: 'Café de Olla Tradicional', category: 'Bebidas', qtyRatio: 0.10, price: 30, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop' },
  ]

  const totalDishesSold = Math.round(totalOrdersAccum * 2.4)
  const topProducts: DemoProductStat[] = topProductsBase.map(p => {
    const qty = Math.max(1, Math.round(totalDishesSold * p.qtyRatio))
    const total = qty * p.price
    return {
      name: p.name,
      category: p.category,
      qty,
      total,
      percentage: Math.round((total / totalSalesAccum) * 100),
      imageUrl: p.img,
    }
  }).sort((a, b) => b.total - a.total)

  // 3. Empleados & Propinas
  const employeeMetrics: DemoEmployeeStat[] = [
    {
      userId: 'usr-01',
      userName: 'Carlos Santana (Capitán)',
      role: 'capitan',
      salesCount: Math.round(totalOrdersAccum * 0.42),
      totalSales: Math.round(totalSalesAccum * 0.44),
      averageTicket: Math.round((totalSalesAccum * 0.44) / (totalOrdersAccum * 0.42 || 1)),
      totalTips: Math.round(totalTipsAccum * 0.44),
      averageTip: Math.round((totalTipsAccum * 0.44) / (totalOrdersAccum * 0.42 || 1)),
    },
    {
      userId: 'usr-02',
      userName: 'María Rodríguez (Mesera)',
      role: 'mesero',
      salesCount: Math.round(totalOrdersAccum * 0.36),
      totalSales: Math.round(totalSalesAccum * 0.35),
      averageTicket: Math.round((totalSalesAccum * 0.35) / (totalOrdersAccum * 0.36 || 1)),
      totalTips: Math.round(totalTipsAccum * 0.35),
      averageTip: Math.round((totalTipsAccum * 0.35) / (totalOrdersAccum * 0.36 || 1)),
    },
    {
      userId: 'usr-03',
      userName: 'José Hernández (Mesero)',
      role: 'mesero',
      salesCount: Math.round(totalOrdersAccum * 0.22),
      totalSales: Math.round(totalSalesAccum * 0.21),
      averageTicket: Math.round((totalSalesAccum * 0.21) / (totalOrdersAccum * 0.22 || 1)),
      totalTips: Math.round(totalTipsAccum * 0.21),
      averageTip: Math.round((totalTipsAccum * 0.21) / (totalOrdersAccum * 0.22 || 1)),
    },
  ]

  // 4. Finanzas & Inversión (Compras)
  const totalInvestment = Math.round(totalSalesAccum * 0.34) // 34% de costos de insumos
  const totalPurchases = Math.max(2, Math.round(diffDays * 1.2))

  const purchaseCategories = [
    { category: 'Proteínas & Carnes', percentage: 40, total: Math.round(totalInvestment * 0.40) },
    { category: 'Lácteos & Quesos', percentage: 24, total: Math.round(totalInvestment * 0.24) },
    { category: 'Masas & Tortillas', percentage: 16, total: Math.round(totalInvestment * 0.16) },
    { category: 'Empaques To-Go', percentage: 12, total: Math.round(totalInvestment * 0.12) },
    { category: 'Verduras & Frutas', percentage: 8, total: Math.round(totalInvestment * 0.08) },
  ]

  const grossProfit = totalSalesAccum - totalInvestment
  const netProfit = grossProfit - Math.round(totalSalesAccum * 0.06) // Menos gastos operativos menores
  const margin = totalSalesAccum > 0 ? (grossProfit / totalSalesAccum) * 100 : 0
  const netMargin = totalSalesAccum > 0 ? (netProfit / totalSalesAccum) * 100 : 0

  const distributableProfit = Math.max(0, netProfit)
  const suggestedReinvestment = distributableProfit * 0.40
  const suggestedPartnerDistribution = distributableProfit * 0.40
  const suggestedReserve = distributableProfit * 0.20

  // 5. Tendencia Semanal
  const numWeeks = Math.max(2, Math.ceil(diffDays / 7))
  const weeklyFinancialTrend = []
  for (let w = 0; w < numWeeks; w++) {
    const weekRev = Math.round(totalSalesAccum / numWeeks * (0.9 + (w * 0.08)))
    const weekInv = Math.round(weekRev * 0.34)
    const weekNet = weekRev - weekInv
    weeklyFinancialTrend.push({
      week: `Semana ${w + 1}`,
      revenue: weekRev,
      investment: weekInv,
      net: weekNet,
      margin: Math.round((weekNet / weekRev) * 100),
    })
  }

  return {
    salesData,
    hourlyData,
    topProducts,
    employeeMetrics,
    metrics: {
      totalSales: totalSalesAccum,
      totalOrders: totalOrdersAccum,
      averageTicket: totalOrdersAccum ? Math.round(totalSalesAccum / totalOrdersAccum) : 0,
      totalTips: totalTipsAccum,
      totalCash: totalCashAccum,
      totalDigital: totalTransferAccum,
      totalClip: totalCardAccum,
      cashPercentage: Math.round((totalCashAccum / (totalSalesAccum || 1)) * 100),
      cardPercentage: Math.round((totalCardAccum / (totalSalesAccum || 1)) * 100),
      transferPercentage: Math.round((totalTransferAccum / (totalSalesAccum || 1)) * 100),
      cancellationRate: 0.8, // 0.8% tasa de cancelación baja y saludable
      grossMarginPercent: Number(margin.toFixed(1)),
      netMarginPercent: Number(netMargin.toFixed(1)),
    },
    purchaseMetrics: {
      totalInvestment,
      totalPurchases,
      byCategory: purchaseCategories,
    },
    weeklyFinancialTrend,
    financialOverview: {
      revenue: totalSalesAccum,
      investment: totalInvestment,
      grossProfit,
      netProfit,
      margin,
      netMargin,
      totalTips: totalTipsAccum,
      suggestedReinvestment,
      suggestedPartnerDistribution,
      suggestedReserve,
      recommendation:
        netMargin > 25
          ? '🌟 Rentabilidad sobresaliente (+30% margen neto). Conviene reinvertir en stock de proteínas y promoción de platillos dobles.'
          : '👍 Operación estable y controlada. Monitorear costos de quesos y empaques To-Go para maximizar utilidad.',
    },
  }
}
