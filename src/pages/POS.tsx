import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import { useAuth } from '@/hooks/useAuth'
import supabaseService from '@/services/supabaseService'
import { APP_CONFIG } from '@/config/constants'
import ProductGrid from '@/components/pos/ProductGrid'
import OrderPanel from '@/components/pos/OrderPanel'
import CartSummary from '@/components/pos/CartSummary'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
// TipsWidget se mueve a la página Ready
import { Product, OrderItem } from '@/types/index'
import { sendNotificationToUsers } from '@/services/sendNotificationHelper'
import { Bell, ShoppingCart, Pencil, User } from 'lucide-react'
import printService from '@/services/printService'

export default function POS() {
  const navigate = useNavigate()
  const {
    currentUser,
    products,
    setProducts,
    tables,
    currentTableNumber,
    setCurrentTable,
    draftOrders,
    addItemToDraft,
    incrementDraftItem,
    decrementDraftItem,
    removeDraftItem,
    clearDraftForTable,
  } = useAppStore()
  
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [stockError, setStockError] = useState<string | undefined>()
  const [readyOrdersCount, setReadyOrdersCount] = useState(0)
  const [activeTableOrders, setActiveTableOrders] = useState<any[]>([]) // Estado para "Mesa Viva"
  const [paymentDraftItems, setPaymentDraftItems] = useState<OrderItem[]>([])
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const prevReadyCountRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [paymentPanel, setPaymentPanel] = useState<{
    isOpen: boolean
    orderIds: string[]
    orderTotal: number
  }>({
    isOpen: false,
    orderIds: [],
    orderTotal: 0,
  })
  const [activeTab, setActiveTab] = useState<'order' | 'products'>('order')

  const tableNumber = currentTableNumber || 1
  const items = draftOrders[tableNumber] || []
  const isReadOnly = false

  useEffect(() => {
    // Audio de notificación
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiDYIF2W79+qbUg8OTqvn8raKOwcVa7r3GMUBAAAAAAABAAAAA')
    loadProducts()
  }, [])

  // Monitorear órdenes listas en tiempo real
  useEffect(() => {
    const unsubscribe = supabaseService.subscribeToOrdersByStatus('ready', (readyOrders) => {
      const count = readyOrders.length
      setReadyOrdersCount(count)

      // Reproducir sonido cuando aumenta el contador
      if (count > prevReadyCountRef.current && prevReadyCountRef.current > 0) {
        audioRef.current?.play().catch(e => logger.warn('pos', 'No se pudo reproducir audio', e as any))
      }

      prevReadyCountRef.current = count
    })

    return () => unsubscribe?.()
  }, [])

  // Monitorear órdenes activas de la mesa actual (Persistencia visual)
  useEffect(() => {
    if (!currentTableNumber) {
      setActiveTableOrders([])
      return
    }
    // Suscribirse a cambios en órdenes para mantener la mesa "viva"
    const unsubscribe = supabaseService.subscribeToActiveOrders((orders) => {
      setActiveTableOrders(orders.filter(o => o.tableNumber === currentTableNumber))
    })
    return () => unsubscribe?.()
  }, [currentTableNumber])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const prods = await supabaseService.getAllProducts()
      setProducts(prods)
    } catch (error) {
      logger.error('pos', 'Error loading products', error as any)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateItemNote = (itemId: string, note: string) => {
    useAppStore.setState(state => {
        const tableDraft = state.draftOrders[tableNumber] || [];
        const updatedDraft = tableDraft.map(item => 
            item.id === itemId ? { ...item, notes: note } : item
        );
        return {
            draftOrders: {
                ...state.draftOrders,
                [tableNumber]: updatedDraft
            }
        };
    });
  }

  const handlePrintAccount = async () => {
    if (items.length === 0) return
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.16
    const total = subtotal + tax
    const date = new Date().toLocaleString('es-MX')

    const lines = items
      .map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.quantity}x ${item.productName}</span>
          <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
      `)
      .join('')

    // Cálculos de propina sugerida
    const tip10 = subtotal * 0.10
    const tip15 = subtotal * 0.15
    const tip20 = subtotal * 0.20

    const html = `
      <div style="width:58mm;padding:8px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
        <div style="text-align:center;margin-bottom:8px;border-bottom:1px solid #000;">
          <div style="font-weight:bold;font-size:12px;">CEVICHERIA MEXA</div>
          <div style="font-size:9px;">Restaurante y Marisquería</div>
          <div style="font-size:9px;">Mesa ${tableNumber}</div>
        </div>
        <div style="margin-bottom:6px;font-size:9px;">
          <div>Fecha: ${date}</div>
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          ${lines}
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>IVA (16%):</span>
            <span>$${tax.toFixed(2)}</span>
          </div>
          <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:12px;">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          <div style="text-align:center;font-weight:bold;margin-bottom:4px;">PROPINA SUGERIDA</div>
          <div style="display:flex;justify-content:space-between;font-size:10px;">
            <span>10%: $${tip10.toFixed(2)}</span>
            <span>15%: $${tip15.toFixed(2)}</span>
          </div>
          <div style="text-align:center;font-size:10px;margin-top:2px;">
            <span>20%: $${tip20.toFixed(2)}</span>
          </div>
        </div>
        <div style="text-align:center;font-size:9px;margin-top:8px;">
          <div>Este no es comprobante fiscal.</div>
          <div style="margin-top:4px;font-size:8px;">Gracias por su preferencia</div>
        </div>
      </div>
    `

    try {
      await printService.printReceipt(html, { title: 'Cuenta', width: 58 })
    } catch (e) {
      // errores ya se registran en printService
    }
  }

  const handleAddProduct = (product: Product) => {
    if (!currentUser || isReadOnly) return
    addItemToDraft(tableNumber, product, currentUser.id)
  }

  const handleSendToKitchen = async () => {
    if (!currentUser || items.length === 0 || isReadOnly || sending) return

    setSending(true)
    setStockError(null)
    try {
      // Validar stock disponible
      const stockUpdates: { productId: string; quantity: number }[] = []
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)
        if (product?.hasInventory) {
          const available = product.currentStock ?? 0
          if (available < item.quantity) {
            setStockError(`No hay stock suficiente de "${product.name}". Disponible: ${available}, Solicitado: ${item.quantity}`)
            return
          }
          stockUpdates.push({ productId: item.productId, quantity: -item.quantity })
        }
      }

      // Separar items por categoría: Comida → Cocina, Bebidas → Bar
      const foodItems = items.filter(item => {
        const product = products.find(p => p.id === item.productId)
        return product?.category !== 'Bebidas'
      })
      
      const drinkItems = items.filter(item => {
        const product = products.find(p => p.id === item.productId)
        return product?.category === 'Bebidas'
      })

      const orderIds: string[] = []

      // Crear orden para Cocina (comida)
      if (foodItems.length > 0) {
        const foodOrderId = await supabaseService.createOrder({
          tableNumber,
          items: foodItems,
          status: 'sent',
          createdBy: currentUser.id,
          createdAt: new Date(),
          notes: '🍽️ Comida',
        })
        orderIds.push(foodOrderId)

        // Notificar a cocina
        try {
          await sendNotificationToUsers({
            roles: ['cocina'],
            title: `🍽️ Nueva orden cocina - Mesa ${tableNumber}`,
            body: `${foodItems.length} platillo(s)`,
            type: 'order',
            priority: 'high',
            data: {
              orderId: foodOrderId,
              tableNumber: tableNumber.toString(),
              itemCount: foodItems.length.toString()
            }
          })
        } catch (notifError) {
          logger.warn('pos', 'No se pudo notificar a cocina', notifError as any)
        }
      }

      // Crear orden para Bar (bebidas)
      if (drinkItems.length > 0) {
        const drinkOrderId = await supabaseService.createOrder({
          tableNumber,
          items: drinkItems,
          status: 'sent',
          createdBy: currentUser.id,
          createdAt: new Date(),
          notes: '🍹 Bebidas',
        })
        orderIds.push(drinkOrderId)

        // Notificar a bar
        try {
          await sendNotificationToUsers({
            roles: ['bar'],
            title: `🍹 Nueva orden bar - Mesa ${tableNumber}`,
            body: `${drinkItems.length} bebida(s)`,
            type: 'order',
            priority: 'high',
            data: {
              orderId: drinkOrderId,
              tableNumber: tableNumber.toString(),
              itemCount: drinkItems.length.toString()
            }
          })
        } catch (notifError) {
          logger.warn('pos', 'No se pudo notificar a bar', notifError as any)
        }
      }

      // Decrementar stock
      if (stockUpdates.length > 0) {
        await supabaseService.updateProductStockBatch(stockUpdates)
        const updatedProducts = await supabaseService.getAllProducts()
        setProducts(updatedProducts)
      }

      // Limpiar carrito y mostrar confirmación
      clearDraftForTable(tableNumber)
      const summary = []
      if (foodItems.length > 0) summary.push(`${foodItems.length} comida`)
      if (drinkItems.length > 0) summary.push(`${drinkItems.length} bebidas`)
      alert(`✅ Orden enviada - Mesa ${tableNumber}\n${summary.join(' + ')}`)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar orden'
      setStockError(message)
      logger.error('pos', 'Error creating order', error as any)
    } finally {
      setSending(false)
    }
  }

  const handleOpenPaymentPanel = () => {
    const payableStatuses = ['sent', 'preparing', 'ready', 'served']
    const payableOrders = activeTableOrders.filter(order => payableStatuses.includes(order.status))

    if (payableOrders.length > 0) {
      const total = payableOrders.reduce(
        (sum, order) => sum + (order.items || []).reduce((s: number, item: OrderItem) => s + item.unitPrice * item.quantity, 0),
        0
      )

      setPaymentDraftItems([])
      setPaymentPanel({
        isOpen: true,
        orderIds: payableOrders.map(order => order.id),
        orderTotal: total,
      })
      return
    }

    if (items.length > 0) {
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      setPaymentDraftItems(items)
      setPaymentPanel({
        isOpen: true,
        orderIds: [],
        orderTotal: total,
      })
      return
    }

    alert('No hay ordenes ni productos en el carrito para cobrar')
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!currentUser || isReadOnly) return

    try {
      const mappedMethod =
        result.paymentMethod === 'mercadopago'
          ? 'clip'
          : result.paymentMethod === 'transfer'
          ? 'digital'
          : 'cash'

      const orderIds = paymentPanel.orderIds
      const itemsToCharge =
        orderIds.length > 0
          ? activeTableOrders
              .filter(order => orderIds.includes(order.id))
              .flatMap(order => order.items || [])
          : paymentDraftItems

      if (itemsToCharge.length === 0) {
        throw new Error('No hay items para procesar el pago')
      }

      // Registrar venta
      await supabaseService.createSale({
        orderIds,
        tableNumber,
        items: itemsToCharge,
        subtotal: paymentPanel.orderTotal,
        discounts: 0,
        tax: 0,
        total: result.total,
        paymentMethod: mappedMethod as any,
        tip: result.tip,
        tipSource: result.tip > 0 ? (mappedMethod === 'cash' ? 'cash' : 'digital') : 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)

      // IMPORTANTE: Marcar órdenes activas como completadas cuando existen
      if (orderIds.length > 0) {
        for (const orderId of orderIds) {
          await supabaseService.updateOrderStatus(orderId, 'completed')
        }
      }

      // Imprimir ticket final con monto, propina y método de pago
      try {
        const subtotal = paymentPanel.orderTotal
        const tax = 0
        const total = result.total
        const date = new Date().toLocaleString('es-MX')

        const lines = itemsToCharge
          .map(item => `
            <div style="display:flex;justify-content:space-between;margin:2px 0;">
              <span>${item.quantity}x ${item.productName}</span>
              <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          `)
          .join('')

        const html = `
          <div style="width:58mm;padding:8px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
            <div style="text-align:center;margin-bottom:8px;border-bottom:1px solid #000;">
              <div style="font-weight:bold;font-size:12px;">CEVICHERIA MEXA</div>
              <div style="font-size:9px;">Restaurante y Marisquería</div>
              <div style="font-size:9px;">Mesa ${tableNumber}</div>
              <div style="font-size:9px;">Ticket: ${orderIds[0] ? orderIds[0].slice(0, 8) : `MESA-${tableNumber}`}</div>
            </div>
            <div style="margin-bottom:6px;font-size:9px;">
              <div>Fecha: ${date}</div>
            </div>
            <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
              ${lines}
            </div>
            <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
              <div style="display:flex;justify-content:space-between;margin:2px 0;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin:2px 0;">
                <span>Impuesto:</span>
                <span>$${tax.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin:2px 0;">
                <span>Propina:</span>
                <span>$${(result.tip || 0).toFixed(2)}</span>
              </div>
              <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:12px;">
                <span>TOTAL:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
            <div style="text-align:center;font-size:9px;margin-top:8px;">
              <div>Pagado: ${mappedMethod.toUpperCase()}</div>
              <div style="margin-top:4px;font-size:8px;">Gracias por su preferencia</div>
            </div>
          </div>
        `

        await printService.printReceipt(html, { title: 'Ticket de Pago', width: 58 })
      } catch (printErr) {
        logger.warn('pos', 'No se pudo imprimir ticket final', printErr as any)
      }

      // Limpiar carrito solo cuando el cobro vino de borrador local
      if (orderIds.length === 0) {
        clearDraftForTable(tableNumber)
      }
      setPaymentDraftItems([])

      // Cerrar panel de pago
      setPaymentPanel({ isOpen: false, orderIds: [], orderTotal: 0 })

      logger.info('pos', 'Sale recorded', {
        orderIds,
        transactionId: result.transactionId,
      })
    } catch (error) {
      logger.error('pos', 'Error recording sale', error as any)
      setStockError('Error al registrar la venta')
    }
  }

  const tableButtons = useMemo(() => {
    const baseTables = tables.length ? tables : Array.from({ length: APP_CONFIG.TABLES.NUMBERED_TABLES }, (_, i) => i + 1)
    return baseTables
  }, [tables])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-gray-50">
      {/* Background Doodle */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '450px',
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-teal-500/5 z-0 pointer-events-none" />

      <div className="relative z-10">
      {/* Header - Mismo gradiente que Ready - Fijo al hacer scroll */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <ShoppingCart size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Punto de Venta</h1>
                <p className="text-blue-100 text-sm">Sistema en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {readyOrdersCount > 0 && (
                <div 
                  onClick={() => navigate('/ready')}
                  className="relative px-5 py-3 bg-rose-600 rounded-xl font-bold flex items-center gap-2 animate-pulse shadow-lg cursor-pointer hover:scale-105 transition-transform"
                >
                  <Bell size={24} className="animate-bounce" />
                  <div>
                    <p className="text-lg">{readyOrdersCount} {readyOrdersCount === 1 ? 'orden lista' : 'órdenes listas'}</p>
                    <p className="text-xs opacity-90">Ve a &quot;Listas&quot; para servir</p>
                  </div>
                </div>
              )}
              
              {/* User Panel */}
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold leading-none">{currentUser?.username || 'Usuario'}</p>
                  <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold">{currentUser?.role || 'Staff'}</p>
                </div>
                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold border-2 border-white/20 shadow-inner">
                  {currentUser?.username?.charAt(0).toUpperCase() || <User size={20} />}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-blue-100">Mesa actual</p>
                <p className="text-2xl font-bold">{tableNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mobile tabs to avoid overlapping and confusing scroll */}
        <div className="xl:hidden mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('order')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'order' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Orden
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'products' ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Productos
            </button>
          </div>
        </div>

        {/* Barra Flotante "Anti-despistados" (Móvil y Desktop) */}
        {items.length > 0 && (
          <div className={`fixed bottom-4 left-4 right-4 z-50 animate-bounce-in ${activeTab === 'order' ? 'hidden xl:block' : ''}`}>
            <button
              onClick={() => setActiveTab('order')}
              className="w-full bg-gradient-to-r from-slate-900 to-teal-800 text-white p-4 rounded-xl shadow-2xl flex justify-between items-center border border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white text-indigo-600 px-3 py-1 rounded-lg font-black text-sm">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} items
                </span>
                <span className="font-bold">Ver Orden Actual</span>
              </div>
              <span className="font-black text-xl">${items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}</span>
            </button>
          </div>
        )}

        {/* Mobile: show one view at a time */}
        <div className="xl:hidden space-y-6">
          {activeTab === 'order' ? (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Mesas</h2>
                  <span className="text-xs font-medium text-gray-500">Selecciona para editar</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {tableButtons.map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentTable(num)}
                      className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                        tableNumber === num
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      Mesa {num}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    onClick={handlePrintAccount}
                    disabled={items.length === 0}
                    className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                      items.length === 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    Imprimir Cuenta (Mesa)
                  </button>
                </div>
                {APP_CONFIG.TABLES.HAS_COURTESY_TABLE && (
                  <button
                    onClick={() => setCurrentTable(APP_CONFIG.TABLES.COURTESY_TABLE_NUMBER)}
                    className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      tableNumber === APP_CONFIG.TABLES.COURTESY_TABLE_NUMBER
                        ? 'bg-green-700 text-white'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    Mesa de cortesía
                  </button>
                )}
              </div>

              <OrderPanel
                tableNumber={tableNumber}
                items={items}
                activeOrders={activeTableOrders} // Pasamos las órdenes vivas
                onIncrement={itemId => {
                  if (isReadOnly) return
                  incrementDraftItem(tableNumber, itemId)
                }}
                onDecrement={itemId => {
                  if (isReadOnly) return
                  decrementDraftItem(tableNumber, itemId)
                }}
                onRemove={itemId => {
                  if (isReadOnly) return
                  removeDraftItem(tableNumber, itemId)
                }}
                onEditNote={(item) => {
                  if (isReadOnly) return
                  setEditingItem(item)
                }}
              />

              <CartSummary
                tableNumber={tableNumber}
                items={items}
                onSend={handleSendToKitchen}
                onClear={() => {
                  if (isReadOnly) return
                  clearDraftForTable(tableNumber)
                }}
                sending={sending}
                products={products}
                stockError={stockError}
              />

              <button
                onClick={handleOpenPaymentPanel}
                className="w-full rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all transform flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:scale-[1.02]"
              >
                Abrir caja / cobrar mesa
              </button>
            </>
          ) : (
            <ProductGrid
              products={products}
              onAdd={handleAddProduct}
              disableAdd={isReadOnly}
            />
          )}
        </div>

        {/* Desktop/XL: two-column layout */}
        <div className="hidden xl:grid xl:grid-cols-[340px,1fr] gap-6">
          <div className="space-y-6 sticky top-24 h-fit">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Mesas</h2>
                <span className="text-xs font-medium text-gray-500">Selecciona para editar</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {tableButtons.map(num => (
                  <button
                    key={num}
                    onClick={() => setCurrentTable(num)}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                      tableNumber === num
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Mesa {num}
                  </button>
                ))}
              </div>
                <div className="mt-3">
                  <button
                    onClick={handlePrintAccount}
                    disabled={items.length === 0}
                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      items.length === 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    Imprimir Cuenta (Mesa)
                  </button>
                </div>
              {APP_CONFIG.TABLES.HAS_COURTESY_TABLE && (
                <button
                  onClick={() => setCurrentTable(APP_CONFIG.TABLES.COURTESY_TABLE_NUMBER)}
                  className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    tableNumber === APP_CONFIG.TABLES.COURTESY_TABLE_NUMBER
                      ? 'bg-green-700 text-white'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  Mesa de cortesía
                </button>
              )}
            </div>

            <OrderPanel
              tableNumber={tableNumber}
              items={items}
              activeOrders={activeTableOrders} // Pasamos las órdenes vivas
              onIncrement={itemId => {
                if (isReadOnly) return
                incrementDraftItem(tableNumber, itemId)
              }}
              onDecrement={itemId => {
                if (isReadOnly) return
                decrementDraftItem(tableNumber, itemId)
              }}
              onRemove={itemId => {
                if (isReadOnly) return
                removeDraftItem(tableNumber, itemId)
              }}
              onEditNote={(item) => {
                if (isReadOnly) return
                setEditingItem(item)
              }}
            />

            <CartSummary
              tableNumber={tableNumber}
              items={items}
              onSend={handleSendToKitchen}
              onClear={() => {
                if (isReadOnly) return
                clearDraftForTable(tableNumber)
              }}
              sending={sending}
              products={products}
              stockError={stockError}
            />

            <button
              onClick={handleOpenPaymentPanel}
              className="w-full rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all transform flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:scale-[1.02]"
            >
              Abrir caja / cobrar mesa
            </button>
          </div>

          <ProductGrid
            products={products}
            onAdd={handleAddProduct}
            disableAdd={isReadOnly}
          />
        </div>
      </div>
      </div>

      {/* Payment Panel */}
      {paymentPanel.isOpen && (
        <PaymentPanel
          orderIds={paymentPanel.orderIds}
          orderTotal={paymentPanel.orderTotal}
          tableNumber={tableNumber}
          onPaymentComplete={handlePaymentComplete}
          onCancel={() => setPaymentPanel({ isOpen: false, orderIds: [], orderTotal: 0 })}
        />
      )}

      {/* Modal para agregar notas */}
      <OrderNoteModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        itemName={editingItem?.productName}
        initialNote={editingItem?.notes || ''}
        onSave={(note) => {
          if (editingItem) {
            handleUpdateItemNote(editingItem.id, note);
          }
        }}
      />
    </div>
  )
}
