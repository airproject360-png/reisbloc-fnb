import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'
import { Order, OrderItem } from '@/types'
import { LayoutDashboard, ArrowLeftRight, XCircle, Timer, Edit, CheckCircle, CreditCard, Printer } from 'lucide-react'
import EditOrderModal from '@/components/admin/EditOrderModal'

interface TransferState {
  [orderId: string]: number
}

const normalizeDate = (value: any): Date => {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  return new Date(value)
}

const humanizeDuration = (date: Date) => {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return 'Hace un momento'
  if (minutes === 1) return 'Hace 1 minuto'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `Hace ${hours}h ${remaining}m`
}

// Helper para colores de mesas
const getTableColorStyles = (tableNum: number) => {
  const styles = [
    { bg: 'bg-slate-50', border: 'border-slate-200', header: 'from-slate-50 to-slate-100', text: 'text-slate-900', icon: 'text-slate-600' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'from-emerald-50 to-teal-50', text: 'text-emerald-900', icon: 'text-emerald-600' },
    { bg: 'bg-teal-50', border: 'border-teal-200', header: 'from-teal-50 to-cyan-50', text: 'text-teal-900', icon: 'text-teal-600' },
    { bg: 'bg-amber-50', border: 'border-amber-200', header: 'from-amber-50 to-stone-100', text: 'text-amber-900', icon: 'text-amber-600' },
    { bg: 'bg-stone-50', border: 'border-stone-200', header: 'from-stone-50 to-slate-100', text: 'text-stone-900', icon: 'text-stone-600' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', header: 'from-cyan-50 to-slate-100', text: 'text-cyan-900', icon: 'text-cyan-600' },
  ]
  return styles[(tableNum - 1) % styles.length] || styles[0]
}

export default function TableMonitor() {
  const { currentUser, tables } = useAppStore()
  const permissions = usePermissions()
  const canAccessTableMonitor = permissions.canAccessTableMonitor || currentUser?.role === 'capitan'
  const canManageTables = permissions.canManageTables || currentUser?.role === 'capitan'
  const canModifyOrders = permissions.canModifyOrders || currentUser?.role === 'capitan'
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transferTargets, setTransferTargets] = useState<TransferState>({})
  const [busyOrders, setBusyOrders] = useState<Record<string, boolean>>({})
  const [editOrder, setEditOrder] = useState<Order | null>(null)

  // Estado para el Modal de Cobro Rápido (Efectivo / Tarjeta / Transferencia)
  const [fastPaymentData, setFastPaymentData] = useState<{
    tableNumber: number
    orderIds: string[]
    orders: Order[]
    total: number
  } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [cashReceived, setCashReceived] = useState<string>('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [showChangeCalculator, setShowChangeCalculator] = useState(false)
  const [enablePriceAdjustment, setEnablePriceAdjustment] = useState(false)
  const [adjustedTotal, setAdjustedTotal] = useState<string>('')
  const [adjustmentReason, setAdjustmentReason] = useState<string>('')
  const [ticketNotes, setTicketNotes] = useState<string>('')

  const canAdjustSale = currentUser?.role === 'admin' || currentUser?.role === 'capitan'

  const buildTicketHTML = (
    ordersList: Order[],
    tableNumber: number,
    title = 'Cuenta',
    paymentDetails?: { tip: number; total: number; method: string; adjustmentNote?: string },
    customNotes?: string
  ): string => {
    const allItems = ordersList.flatMap(o => o.items || [])
    const total = paymentDetails?.total ?? allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const dateStr = new Date().toLocaleString('es-MX')
    const ticketFolio = ordersList[0]?.id ? ordersList[0].id.slice(-8).toUpperCase() : `LOC-${Date.now().toString().slice(-6)}`
    const isPaymentTicket = Boolean(paymentDetails)

    const lines = allItems
      .map(item => `
        <div style="margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:bold;">
            <span>${item.quantity}x ${item.productName}</span>
            <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
          </div>
          <div style="font-size:9px;color:#555;margin-left:10px;">
            P.U. $${item.unitPrice.toFixed(2)}
          </div>
          ${item.notes ? `<div style="font-size:9px;font-style:italic;margin-left:10px;">↳ ${item.notes}</div>` : ''}
        </div>
      `)
      .join('')

    return `
      <div style="width:58mm;padding:6px;font-family:'Courier New', monospace;font-size:11px;line-height:1.25;color:#000;">
        <!-- Header Logo & Store Name -->
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
          <div style="font-weight:900;font-size:16px;letter-spacing:1px;">LOCALITO</div>
          <div style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-top:1px;">Guisos & Barra Fría</div>
          <div style="font-size:9px;color:#333;margin-top:2px;">localito.reisbloc.com</div>
          <div style="font-size:10px;font-weight:bold;margin-top:4px;border:1px solid #000;padding:2px 0;">
            ${isPaymentTicket ? '*** TICKET DE VENTA ***' : '*** CUENTA DE CONSUMO ***'}
          </div>
        </div>

        <!-- Ticket Metadata -->
        <div style="font-size:9px;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;">
            <span><strong>Cuenta:</strong> #${tableNumber}</span>
            <span><strong>Folio:</strong> ${ticketFolio}</span>
          </div>
          <div style="margin-top:2px;">Fecha: ${dateStr}</div>
          <div>Atendido por: ${currentUser?.username || currentUser?.name || 'Personal LOCALITO'}</div>
        </div>

        ${customNotes ? `
        <!-- Custom Customer & Order Notes -->
        <div style="border:1px dashed #000;padding:4px;margin-bottom:6px;font-size:9px;background:#f9f9f9;">
          <div style="font-weight:bold;">NOTAS / DIRECCIÓN DEL PEDIDO:</div>
          <div>${customNotes}</div>
        </div>
        ` : ''}

        <!-- Itemized List -->
        <div style="border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:9px;border-bottom:1px stroke #ccc;padding-bottom:2px;margin-bottom:4px;">
            <span>CANT / DESCRIPCIÓN</span>
            <span>IMPORTE</span>
          </div>
          ${lines || '<div style="text-align:center;font-size:10px;">(Sin consumos registrados)</div>'}
        </div>

        <!-- Totals -->
        <div style="border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;">
            <span>${isPaymentTicket ? 'TOTAL PAGADO:' : 'TOTAL A PAGAR:'}</span>
            <span>$${total.toFixed(2)} MXN</span>
          </div>
          ${paymentDetails ? `
          <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px;">
            <span>FORMA DE PAGO:</span>
            <span><strong>${paymentDetails.method.toUpperCase()}</strong></span>
          </div>
          ` : ''}
          ${paymentDetails?.adjustmentNote ? `
          <div style="font-size:9px;color:#333;margin-top:4px;font-style:italic;">
            * Ajuste autorizado por administración: ${paymentDetails.adjustmentNote}
          </div>
          ` : ''}
        </div>

        <!-- Fancy Footer -->
        <div style="text-align:center;font-size:9px;margin-top:6px;">
          <div style="font-weight:bold;font-size:10px;">¡GRACIAS POR SU PREFERENCIA!</div>
          <div style="margin-top:4px;font-size:8px;color:#444;">Powered by Reisbloc (reisbloc.com)</div>
        </div>
      </div>
    `
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
  }

  const handlePrintTable = async (tableOrders: Order[], tableNumber: number, title = 'Cuenta', paymentDetails?: { tip: number, total: number, method: string }) => {
    try {
      const ticketHTML = buildTicketHTML(tableOrders, tableNumber, title, paymentDetails)
      await printService.printReceipt(ticketHTML, { title: `Cuenta Mesa ${tableNumber}`, width: 58 })
    } catch (err) {
      logger.warn('print', 'Error imprimiendo ticket:', err as any)
    }
  }

  const calculateOrderTotal = (order?: Order | null) => {
    if (!order?.items?.length) return 0
    return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  }

  useEffect(() => {
    if (!canAccessTableMonitor) return

    setLoading(true)
    const unsubscribe = supabaseService.subscribeToActiveOrders(
      data => {
        const normalized = data.map(order => ({
          ...order,
          createdAt: normalizeDate((order as any).createdAt),
          updatedAt: normalizeDate((order as any).updatedAt),
          sentToKitchenAt: normalizeDate((order as any).sentToKitchenAt),
          closedAt: normalizeDate((order as any).closedAt),
        }))
        setOrders(normalized)
        setLoading(false)
        setError(null)
      },
      message => {
        setError(message)
        setLoading(false)
      }
    )

    return () => {
      unsubscribe?.()
    }
  }, [canAccessTableMonitor])

  const groupedByTable = useMemo(() => {
    const map = new Map<number, Order[]>()
    // FILTRAR ESTRICTAMENTE SOLO ÓRDENES ACTIVAS (sent, preparing, ready, served)
    const activeOrdersOnly = orders.filter(o => ['sent', 'preparing', 'ready', 'served'].includes(o.status))

    activeOrdersOnly.forEach(order => {
      const table = order.tableNumber || 0
      const list = map.get(table) || []
      map.set(table, [...list, order])
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([tableNumber, list]) => ({
        tableNumber: tableNumber || 0,
        orders: list.sort((a, b) => {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0
          const bTime = b.createdAt ? b.createdAt.getTime() : 0
          return bTime - aTime
        }),
      }))
  }, [orders])

  const handleTransfer = async (orderId: string) => {
    const target = transferTargets[orderId]
    if (!target) return

    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrder(orderId, { tableNumber: target })
    } catch (err: any) {
      setError(err?.message || 'No se pudo transferir la cuenta')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleMarkServed = async (orderId: string) => {
    if (!currentUser) return

    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrderStatus(orderId, 'served')
    } catch (err: any) {
      setError(err?.message || 'No se pudo marcar como servida')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleEditOrder = async (updatedItems: any[], notes: string) => {
    if (!currentUser || !editOrder) return

    setBusyOrders(prev => ({ ...prev, [editOrder.id]: true }))
    try {
      await supabaseService.updateOrder(editOrder.id, { items: updatedItems, notes })
      setEditOrder(null)
      alert('✅ Orden actualizada exitosamente')
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la orden')
      throw err
    } finally {
      setBusyOrders(prev => ({ ...prev, [editOrder.id]: false }))
    }
  }

  const handleCancelOrder = async (reason: string) => {
    if (!currentUser || !editOrder) return

    setBusyOrders(prev => ({ ...prev, [editOrder.id]: true }))
    try {
      await supabaseService.updateOrder(editOrder.id, { status: 'cancelled', cancelReason: reason, cancelledBy: currentUser.id, cancelledAt: new Date() })
      setEditOrder(null)
      alert('✅ Orden cancelada exitosamente')
    } catch (err: any) {
      setError(err?.message || 'No se pudo cancelar la orden')
      throw err
    } finally {
      setBusyOrders(prev => ({ ...prev, [editOrder.id]: false }))
    }
  }

  // ABRIR MODAL DE COBRO RÁPIDO PARA UNA MESA / CUENTA
  const handleOpenPaymentModal = (tableNumber: number, ordersList: Order[]) => {
    const allItems = ordersList.flatMap(o => o.items || [])
    const total = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const orderIds = ordersList.map(o => o.id)

    setFastPaymentData({
      tableNumber,
      orderIds,
      orders: ordersList,
      total
    })
    setPaymentMethod('cash')
    setCashReceived(total.toString())
    setShowChangeCalculator(false)
    setEnablePriceAdjustment(false)
    setAdjustedTotal(total.toString())
    setAdjustmentReason('')
    setTicketNotes('')
  }

  // CONFIRMAR PAGO (DEDUCE RECETA + VENTA BD + IMPRIME TICKET 58mm + CIERRA CUENTA)
  const handleConfirmFastPayment = async () => {
    if (!currentUser || !fastPaymentData || isProcessingPayment) return

    const originalTotal = fastPaymentData.total
    const isAdjusted = canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0 && parseFloat(adjustedTotal) !== originalTotal
    const finalTotal = isAdjusted ? parseFloat(adjustedTotal) : originalTotal

    if (isAdjusted && !adjustmentReason.trim()) {
      alert('⚠️ Para realizar un ajuste al total de la venta, es OBLIGATORIO ingresar el motivo en el apartado de notas.')
      return
    }

    const received = parseFloat(cashReceived) || finalTotal

    if (paymentMethod === 'cash' && received < finalTotal) {
      alert(`⚠️ El monto recibido ($${received.toFixed(2)}) es menor al total a pagar ($${finalTotal.toFixed(2)}).`)
      return
    }

    setIsProcessingPayment(true)
    const { tableNumber, orderIds, orders: ordersToProcess } = fastPaymentData

    try {
      const allItems = ordersToProcess.flatMap(o => o.items || [])
      const mappedMethod = paymentMethod === 'card' ? 'card' : paymentMethod === 'transfer' ? 'transfer' : 'cash'

      // Si hubo ajuste de precio por Admin/Capitán, registrar en audit_logs de Supabase
      if (isAdjusted) {
        try {
          await supabaseService.logAudit({
            organization_id: supabaseService.getCurrentOrgId(),
            user_id: currentUser.id,
            action: 'SALE_AMOUNT_ADJUSTED',
            table_name: 'sales',
            record_id: `table-${tableNumber}`,
            changes: {
              originalTotal,
              adjustedTotal: finalTotal,
              difference: finalTotal - originalTotal,
              reason: adjustmentReason.trim(),
              authorizedBy: currentUser.username || currentUser.name,
              role: currentUser.role,
              tableNumber,
              orderIds,
              timestamp: new Date().toISOString(),
            },
          })
        } catch (auditErr) {
          logger.warn('audit', 'Error registrando log de auditoría:', auditErr as any)
        }
      }

      // 1. Registrar venta en Supabase DB
      await supabaseService.createSale({
        orderIds,
        tableNumber,
        items: allItems,
        subtotal: finalTotal,
        discounts: isAdjusted ? originalTotal - finalTotal : 0,
        tax: 0,
        total: finalTotal,
        paymentMethod: mappedMethod as any,
        tip: 0,
        tipSource: 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)

      // 2. Descontar recetas de inventario
      for (const ord of ordersToProcess) {
        try {
          await supabaseService.deductStockForOrder(ord)
        } catch (stkErr) {
          logger.warn('inventory', 'Advertencia descontando stock:', stkErr as any)
        }
      }

      // 3. Imprimir ticket de venta 58mm
      try {
        const ticketHTML = buildTicketHTML(
          ordersToProcess,
          tableNumber,
          'Ticket de Venta',
          {
            tip: 0,
            total: finalTotal,
            method: mappedMethod,
            adjustmentNote: isAdjusted ? adjustmentReason.trim() : undefined,
          },
          ticketNotes.trim() || undefined
        )
        await printService.printReceipt(ticketHTML, { title: 'Ticket de Venta', width: 58 })
      } catch (prtErr) {
        logger.warn('print', 'Advertencia imprimiendo ticket:', prtErr as any)
      }

      // 4. Marcar órdenes como completadas
      for (const orderId of orderIds) {
        await supabaseService.updateOrderStatus(orderId, 'completed')
      }

      // 5. Limpiar de la lista local
      setOrders(prev => prev.filter(o => !orderIds.includes(o.id)))
      setFastPaymentData(null)

      alert(`✅ Pago registrado exitosamente (Mesa #${tableNumber} · $${finalTotal.toFixed(2)} MXN)`)
    } catch (err: any) {
      alert(`❌ Error procesando el pago: ${err?.message || err}`)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  if (!canAccessTableMonitor) {
    return <Navigate to="/login" replace />
  }

  const availableTables: number[] = (tables || [1, 2, 3, 4, 5, 6, 99, 100]).map((t: any) => typeof t === 'number' ? t : t.number || Number(t))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                <LayoutDashboard size={22} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Cuentas / Mesas Activas</h1>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              Monitoreo de comensales, cobro rápido y cuentas pendientes de LOCALITO
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block">Mesas Abiertas:</span>
              <span className="text-xl font-black text-white">{groupedByTable.length}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Grid de Mesas / Cuentas */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">Cargando cuentas activas...</div>
        ) : groupedByTable.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <CheckCircle size={48} className="mx-auto text-teal-500/60 animate-bounce-subtle" />
            <h3 className="text-lg font-black text-white">No hay cuentas pendientes</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Todas las mesas están libres y pagadas. Las nuevas comandas enviadas desde el menú aparecerán aquí inmediatamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedByTable.map(({ tableNumber, orders: tableOrders }) => {
              const allItems = tableOrders.flatMap(o => o.items || [])
              const groupTotal = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
              const firstOrderDate = tableOrders[tableOrders.length - 1]?.createdAt || new Date()
              const tableLabel = tableNumber === 99 ? 'Barra' : tableNumber === 100 ? 'Para Llevar' : `Mesa #${tableNumber}`

              return (
                <div
                  key={`table-${tableNumber}`}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-amber-500/40 transition-all group"
                >
                  <div>
                    {/* Header de la Mesa */}
                    <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black flex items-center justify-center text-lg">
                          #{tableNumber}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">{tableLabel}</h3>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Timer size={12} className="text-amber-400" />
                            {humanizeDuration(firstOrderDate)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Cuenta:</span>
                        <span className="text-xl font-black text-amber-400">${groupTotal.toFixed(2)} <span className="text-xs font-normal text-slate-300">MXN</span></span>
                      </div>
                    </div>

                    {/* Desglose de Consumos */}
                    <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                      <p className="text-[10px] font-black uppercase tracking-wider text-teal-400">Consumos Registrados:</p>
                      <div className="space-y-2">
                        {allItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                            <span className="font-bold text-slate-200">
                              <span className="text-teal-400 font-black mr-1">{item.quantity}x</span>
                              {item.productName}
                            </span>
                            <span className="font-extrabold text-white">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la Mesa */}
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-2">
                    {canModifyOrders && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePrintTable(tableOrders, tableNumber, 'Cuenta')}
                          className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Printer size={15} />
                          <span>Imprimir Cuenta</span>
                        </button>
                        
                        <button
                          onClick={() => handleOpenPaymentModal(tableNumber, tableOrders)}
                          className="py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CreditCard size={15} />
                          <span>Cobrar Cuenta</span>
                        </button>
                      </div>
                    )}

                    {canManageTables && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setEditOrder(tableOrders[0])}
                          className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                        >
                          <Edit size={13} />
                          <span>Editar</span>
                        </button>

                        <div className="flex-1 flex items-center gap-1">
                          <select
                            value={transferTargets[tableOrders[0]?.id] || ''}
                            onChange={(e) => setTransferTargets(prev => ({ ...prev, [tableOrders[0]?.id]: Number(e.target.value) }))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-[11px] font-bold focus:outline-none"
                          >
                            <option value="">Transferir a...</option>
                            {availableTables.filter(t => t !== tableNumber).map(num => (
                              <option key={num} value={num}>Mesa #{num}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleTransfer(tableOrders[0]?.id)}
                            disabled={!transferTargets[tableOrders[0]?.id]}
                            className="p-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/40 rounded-xl disabled:opacity-40"
                            title="Transferir a mesa seleccionada"
                          >
                            <ArrowLeftRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MODAL DE COBRO RÁPIDO */}
        {fastPaymentData && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-black">
                  <CheckCircle size={22} />
                  <span className="text-lg">Cobrar Cuenta · Mesa #{fastPaymentData.tableNumber}</span>
                </div>
                <button
                  onClick={() => setFastPaymentData(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Total a Pagar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total a Cobrar:</span>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  ${fastPaymentData.total.toFixed(2)} <span className="text-sm font-normal text-slate-300">MXN</span>
                </div>
              </div>

              {/* Selector Método de Pago */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Selecciona Método de Pago:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: '💵 Efectivo' },
                    { id: 'card', label: '💳 Tarjeta' },
                    { id: 'transfer', label: '📲 Transfer' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all ${
                        paymentMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg scale-102'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculadora de Efectivo (Colapsable / Compacta) */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowChangeCalculator(!showChangeCalculator)}
                      className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <span>{showChangeCalculator ? '▼ Ocultar Calculadora de Cambio' : '▶ Calculadora de Cambio (Opcional)'}</span>
                    </button>
                  </div>

                  {showChangeCalculator && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400">Efectivo Recibido:</span>
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder={fastPaymentData.total.toString()}
                          className="w-28 px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right text-white font-black text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      {(() => {
                        const targetTotal = (canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0) ? parseFloat(adjustedTotal) : fastPaymentData.total
                        const rec = parseFloat(cashReceived) || targetTotal
                        const change = rec - targetTotal
                        return (
                          <div className="flex justify-between items-center text-xs font-bold border-t border-slate-800 pt-1.5">
                            <span className="text-slate-400">Cambio a Entregar:</span>
                            <span className={`text-sm font-black ${change >= 0 ? 'text-amber-400' : 'text-rose-500'}`}>
                              ${change >= 0 ? change.toFixed(2) : '0.00'} MXN
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Ajuste de Venta Exclusivo Admin & Capitán con Registro en LOG */}
              {canAdjustSale && (
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-400 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePriceAdjustment}
                        onChange={(e) => setEnablePriceAdjustment(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>Ajustar Monto de Venta (Admin/Capitán)</span>
                    </label>
                    <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
                      Audit Log
                    </span>
                  </div>

                  {enablePriceAdjustment && (
                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Nuevo Monto a Cobrar:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={adjustedTotal}
                          onChange={(e) => setAdjustedTotal(e.target.value)}
                          placeholder="Monto ajustado"
                          className="w-32 px-3 py-1.5 bg-slate-900 border border-amber-500/60 rounded-xl text-right text-amber-300 font-black text-sm focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">
                          Motivo del Ajuste * <span className="text-rose-400">(Obligatorio para auditoría)</span>:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Descuento cortesía 15%, Ajuste por queja, etc."
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Apartado de Notas del Pedido / Dirección para Ticket */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  📝 Notas / Dirección del Cliente (Se imprime en el Ticket):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Dirección: Av. Principal 123 Int 4B / Sin picante / Para llevar..."
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                onClick={handleConfirmFastPayment}
                disabled={isProcessingPayment}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-xl hover:shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Printer size={18} />
                <span>{isProcessingPayment ? 'Procesando Pago...' : 'Confirmar & Imprimir Ticket'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Editar Orden */}
        {editOrder && (
          <EditOrderModal
            order={editOrder}
            onClose={() => setEditOrder(null)}
            onSave={handleEditOrder}
            onCancel={handleCancelOrder}
          />
        )}
      </div>
    </div>
  )
}
