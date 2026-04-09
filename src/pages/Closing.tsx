import { useState, useEffect } from 'react'
import logger from '@/utils/logger'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import {
  DollarSign,
  Check,
  AlertCircle,
  Loader,
  Printer,
  Mail,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function Closing() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [closingData, setClosingData] = useState<any>(null)
  const [employeeMetrics, setEmployeeMetrics] = useState<any[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadClosingData()
  }, [])

  const loadClosingData = async () => {
    setLoading(true)
    try {
      // Usar UTC correctamente - obtener hoy en UTC
      const today = new Date()
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0))
      const tomorrowUTC = new Date(todayUTC)
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

      // Obtener ventas del día desde Supabase y calcular métricas localmente
      const sales = await supabaseService.getSalesByDateRange(todayUTC, tomorrowUTC)

      // Métricas generales de cierre
      const metrics = sales.reduce(
        (acc: any, sale: any) => {
          const total = Number(sale.total || 0)
          const tip = Number(sale.tip_amount || sale.tip || 0)
          acc.totalSales += total
          acc.totalTips += tip
          acc.transactionCount += 1
          const method = (sale.payment_method || '').toLowerCase()
          if (method === 'cash') acc.totalCash += total
          else if (method === 'digital') acc.totalDigital += total
          else if (method === 'clip') acc.totalClip += total
          return acc
        },
        {
          totalSales: 0,
          totalCash: 0,
          totalDigital: 0,
          totalClip: 0,
          totalTips: 0,
          totalDiscounts: 0,
          transactionCount: 0,
          averageTicket: 0,
        }
      )
      metrics.averageTicket = metrics.transactionCount
        ? metrics.totalSales / metrics.transactionCount
        : 0

      // Métricas por empleado
      const users = await supabaseService.getAllUsers()
      const byUser: Record<string, any> = {}
      users.forEach(u => {
        byUser[u.id] = {
          userId: u.id,
          userName: (u as any).username || (u as any).name || 'Usuario',
          role: u.role,
          salesCount: 0,
          totalSales: 0,
          totalTips: 0,
          averageTicket: 0,
          averageTip: 0,
        }
      })
      sales.forEach((sale: any) => {
        const uid = sale.waiter_id || sale.saleBy
        if (uid && byUser[uid]) {
          byUser[uid].salesCount += 1
          byUser[uid].totalSales += Number(sale.total || 0)
          byUser[uid].totalTips += Number(sale.tip_amount || sale.tip || 0)
        }
      })
      const employees = Object.values(byUser)
        .filter((m: any) => m.salesCount > 0)
        .map((m: any) => ({
          ...m,
          averageTicket: m.salesCount ? m.totalSales / m.salesCount : 0,
          averageTip: m.salesCount ? m.totalTips / m.salesCount : 0,
        }))
        .sort((a: any, b: any) => b.totalSales - a.totalSales)

      setClosingData(metrics)
      setEmployeeMetrics(employees)
    } catch (error) {
      logger.error('closing', 'Error loading closing data', error as any)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitClosing = async () => {
    if (!confirmed) {
      alert('Por favor confirma el cierre de caja')
      return
    }

    setSubmitting(true)
    try {
      const closingRecord = {
        date: new Date(),
        closedBy: currentUser?.id || '',
        totalSales: closingData.totalSales,
        totalCash: closingData.cash,
        totalCard: closingData.card,
        totalDigital: closingData.digital,
        totalTips: closingData.totalTips,
        ordersCount: closingData.ordersCount,
        salesCount: closingData.salesCount,
        employeeMetrics,
        paymentMethods: {
          cash: closingData.cash,
          card: closingData.card,
          digital: closingData.digital,
        },
        notes,
        status: 'closed',
      }

      await supabaseService.saveClosing(closingRecord)
      
      alert('✅ Cierre de caja guardado exitosamente')
      setConfirmed(false)
      setNotes('')
      loadClosingData()
    } catch (error) {
      logger.error('closing', 'Error submitting closing', error as any)
      alert('❌ Error al guardar el cierre de caja')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintClosing = () => {
    const printContent = generatePrintHTML()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  const handleSendEmail = async () => {
    if (!currentUser?.email) {
      alert('⚠️ No hay correo registrado en tu perfil')
      return
    }

    try {
      const response = await fetch('/.netlify/functions/sendClosingEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          username: currentUser.username,
          closingData,
          employeeMetrics,
          notes,
          date: new Date().toLocaleDateString('es-MX'),
        }),
      })

      if (response.ok) {
        alert('✅ Correo enviado exitosamente')
      } else {
        alert('❌ Error al enviar el correo')
      }
    } catch (error) {
      logger.error('closing', 'Error sending email', error as any)
      alert('❌ Error de conexión al enviar correo')
    }
  }

  const generatePrintHTML = () => {
    const total = closingData?.totalSales || 0
    const discounts = closingData?.totalDiscounts || 0
    const tips = closingData?.totalTips || 0
    const toDeposit = total - discounts + tips

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cierre de Caja - ${new Date().toLocaleDateString('es-MX')}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .receipt {
            max-width: 400px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .section {
            margin: 15px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .line {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 5px 0;
          }
          .line strong { font-weight: bold; }
          .total-line {
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
          }
          .employee-table {
            width: 100%;
            font-size: 11px;
            border-collapse: collapse;
          }
          .employee-table th {
            border-bottom: 1px solid #000;
            padding: 5px;
            text-align: left;
          }
          .employee-table td {
            padding: 5px;
            border-bottom: 1px dotted #ccc;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .receipt { border: none; margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>🏪 TPV SOLUTIONS</h1>
            <p>CIERRE DE CAJA</p>
            <p>${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Cajero: ${currentUser?.username}</p>
          </div>

          <div class="section">
            <div class="line">
              <span>Total Ventas:</span>
              <strong>$${total.toFixed(2)}</strong>
            </div>
            <div class="line">
              <span>Descuentos:</span>
              <strong>-$${discounts.toFixed(2)}</strong>
            </div>
            <div class="line">
              <span>Propinas:</span>
              <strong>+$${tips.toFixed(2)}</strong>
            </div>
            <div class="line total-line">
              <span>A DEPOSITAR:</span>
              <span>$${toDeposit.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <strong>DESGLOSE DE PAGOS</strong>
            <div class="line">
              <span>Efectivo:</span>
              <span>$${(closingData?.totalCash || 0).toFixed(2)}</span>
            </div>
            <div class="line">
              <span>Digital:</span>
              <span>$${(closingData?.totalDigital || 0).toFixed(2)}</span>
            </div>
            <div class="line">
              <span>CLIP:</span>
              <span>$${(closingData?.totalClip || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <strong>MÉTRICAS</strong>
            <div class="line">
              <span>Transacciones:</span>
              <span>${closingData?.transactionCount || 0}</span>
            </div>
            <div class="line">
              <span>Ticket Promedio:</span>
              <span>$${(closingData?.averageTicket || 0).toFixed(2)}</span>
            </div>
          </div>

          ${employeeMetrics && employeeMetrics.length > 0 ? `
          <div class="section">
            <strong>DESEMPEÑO DE EMPLEADOS</strong>
            <table class="employee-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Ventas</th>
                  <th>Propinas</th>
                </tr>
              </thead>
              <tbody>
                ${employeeMetrics.map(emp => `
                  <tr>
                    <td>${emp.userName}</td>
                    <td>$${emp.totalSales.toFixed(2)}</td>
                    <td>$${emp.totalTips.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${notes ? `
          <div class="section">
            <strong>NOTAS:</strong>
            <p style="font-size: 11px; margin: 5px 0;">${notes}</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Documento generado automáticamente por Reisbloc POS</p>
            <p>${new Date().toLocaleTimeString('es-MX')}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  if (!isAdmin) {
    return <Navigate to="/pos" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos de cierre...</p>
        </div>
      </div>
    )
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b']

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-gray-50 via-amber-50/30 to-orange-50/30 p-6">
      {/* Background Doodle */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '450px',
        }}
      />
      
      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                <DollarSign size={36} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Cierre de Caja</h1>
                <p className="text-amber-100 mt-2">
                  {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <span className="font-semibold">{currentUser?.username}</span>
            </div>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Importante</p>
            <p>Este proceso generará un cierre oficial del día. Revisa todos los números antes de confirmar.</p>
          </div>
        </div>

        {/* Summary Cards */}
        {closingData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm font-medium">Total Ventas</p>
              <p className="text-4xl font-bold mt-2">${closingData.totalSales?.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm font-medium">Transacciones</p>
              <p className="text-4xl font-bold mt-2">{closingData.transactionCount || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm font-medium">Propinas</p>
              <p className="text-4xl font-bold mt-2">${closingData.totalTips?.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm font-medium">Ticket Promedio</p>
              <p className="text-3xl font-bold mt-2">${closingData.averageTicket?.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Payment Breakdown */}
        {closingData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Métodos de Pago</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Efectivo', value: closingData.totalCash || 0 },
                      { name: 'Transferencia', value: closingData.totalDigital || 0 },
                      { name: 'Tarjeta', value: closingData.totalClip || 0 },
                    ].filter(p => p.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                </PieChart>
              </ResponsiveContainer>

              {/* Payment Summary */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                  <span className="font-semibold text-gray-900">Efectivo</span>
                  <span className="text-lg font-bold text-emerald-600">${(closingData.totalCash || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <span className="font-semibold text-gray-900">Transferencia</span>
                  <span className="text-lg font-bold text-blue-600">${(closingData.totalDigital || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                  <span className="font-semibold text-gray-900">Tarjeta</span>
                  <span className="text-lg font-bold text-amber-600">${(closingData.totalClip || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Discounts & Taxes */}
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Resumen Financiero</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="text-lg font-semibold">${(closingData.totalSales || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Descuentos</span>
                  <span className="text-lg font-semibold text-red-600">-${(closingData.totalDiscounts || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Propinas</span>
                  <span className="text-lg font-semibold text-green-600">+${(closingData.totalTips || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <span className="font-bold text-gray-900">Total a Depositar</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${((closingData.totalSales || 0) - (closingData.totalDiscounts || 0) + (closingData.totalTips || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Metrics */}
        {employeeMetrics && employeeMetrics.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Desempeño de Empleados</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="userName" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: any) => `$${value.toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="totalSales" name="Ventas" fill="#3b82f6" />
                <Bar dataKey="totalTips" name="Propinas" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>

            {/* Employee Table */}
            <div className="overflow-x-auto mt-6">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Empleado</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ventas</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Tickets</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Propinas</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ganancias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeeMetrics.map((emp: any) => (
                    <tr key={emp.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{emp.userName}</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">${emp.totalSales.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{emp.salesCount}</td>
                      <td className="px-6 py-4 text-right text-orange-600 font-semibold">${emp.totalTips.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-lg font-bold text-blue-600">
                        ${(emp.totalSales + emp.totalTips).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Notas del Cierre</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Descrepancia en caja, cliente reclamo, etc."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
            rows={4}
          />
        </div>

        {/* Confirmation Section */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-1">
              <AlertCircle size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Confirmación de Cierre</h3>
              <p className="text-gray-700 text-sm mt-1">Al confirmar, este cierre de caja se registrará permanentemente en el sistema.</p>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-amber-200 cursor-pointer hover:bg-amber-50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 rounded accent-amber-600"
            />
            <span className="font-semibold text-gray-900">
              Confirmo que todos los datos son correctos y autorizo el cierre de caja
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 flex-wrap">
            <button
              onClick={handleSubmitClosing}
              disabled={!confirmed || submitting}
              className="flex-1 min-w-[200px] bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Completar Cierre
                </>
              )}
            </button>
            <button
              onClick={handlePrintClosing}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center gap-2"
            >
              <Printer size={20} />
              <span className="hidden md:inline">Imprimir</span>
            </button>
            <button
              onClick={handleSendEmail}
              className="px-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center gap-2"
            >
              <Mail size={20} />
              <span className="hidden md:inline">Enviar por Correo</span>
            </button>
            <button
              onClick={loadClosingData}
              className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-xl transition-all"
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
