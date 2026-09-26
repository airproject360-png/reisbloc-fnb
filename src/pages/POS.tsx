import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import terminalSyncService, { KitchenOrderPrintPayload, ReceiptPrintPayload } from '@/services/terminalSyncService'
import { Product, OrderItem } from '@/types/index'
import printService from '@/services/printService'
import { buildTicketHTML, buildKitchenTicketHTML } from '@/utils/ticketTemplates'
import clipPinpadService from '@/services/clipPinpadService'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
import DarkKitchenRecipeModal from '@/components/admin/DarkKitchenRecipeModal'
import CategoryOrderModal from '@/components/pos/CategoryOrderModal'
import { getTenantSettings, LOCALITO_TABLE_LOCATIONS, getTableDisplayName } from '@/config/tenantConfig'
import {
  MapPin,
  ChefHat,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  X,
  FileText,
  Utensils,
  ShoppingBag,
  Store,
  Smartphone,
  Monitor,
  Eye,
  Edit,
  SlidersHorizontal
} from 'lucide-react'



export default function POS() {
  const navigate = useNavigate()
  const {
    currentUser,
    products,
    setProducts,
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
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS')
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Estados de cobro
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [cashReceived, setCashReceived] = useState<string>('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [showChangeCalculator, setShowChangeCalculator] = useState(false)
  const [enablePriceAdjustment, setEnablePriceAdjustment] = useState(false)
  const [applyFriendsAndFamily, setApplyFriendsAndFamily] = useState(false)
  const [adjustedTotal, setAdjustedTotal] = useState<string>('')
  const [adjustmentReason, setAdjustmentReason] = useState<string>('')
  const [posTicketNotes, setPosTicketNotes] = useState<string>('')
  const [isPinpadLoading, setIsPinpadLoading] = useState(false)
  const [pinpadStatusMsg, setPinpadStatusMsg] = useState<string | null>(null)

  const canAdjustSale = currentUser?.role === 'admin' || currentUser?.role === 'capitan'
  const tenant = getTenantSettings()

  // Ubicaciones dinámicas según tenant: Localito incluye Caja, Mesas 1-12, Periqueras 1-4, Barra y Para Llevar
  const tableLocations = useMemo(() => {
    if (tenant.isLocalito) {
      return LOCALITO_TABLE_LOCATIONS
    }
    return [
      { id: 1, label: 'Mesa 1' },
      { id: 2, label: 'Mesa 2' },
      { id: 3, label: 'Mesa 3' },
      { id: 4, label: 'Mesa 4' },
      { id: 5, label: 'Mesa 5' },
      { id: 6, label: 'Mesa 6' },
      { id: 7, label: 'Mesa 7' },
      { id: 8, label: 'Mesa 8' },
      { id: 9, label: 'Mesa 9' },
      { id: 10, label: 'Mesa 10' },
      { id: 11, label: 'Mesa 11' },
    ]
  }, [tenant.isLocalito])

  const currentLoc = useMemo(() => {
    if (currentTableNumber !== null && tableLocations.some(l => l.id === currentTableNumber)) {
      return currentTableNumber
    }
    return tableLocations[0]?.id ?? 1
  }, [currentTableNumber, tableLocations])
  const cartItems = draftOrders[currentLoc] || []
  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const isReadOnly = currentUser?.role === 'supervisor'

  const [showCategoryOrderModal, setShowCategoryOrderModal] = useState(false)
  const [customCategoryOrder, setCustomCategoryOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('localito_category_order') || localStorage.getItem('localito_categories')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .map((c: string) => c.toUpperCase().trim())
            .filter((c: string) => c !== 'QUESADILLAS HARINA' && c !== 'QUESADILLAS DE HARINA')
          if (cleaned.length > 0) {
            localStorage.setItem('localito_category_order', JSON.stringify(cleaned))
            localStorage.setItem('localito_categories', JSON.stringify(cleaned))
            return cleaned
          }
        }
      }
    } catch {}
    return ['QUESADILLAS MAÍZ', 'PLATOS', 'ESPECIALIDADES', 'EXTRAS', 'BEBIDAS']
  })

  // Categorías ordenadas según preferencia personalizada del negocio (Bebidas al final) en UPPERCASE estricto
  const categories = useMemo(() => {
    const prodCats = Array.from(
      new Set(
        (products || [])
          .map(p => (p.category || '').toUpperCase().trim())
          .filter(c => c && c !== 'QUESADILLAS HARINA' && c !== 'QUESADILLAS DE HARINA')
      )
    ) as string[]
    const allUnique = Array.from(new Set([...customCategoryOrder, ...prodCats]))
      .filter(c => c !== 'QUESADILLAS HARINA' && c !== 'QUESADILLAS DE HARINA')

    const sorted = allUnique.sort((a, b) => {
      let indexA = customCategoryOrder.indexOf(a)
      let indexB = customCategoryOrder.indexOf(b)

      if (indexA === -1) indexA = 990
      if (indexB === -1) indexB = 990

      // Si a o b es bebida y no estaba ordenado explícitamente, asegurar que vaya al final
      const isBevA = a.includes('BEBIDA') || a.includes('REFRESCO')
      const isBevB = b.includes('BEBIDA') || b.includes('REFRESCO')
      if (indexA >= 990 && isBevA) indexA = 999
      if (indexB >= 990 && isBevB) indexB = 999

      return indexA - indexB
    })

    return ['TODOS', ...sorted]
  }, [products, customCategoryOrder])

  const handleSaveCategoryOrder = (newOrder: string[]) => {
    const uppercaseOrder = newOrder
      .map(c => c.toUpperCase().trim())
      .filter(c => c !== 'QUESADILLAS HARINA' && c !== 'QUESADILLAS DE HARINA')
    setCustomCategoryOrder(uppercaseOrder)
    try {
      localStorage.setItem('localito_category_order', JSON.stringify(uppercaseOrder))
      localStorage.setItem('localito_categories', JSON.stringify(uppercaseOrder))
    } catch (err) {
      logger.warn('pos', 'Error guardando orden de categorías:', err as any)
    }
  }

  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmedOld = oldName.trim().toUpperCase()
    const trimmedNew = newName.trim().toUpperCase()
    if (!trimmedNew || trimmedOld === trimmedNew) return

    try {
      await supabaseService.updateCategoryName(trimmedOld, trimmedNew)
      setProducts(prev => prev.map(p => {
        if ((p.category || '').toUpperCase().trim() === trimmedOld) {
          return { ...p, category: trimmedNew }
        }
        return p
      }))
      const newOrder = customCategoryOrder.map(c => c === trimmedOld ? trimmedNew : c)
      handleSaveCategoryOrder(newOrder)
      if (selectedCategory === trimmedOld) {
        setSelectedCategory(trimmedNew)
      }
    } catch (err: any) {
      logger.error('pos', 'Error al renombrar categoría:', err)
      alert(`Error al renombrar categoría: ${err?.message || err}`)
    }
  }

  const handleSoftDeleteCategory = async (catName: string) => {
    const trimmed = catName.trim().toUpperCase()
    if (!confirm(`¿Eliminar la categoría "${trimmed}"? Esta acción removerá la categoría y sus platillos del menú activo (soft delete).`)) {
      return
    }

    try {
      await supabaseService.softDeleteCategory(trimmed)
      setProducts(prev => prev.filter(p => (p.category || '').toUpperCase().trim() !== trimmed))
      const newOrder = customCategoryOrder.filter(c => c !== trimmed)
      handleSaveCategoryOrder(newOrder)
      if (selectedCategory === trimmed) {
        setSelectedCategory('TODOS')
      }
    } catch (err: any) {
      logger.error('pos', 'Error al eliminar categoría:', err)
      alert(`Error al eliminar categoría: ${err?.message || err}`)
    }
  }

  const handleAddCategory = (newCat: string) => {
    const trimmed = newCat.trim().toUpperCase()
    if (!trimmed || trimmed === 'TODOS' || trimmed === 'QUESADILLAS HARINA' || trimmed === 'QUESADILLAS DE HARINA') return
    if (!customCategoryOrder.includes(trimmed)) {
      const newOrder = [...customCategoryOrder, trimmed]
      handleSaveCategoryOrder(newOrder)
    }
  }

  useEffect(() => {
    if (selectedCategory === 'QUESADILLAS HARINA' || selectedCategory === 'QUESADILLAS DE HARINA') {
      setSelectedCategory('TODOS')
    }
  }, [selectedCategory])

  useEffect(() => {
    setCurrentTable(0)
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const prods = await supabaseService.getAllProducts()
      setProducts(prods || [])
    } catch (error) {
      logger.error('pos', 'Error loading products', error as any)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const pCat = (p.category || '').toUpperCase().trim()
      const matchCat = selectedCategory === 'TODOS' || pCat === selectedCategory
      return matchCat
    })
  }, [products, selectedCategory])

  const getItemQuantityInCart = (productId: string) => {
    const found = cartItems.find(i => i.productId === productId)
    return found ? found.quantity : 0
  }

  const handleAddProduct = (product: Product) => {
    if (!currentUser || isReadOnly) return
    addItemToDraft(currentLoc, product, currentUser.id)
  }

  const handleUpdateNote = (note: string) => {
    if (!editingItem) return
    useAppStore.setState(state => {
      const tableDraft = state.draftOrders[currentLoc] || []
      const updated = tableDraft.map(item => item.id === editingItem.id ? { ...item, notes: note } : item)
      return { draftOrders: { ...state.draftOrders, [currentLoc]: updated } }
    })
    setEditingItem(null)
  }

  // Identificador único de estación (Computadora de Caja o iPad)
  const [stationId] = useState(() => {
    let id = localStorage.getItem('reisbloc_station_id')
    if (!id) {
      id = `pos-${Math.random().toString(36).substring(2, 8)}`
      localStorage.setItem('reisbloc_station_id', id)
    }
    return id
  })

  // ¿Esta estación es la Caja Principal que espejea su carrito en la Clip Total 3?
  const [isPrimaryCaja, setIsPrimaryCaja] = useState<boolean>(() => {
    const saved = localStorage.getItem('reisbloc_is_primary_caja')
    if (saved !== null) return saved === 'true'
    // Detectar si es computadora de escritorio (no iPad/móvil)
    const isMobile =
      /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    return !isMobile
  })

  // ¿Esta estación tiene la impresora térmica física conectada directamente (POS-58 en COM5 / USB)?
  // Por defecto: True en computadoras de escritorio (Caja), False en iPad/móvil
  const [hasPhysicalPrinter, setHasPhysicalPrinter] = useState<boolean>(() => {
    const saved = localStorage.getItem('reisbloc_has_physical_printer')
    if (saved !== null) return saved === 'true'
    const isMobile =
      /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    return !isMobile
  })

  const activeSaleRef = useRef<string | null>(null)
  const pinpadAbortRef = useRef<boolean>(false)

  // 🧑‍🍳 ENVIAR A COCINA (IMPRIME COMANDA 58mm O RETRANSMITE A CAJA PRINCIPAL)
  const handleSendToKitchen = async () => {
    if (!currentUser || cartItems.length === 0 || sending) return

    setSending(true)
    try {
      const locLabel = tableLocations.find(l => l.id === currentLoc)?.label || `Mesa ${currentLoc}`
      const waiterName = currentUser.username || currentUser.name || 'Personal de Servicio'

      const orderId = await supabaseService.createOrder({
        tableNumber: currentLoc,
        items: cartItems,
        status: 'sent',
        createdBy: currentUser.id,
        createdAt: new Date(),
        notes: `🍽️ Comida - ${locLabel}`,
      })

      const kitchenItems = cartItems.map(item => ({
        quantity: item.quantity,
        productName: item.productName,
        notes: item.notes,
      }))

      if (hasPhysicalPrinter) {
        // Esta estación tiene la impresora conectada directamente (PC Caja Principal) -> Imprimir comanda 58mm
        try {
          const html = buildKitchenTicketHTML({
            orderId,
            locationLabel: locLabel,
            dateStr: new Date().toLocaleString('es-MX'),
            waiterName,
            notes: posTicketNotes.trim() || undefined,
            items: kitchenItems,
            tenant,
          })
          await printService.printKitchenTicket(html, { title: `Comanda ${locLabel}`, width: 58 })
        } catch (err) {
          logger.warn('pos', 'Error imprimiendo comanda de cocina:', err as any)
        }
      } else {
        // Esta estación NO tiene impresora física (iPad de mesero).
        // Enviar comanda por Realtime a la Caja Principal para que la imprima de inmediato en POS-COMANDAS.
        // ¡CERO VENTANAS DE IMPRESIÓN AIRPRINT EN EL IPAD!
        try {
          await terminalSyncService.sendKitchenOrderPrint({
            orderId,
            tableNumber: currentLoc,
            locationLabel: locLabel,
            waiterName,
            notes: posTicketNotes.trim() || undefined,
            items: kitchenItems,
            timestamp: new Date().toISOString(),
            originStation: stationId,
          })
          logger.info('pos', 'Comanda transmitida a Caja Principal para impresión en POS-COMANDAS')
        } catch (syncErr) {
          logger.warn('pos', 'Error transmitiendo comanda a Caja Principal:', syncErr as any)
        }
      }

      alert(`✅ Comanda enviada a cocina (${locLabel})`)
      clearDraftForTable(currentLoc)
      setCurrentTable(0)
      setShowCartDrawer(false)
    } catch (err: any) {
      alert(`❌ Error enviando comanda: ${err?.message || err}`)
    } finally {
      setSending(false)
    }
  }

  // Sincronización en vivo con Terminal Clip Total 3
  useEffect(() => {
    // Solo la Caja Principal (Computadora fija) transmite continuamente su carrito a la Clip Total
    if (isPrimaryCaja) {
      terminalSyncService.sendCartUpdate(cartItems, cartSubtotal, currentLoc, stationId)
    }
  }, [cartItems, cartSubtotal, currentLoc, isPrimaryCaja, stationId])

  // Disparo de cobro a Clip Total cuando se elige Tarjeta en el modal de cobro (desde PC o iPad)
  useEffect(() => {
    if (showPaymentModal && paymentMethod === 'card' && cartItems.length > 0) {
      const saleId = `LOC-${Date.now().toString().slice(-6)}`
      activeSaleRef.current = saleId
      terminalSyncService.requestPayment(saleId, cartSubtotal, currentLoc, cartItems, 'card', stationId)
    } else if (!showPaymentModal) {
      activeSaleRef.current = null
    }
  }, [showPaymentModal, paymentMethod, cartSubtotal, currentLoc, cartItems, stationId])

  // Escuchar cuando la Clip Total aprueba el pago automáticamente
  useEffect(() => {
    const unsub = terminalSyncService.on('payment_completed', async (payload) => {
      logger.info('pos', '✅ Pago recibido desde Terminal Clip Total:', payload)
      // Si el pago vino con origen y fue para otra estación diferente, ignorar
      if (payload.originStation && payload.originStation !== stationId) {
        logger.info('pos', 'Pago pertenece a otra estación:', payload.originStation)
        return
      }
      // Si tenemos una venta activa y no coincide el saleId, ignorar
      if (activeSaleRef.current && payload.saleId !== activeSaleRef.current) {
        logger.info('pos', 'Venta activa no coincide con folio:', payload.saleId)
        return
      }
      if (payload.status === 'approved') {
        await handleConfirmPayment({
          authCode: payload.authCode,
          cardLast4: payload.cardLast4,
          terminalApproved: true,
        })
        activeSaleRef.current = null
      }
    })
    return () => unsub()
  }, [showPaymentModal, cartItems, currentLoc, cartSubtotal, stationId])

  // 🖨️ Auto-impresión en Estación Central (Caja Principal con POS-COMANDAS)
  useEffect(() => {
    if (!hasPhysicalPrinter) return

    const unsubKitchen = terminalSyncService.on('kitchen_order_print', async (payload: KitchenOrderPrintPayload) => {
      logger.info('pos', '📥 Comanda remota recibida desde iPad/móvil:', payload)
      if (payload.originStation === stationId) return

      try {
        const html = buildKitchenTicketHTML({
          orderId: payload.orderId,
          locationLabel: payload.locationLabel,
          dateStr: new Date(payload.timestamp || Date.now()).toLocaleString('es-MX'),
          waiterName: payload.waiterName || 'Personal de Servicio',
          notes: payload.notes,
          items: payload.items,
          tenant,
        })
        await printService.printKitchenTicket(html, {
          title: `Comanda ${payload.locationLabel}`,
          width: 58,
        })
        logger.info('pos', `✅ Comanda remota de ${payload.locationLabel} impresa en POS-COMANDAS`)
      } catch (err) {
        logger.error('pos', 'Error al imprimir comanda remota:', err as any)
      }
    })

    const unsubReceipt = terminalSyncService.on('receipt_print', async (payload: ReceiptPrintPayload) => {
      logger.info('pos', '📥 Ticket remoto recibido desde iPad/móvil:', payload)
      if (payload.originStation === stationId) return

      try {
        const html = buildTicketHTML({
          title: 'TICKET DE COMPRA',
          ticketFolio: payload.ticketFolio,
          locationLabel: payload.locationLabel,
          dateStr: new Date(payload.timestamp || Date.now()).toLocaleString('es-MX'),
          cashierName: payload.cashierName,
          customNotes: payload.customNotes,
          items: payload.items,
          subtotal: payload.subtotal,
          finalTotal: payload.finalTotal,
          paymentMethod: payload.paymentMethod,
          cashReceived: payload.cashReceived,
          changeAmount: payload.changeAmount,
          adjustmentReason: payload.adjustmentReason,
          discountAmount: payload.discountAmount,
          discountType: payload.discountType,
          discountName: payload.discountName,
          tenant,
        })
        await printService.printReceipt(html, {
          title: `Ticket de Venta ${payload.ticketFolio}`,
          width: 58,
        })
        logger.info('pos', `✅ Ticket de venta ${payload.ticketFolio} auto-impreso en POS-COMANDAS`)
      } catch (err) {
        logger.error('pos', 'Error al auto-imprimir ticket remoto:', err as any)
      }
    })

    return () => {
      unsubKitchen()
      unsubReceipt()
    }
  }, [hasPhysicalPrinter, stationId, tenant])

  // ⚡ Disparar Cobro Directo a la Terminal Clip Total 3 vía PinPad Cloud API
  const handleTriggerClipPinpad = async () => {
    if (cartItems.length === 0 || isPinpadLoading || isProcessingPayment) return

    pinpadAbortRef.current = false
    const originalTotal = cartSubtotal
    const ffDiscount = Math.round(cartSubtotal * 0.10 * 100) / 100
    const isCustomAdjusted = canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0 && parseFloat(adjustedTotal) !== originalTotal
    const isAdjusted = isCustomAdjusted || applyFriendsAndFamily
    const finalTotal = isCustomAdjusted
      ? parseFloat(adjustedTotal)
      : (applyFriendsAndFamily ? Math.max(0, originalTotal - ffDiscount) : originalTotal)

    setIsPinpadLoading(true)
    setPinpadStatusMsg('Conectando con la terminal física Clip Total 3...')

    try {
      const saleId = `LOC-${Date.now().toString().slice(-6)}`
      const res = await clipPinpadService.createPayment(finalTotal, saleId)

      if (res.code || res.message) {
        if (res.code === 'ERR10_03') {
          alert(`⚠️ Clip PinPad API: La terminal física con S/N ${clipPinpadService.getSerialNumber()} aún no está activa en modo PinPad por Soporte de Clip.\n\n` +
                `Pide al soporte de Clip que activen este número de serie en modo PinPad. Mientras tanto, puedes cobrar directamente ingresando los $${finalTotal.toFixed(2)} en la app de Clip y confirmar el cobro abajo con "Omitir terminal".`)
          setPinpadStatusMsg('Terminal pendiente de activar por Soporte de Clip')
        } else {
          alert(`⚠️ Error Clip PinPad: ${res.message || res.name || 'Error en comunicación con Clip'}`)
          setPinpadStatusMsg(null)
        }
        return
      }

      if (res.pinpad_request_id) {
        setPinpadStatusMsg(`💳 ¡Orden enviada a Clip Total! Esperando tarjeta ($${finalTotal.toFixed(2)} MXN)...`)

        try {
          const statusRes = await clipPinpadService.pollPayment(
            res.pinpad_request_id,
            (st) => {
              if (pinpadAbortRef.current) {
                throw new Error('Cobro cancelado por el cajero')
              }
              if (st === 'PENDING') {
                setPinpadStatusMsg(`💳 Esperando que el cliente acerque, deslice o inserte tarjeta en Clip Total 3...`)
              } else if (st === 'IN_PROCESS') {
                setPinpadStatusMsg('⏳ Tarjeta detectada. Procesando transacción con el banco...')
              } else {
                setPinpadStatusMsg(`Terminal Clip: ${st}...`)
              }
            },
            90
          )

          if (statusRes.status === 'PAID' || statusRes.status === 'APPROVED') {
            setPinpadStatusMsg('✅ ¡Pago aprobado con éxito en Clip Total 3!')
            await handleConfirmPayment({
              authCode: statusRes.detail?.authorization_code || 'CLIP-APROBADO',
              cardLast4: statusRes.detail?.last4 || '••••',
              terminalApproved: true,
            })
          }
        } catch (pollErr: any) {
          const msg = pollErr?.message || 'Pago no completado en la terminal'
          if (msg.includes('cancelado')) {
            setPinpadStatusMsg('❌ Cobro cancelado')
          } else {
            setPinpadStatusMsg(`❌ ${msg}`)
            alert(`⚠️ ${msg}`)
          }
        }
      }
    } catch (err: any) {
      alert(`❌ Error al conectar con Clip PinPad: ${err?.message || err}`)
      setPinpadStatusMsg(null)
    } finally {
      setIsPinpadLoading(false)
    }
  }

  // 💰 COBRAR CUENTA (REGISTRA VENTA + DEDUCCIÓN DE INVENTARIO + IMPRIME TICKET 58mm FANCY)
  const handleConfirmPayment = async (terminalDetails?: { authCode?: string; cardLast4?: string; terminalApproved?: boolean }) => {
    if (!currentUser || cartItems.length === 0 || isProcessingPayment) return

    const originalTotal = cartSubtotal
    const ffDiscount = Math.round(cartSubtotal * 0.10 * 100) / 100
    const isCustomAdjusted = canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0 && parseFloat(adjustedTotal) !== originalTotal
    const isAdjusted = isCustomAdjusted || applyFriendsAndFamily
    const finalTotal = isCustomAdjusted
      ? parseFloat(adjustedTotal)
      : (applyFriendsAndFamily ? Math.max(0, originalTotal - ffDiscount) : originalTotal)
    const discountAmount = isAdjusted ? (originalTotal - finalTotal) : 0
    const effectiveReason = applyFriendsAndFamily && !adjustmentReason.trim()
      ? 'Descuento Friends & Family (10%)'
      : adjustmentReason.trim()

    if (isCustomAdjusted && !adjustmentReason.trim()) {
      alert('⚠️ Para realizar un ajuste manual al total de la venta, es OBLIGATORIO ingresar el motivo en el apartado de notas.')
      return
    }

    const received = parseFloat(cashReceived) || finalTotal
    if (paymentMethod === 'cash' && received < finalTotal) {
      alert(`⚠️ El monto recibido ($${received.toFixed(2)}) es menor al total a pagar ($${finalTotal.toFixed(2)}).`)
      return
    }

    setIsProcessingPayment(true)
    try {
      const locLabel = tableLocations.find(l => l.id === currentLoc)?.label || `Mesa ${currentLoc}`

      // Si hubo ajuste por Admin/Capitán o descuento Friends & Family, registrar en audit_logs de Supabase
      if (isAdjusted) {
        try {
          await supabaseService.logAudit({
            organization_id: supabaseService.getCurrentOrgId(),
            user_id: currentUser.id,
            action: applyFriendsAndFamily ? 'DISCOUNT_APPLIED' : 'SALE_AMOUNT_ADJUSTED',
            table_name: 'sales',
            record_id: `pos-${currentLoc}-${Date.now()}`,
            changes: {
              discountType: applyFriendsAndFamily ? 'FRIENDS_AND_FAMILY' : 'CUSTOM_ADJUSTMENT',
              discountPercentage: applyFriendsAndFamily ? 10 : undefined,
              discountAmount,
              originalTotal,
              adjustedTotal: finalTotal,
              difference: finalTotal - originalTotal,
              reason: effectiveReason,
              authorizedBy: currentUser.username || currentUser.name,
              role: currentUser.role,
              location: locLabel,
              timestamp: new Date().toISOString(),
            },
          })
        } catch (auditErr) {
          logger.warn('audit', 'Error registrando log de auditoría:', auditErr as any)
        }
      }
      
      // 1. Crear venta en base de datos (con fallback)
      await supabaseService.createSale({
        orderIds: [],
        tableNumber: currentLoc,
        items: cartItems,
        subtotal: finalTotal,
        discounts: discountAmount,
        tax: 0,
        total: finalTotal,
        paymentMethod: paymentMethod === 'card' ? 'clip' : paymentMethod === 'transfer' ? 'digital' : 'cash',
        tip: 0,
        tipSource: 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)

      // 2. Imprimir ticket de venta oficial (con logo y banner Powered by Reisbloc IA)
      const ticketFolio = `LOC-${Date.now().toString().slice(-6)}`
      const dateStr = new Date().toLocaleString('es-MX')
      const changeAmount = paymentMethod === 'cash' ? Math.max(0, received - finalTotal) : 0
      const ticketItems = cartItems.map(item => ({
        quantity: item.quantity,
        productName: item.productName,
        unitPrice: item.unitPrice,
        notes: item.notes,
      }))

      if (hasPhysicalPrinter) {
        // Estación con impresora conectada directamente (Caja Principal)
        try {
          const html = buildTicketHTML({
            title: 'TICKET DE COMPRA',
            ticketFolio,
            locationLabel: locLabel,
            dateStr,
            cashierName: currentUser.username || currentUser.name || `Personal ${tenant.clientName}`,
            customNotes: posTicketNotes.trim(),
            items: ticketItems,
            subtotal: originalTotal,
            finalTotal,
            paymentMethod,
            cashReceived: paymentMethod === 'cash' ? received : undefined,
            changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
            adjustmentReason: isAdjusted ? effectiveReason : undefined,
            discountAmount,
            discountType: applyFriendsAndFamily ? 'FRIENDS_AND_FAMILY' : undefined,
            discountName: applyFriendsAndFamily ? 'Friends & Family (10%)' : undefined,
            tenant,
          })

          await printService.printReceipt(html, { title: `Ticket de Venta ${ticketFolio}`, width: 58 })
        } catch (printErr) {
          logger.warn('pos', 'Error imprimiendo ticket de venta localmente:', printErr as any)
        }
      } else {
        // Estación remota (iPad / móvil) -> retransmitir a Caja Principal para impresión física sin abrir diálogos AirPrint
        try {
          await terminalSyncService.sendReceiptPrint({
            ticketFolio,
            locationLabel: locLabel,
            cashierName: currentUser.username || currentUser.name || `Personal ${tenant.clientName}`,
            customNotes: posTicketNotes.trim() || undefined,
            items: ticketItems,
            subtotal: originalTotal,
            finalTotal,
            paymentMethod,
            cashReceived: paymentMethod === 'cash' ? received : undefined,
            changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
            adjustmentReason: isAdjusted ? effectiveReason : undefined,
            discountAmount,
            discountType: applyFriendsAndFamily ? 'FRIENDS_AND_FAMILY' : undefined,
            discountName: applyFriendsAndFamily ? 'Friends & Family (10%)' : undefined,
            timestamp: new Date().toISOString(),
            originStation: stationId,
          })
          logger.info('pos', 'Ticket de venta retransmitido a Caja Principal para impresión en POS-COMANDAS')
        } catch (syncErr) {
          logger.warn('pos', 'Error retransmitiendo ticket a Caja Principal:', syncErr as any)
        }
      }

      // 3. Limpiar borrador de la mesa y resetear a Caja / Mostrador
      clearDraftForTable(currentLoc)
      setCurrentTable(0)
      setShowPaymentModal(false)
      setShowCartDrawer(false)
      setCashReceived('')
      setAdjustedTotal('')
      setAdjustmentReason('')
      setPosTicketNotes('')
      setEnablePriceAdjustment(false)
      setApplyFriendsAndFamily(false)
      setShowChangeCalculator(false)
      await terminalSyncService.resetTerminal()
      if (terminalDetails?.terminalApproved) {
        alert(`✅ ¡Pago aprobado con éxito en Clip Total 3! (Auth: ${terminalDetails.authCode || 'APROBADA'})`)
      } else {
        alert('✅ Pago cobrado exitosamente y ticket generado')
      }
    } catch (err: any) {
      alert(`❌ Error al procesar el cobro: ${err?.message || err}`)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 select-none">
      {/* Header de Ubicaciones Justificado a la Izquierda + Opciones (Impresora & Organizar) Justificadas a la Derecha */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 py-2.5 px-3 shadow-md w-full">
        <div className="max-w-7xl 2xl:max-w-[1720px] mx-auto flex items-center justify-between gap-3">
          {/* Lado Izquierdo: Marca + Ubicaciones (Caja, Mesas 1-11, Periqueras 1-3, Barra, Llevar) alineadas a la izquierda */}
          <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth min-w-0">
            {/* Badge de Marca / Localito */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-black whitespace-nowrap flex-shrink-0 shadow-sm">
              {tenant.logoUrl ? (
                <img 
                  src={tenant.logoUrl} 
                  alt={tenant.clientName} 
                  className="h-4 w-auto object-contain rounded"
                />
              ) : (
                <Store size={14} className="text-amber-400" />
              )}
              <span>{tenant.clientName}</span>
              <span className="text-slate-700">|</span>
              <span className="text-teal-400 font-bold">{getTableDisplayName(currentLoc)}</span>
            </div>

            <div className="h-5 w-px bg-slate-800 shrink-0 mx-0.5" />

            {/* Ubicaciones: Caja, Mesas 1-11, Periqueras 1-3, Barra, Llevar */}
            {tableLocations.map((loc) => {
              const isSelected = currentLoc === loc.id
              const isPeriquera = loc.id >= 21 && loc.id <= 29
              const isCaja = loc.id === 0
              const isBarra = loc.id === 99
              const isLlevar = loc.id === 100
              const hasDraft = (draftOrders[loc.id]?.length || 0) > 0

              const displayBadge = isPeriquera
                ? (loc.shortLabel || `P${loc.id - 20}`)
                : isCaja
                ? (loc.shortLabel || '🏪 Caja')
                : isBarra
                ? (loc.shortLabel || 'Barra')
                : isLlevar
                ? (loc.shortLabel || '🛍️ Llevar')
                : (loc.shortLabel || `#${loc.id}`)

              return (
                <button
                  key={loc.id}
                  onClick={() => setCurrentTable(loc.id)}
                  title={loc.label}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? isCaja
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25 scale-105 ring-1 ring-emerald-400'
                        : isPeriquera
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black shadow-lg shadow-orange-500/25 scale-105 ring-1 ring-orange-400'
                        : isBarra
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-lg shadow-purple-500/25 scale-105 ring-1 ring-purple-400'
                        : isLlevar
                        ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white font-black shadow-lg shadow-sky-500/25 scale-105 ring-1 ring-sky-400'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 scale-105 ring-1 ring-amber-300'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{displayBadge}</span>
                  {hasDraft && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Lado Derecho: Controles de Estación (Impresora & Organizar) */}
          <div className="flex items-center justify-end gap-2 flex-shrink-0">
            {/* Indicador / Switch de Impresora Física vs Remota (iPad) */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !hasPhysicalPrinter
                setHasPhysicalPrinter(nextVal)
                localStorage.setItem('reisbloc_has_physical_printer', String(nextVal))
              }}
              title={
                hasPhysicalPrinter
                  ? 'Impresora física conectada directamente en esta estación (Caja Principal). Clic para cambiar a modo iPad/Remoto.'
                  : 'Modo iPad / Móvil: Las comandas y tickets se envían a la Caja Principal sin abrir ventanas de impresión en iOS. Clic para cambiar.'
              }
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                hasPhysicalPrinter
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{hasPhysicalPrinter ? '🖨️' : '📡'}</span>
              <span className="hidden lg:inline">
                {hasPhysicalPrinter ? 'Impresora: Caja' : 'Impresora: iPad'}
              </span>
            </button>

            {/* Botón para organizar y gestionar categorías */}
            <button
              type="button"
              onClick={() => setShowCategoryOrderModal(true)}
              title="Organizar y gestionar categorías del menú (editar nombre, soft delete, añadir nueva)"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <SlidersHorizontal size={14} className="text-amber-400" />
              <span className="hidden lg:inline">Categorías</span>
            </button>
          </div>
        </div>
      </header>

      {/* Espacio de Categorías Limpio, Amplio y con Desplazamiento Fluido */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 py-2.5 px-3 shadow-xl w-full">
        <div className="max-w-7xl 2xl:max-w-[1720px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {categories.map((cat) => {
            const upperCat = cat.toUpperCase()
            const isSelected = selectedCategory.toUpperCase() === upperCat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(upperCat)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide whitespace-nowrap flex-shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/40 scale-105 ring-1 ring-teal-400/40'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {upperCat}
              </button>
            )
          })}
        </div>
      </div>


      {/* Grid de Productos Interactivo (Optimizado para caber más en pantallas de escritorio) */}
      <main className="max-w-7xl 2xl:max-w-[1720px] mx-auto px-3 sm:px-4 mt-4 md:mt-6">
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-bold">Cargando menú de platillos...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8 max-w-lg mx-auto">
            <Utensils className="w-12 h-12 text-teal-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-white mb-1">Catálogo de Platillos Listo</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              La base de datos de producción está limpia y conectada. Puedes agregar platillos desde el módulo de Inventario.
            </p>
            <Link
              to="/inventory"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-900/30 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Gestionar Inventario & Menú</span>
            </Link>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-bold">
            No hay platillos en la categoría "{selectedCategory}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-3 lg:gap-3.5">
            {filteredProducts.map((product) => {
              const qtyInCart = getItemQuantityInCart(product.id)
              return (
                <div
                  key={product.id}
                  className="low-perf-card bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-teal-500/40 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Image & Price */}
                    <div className="relative h-36 sm:h-40 md:h-28 lg:h-32 xl:h-32 w-full overflow-hidden bg-slate-800">
                      <img
                        src={product.imageUrl || product.imagePath || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur border border-white/10 text-[9px] font-bold text-teal-300 uppercase">
                        {product.category}
                      </span>
                      <span className="absolute bottom-2 right-2 text-xs sm:text-sm font-black text-white px-2 py-0.5 rounded-lg bg-teal-600/90 backdrop-blur shadow-lg border border-teal-400/30">
                        ${product.price} <span className="text-[10px] font-normal">MXN</span>
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug" title={product.name}>
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-[11px] md:text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-normal">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar per Product */}
                  <div className="p-3 pt-0 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => setRecipeProduct(product)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-teal-400 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
                      title="Ver receta y rendimiento"
                    >
                      <ChefHat size={14} />
                      <span className="hidden sm:inline text-[11px]">Receta</span>
                    </button>

                    <button
                      onClick={() => handleAddProduct(product)}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        qtyInCart > 0
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-md'
                      }`}
                    >
                      <Plus size={14} />
                      <span>{qtyInCart > 0 ? `Agregar (${qtyInCart})` : 'Agregar'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-teal-500/30 px-4 py-3 shadow-2xl animate-slide-up">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={() => setShowCartDrawer(true)}
              className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-800 hover:border-teal-500/50 transition-colors"
            >
              <div className="relative">
                <ShoppingBag size={22} className="text-teal-400" />
                <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-slate-950">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {tableLocations.find(l => l.id === currentLoc)?.label || `Mesa ${currentLoc}`}
                </div>
                <div className="text-base font-black text-white">
                  ${cartSubtotal.toFixed(2)} <span className="text-xs font-normal">MXN</span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendToKitchen}
                disabled={sending}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/40 text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95"
              >
                <Send size={16} />
                <span className="hidden sm:inline">Enviar a Cocina</span>
              </button>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 text-xs font-black flex items-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <CreditCard size={18} />
                <span>Cobrar Cuenta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">Pedido Actual</h3>
                  <p className="text-xs text-amber-400 font-bold">
                    {tableLocations.find(l => l.id === currentLoc)?.label}
                  </p>
                </div>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mt-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{item.productName}</div>
                      <div className="text-xs text-teal-400 font-semibold mt-0.5">
                        ${item.unitPrice} c/u · Total: ${(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-400 font-medium italic mt-1">
                          ↳ {item.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => decrementDraftItem(currentLoc, item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-extrabold text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => incrementDraftItem(currentLoc, item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 ml-1"
                        title="Agregar Nota"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => removeDraftItem(currentLoc, item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white ml-1"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-base font-black text-white">
                <span>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)} MXN</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendToKitchen}
                  disabled={sending}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>Enviar a Cocina</span>
                </button>
                <button
                  onClick={() => {
                    setShowCartDrawer(false)
                    setShowPaymentModal(true)
                  }}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <CreditCard size={16} />
                  <span>Cobrar Cuenta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAST PAYMENT MODAL (EFECTIVO, TARJETA, TRANSFERENCIA) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">Cobrar Cuenta</h3>
                <p className="text-xs text-amber-400 font-bold">
                  {tableLocations.find(l => l.id === currentLoc)?.label} · {tenant.clientName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setApplyFriendsAndFamily(false)
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Display */}
            {(() => {
              const ffDiscount = Math.round(cartSubtotal * 0.10 * 100) / 100
              const isCustomAdjusted = canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0 && parseFloat(adjustedTotal) !== cartSubtotal
              const currentTotal = isCustomAdjusted
                ? parseFloat(adjustedTotal)
                : (applyFriendsAndFamily ? Math.max(0, cartSubtotal - ffDiscount) : cartSubtotal)
              const currentDiscount = Math.max(0, cartSubtotal - currentTotal)

              return (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                  {currentDiscount > 0 ? (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-2">
                        <span>Subtotal comanda:</span>
                        <span className="line-through">${cartSubtotal.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-amber-400 font-black px-2 pb-1 border-b border-slate-800">
                        <span>{applyFriendsAndFamily ? '🎁 Descuento Friends & Family (10%):' : 'Ajuste / Descuento:'}</span>
                        <span>-${currentDiscount.toFixed(2)} MXN</span>
                      </div>
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-1.5">Total A Cobrar</div>
                      <div className="text-3xl font-black text-amber-400">
                        ${currentTotal.toFixed(2)} <span className="text-sm font-normal text-slate-400">MXN</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total A Cobrar</div>
                      <div className="text-4xl font-black text-emerald-400 mt-1">
                        ${cartSubtotal.toFixed(2)} <span className="text-sm font-normal text-slate-400">MXN</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Select Método de Pago */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">Seleccionar Método de Pago:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg scale-105'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <Banknote size={22} />
                  <span>Efectivo</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-lg scale-105'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard size={22} />
                  <span>Tarjeta</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-105'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <QrCode size={22} />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Detalles de Cobro según Método */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
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
                  <div className="space-y-2.5 pt-2 border-t border-slate-900">
                    <input
                      type="number"
                      placeholder={`$${cartSubtotal.toFixed(2)}`}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-black text-base focus:outline-none focus:border-emerald-500"
                    />

                    <div className="flex items-center gap-2">
                      {[50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashReceived(amt.toString())}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg"
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>

                    {parseFloat(cashReceived) >= cartSubtotal && (
                      <div className="flex items-center justify-between text-xs font-black text-emerald-400 pt-1.5 border-t border-slate-800">
                        <span>Cambio a Entregar:</span>
                        <span>${(parseFloat(cashReceived) - cartSubtotal).toFixed(2)} MXN</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="bg-gradient-to-b from-teal-950/60 to-slate-900 border border-teal-500/40 p-3.5 rounded-2xl text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="font-black text-sm text-white">Clip Total 3 (PinPad)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = clipPinpadService.getSerialNumber()
                      const val = prompt('Número de Serie (S/N) de la Terminal Clip Total 3:', cur)
                      if (val && val.trim()) {
                        clipPinpadService.setSerialNumber(val.trim())
                        setPinpadStatusMsg(`Terminal configurada con S/N: ${val.trim()}`)
                      }
                    }}
                    title="Clic para cambiar o verificar el número de serie de la terminal"
                    className="text-[10px] font-mono text-teal-300 bg-teal-950 hover:bg-teal-900 px-2 py-0.5 rounded border border-teal-800 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <span>S/N: {clipPinpadService.getSerialNumber()}</span>
                    <Edit size={10} className="text-teal-400" />
                  </button>
                </div>


                <div className="space-y-2">
                  {pinpadStatusMsg ? (
                    <div className="bg-slate-950/90 p-3 rounded-xl border border-amber-500/50 text-center space-y-1">
                      <div className="text-amber-300 font-black text-xs animate-pulse">
                        {pinpadStatusMsg}
                      </div>
                      {isPinpadLoading && (
                        <button
                          type="button"
                          onClick={() => {
                            pinpadAbortRef.current = true
                            setIsPinpadLoading(false)
                            setPinpadStatusMsg('Cobro cancelado')
                          }}
                          className="mt-1 px-3 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-[10px] font-bold transition-all"
                        >
                          ✕ Cancelar cobro en Clip
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-teal-500/20 text-center text-teal-300 text-[11px] font-medium">
                      ✓ Terminal física Clip Total 3 lista. Al presionar el botón de cobro abajo se mandará la orden automáticamente.
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'transfer' && (
              <div className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-500/30 text-xs text-amber-200 space-y-1 text-center">
                <p className="font-bold text-sm">📲 Transferencia SPEI / QR</p>
                <p className="text-slate-300">
                  Verificar comprobante o app bancaria y haz clic en confirmar pago.
                </p>
              </div>
            )}

            {/* Descuento Especial: Friends & Family (10%) */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              applyFriendsAndFamily 
                ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/30' 
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-400 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyFriendsAndFamily}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setApplyFriendsAndFamily(checked)
                      if (checked) {
                        setEnablePriceAdjustment(false)
                        setAdjustedTotal('')
                      }
                    }}
                    className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>🎁 Descuento Friends & Family (10%)</span>
                </label>
                {applyFriendsAndFamily ? (
                  <span className="text-[11px] font-black text-amber-300 bg-amber-900/60 border border-amber-600/50 px-2.5 py-0.5 rounded-full">
                    -${(Math.round(cartSubtotal * 0.10 * 100) / 100).toFixed(2)} MXN
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                    Audit Log
                  </span>
                )}
              </div>
              {applyFriendsAndFamily && (
                <p className="text-[11px] text-amber-200/90 mt-1.5 pl-6 font-medium">
                  ✓ Descuento del 10% aplicado automáticamente. Se registra en el log de auditoría del sistema y se reflejará en el corte de caja y reportes.
                </p>
              )}
            </div>

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
                📝 Notas / Dirección del Cliente (Para el Ticket):
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Dirección de entrega, sin cebolla, recoger a las 3pm..."
                value={posTicketNotes}
                onChange={(e) => setPosTicketNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Confirmar Cobro */}
            {paymentMethod === 'card' ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerClipPinpad}
                  disabled={isPinpadLoading || isProcessingPayment}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all disabled:opacity-50"
                >
                  <Smartphone size={20} />
                  <span>
                    {isPinpadLoading 
                      ? (pinpadStatusMsg || 'Enviando a Terminal Clip...') 
                      : `⚡ Cobrar en Clip Total 3 ($${(() => {
                          const ff = Math.round(cartSubtotal * 0.10 * 100) / 100
                          const custom = canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0 && parseFloat(adjustedTotal) !== cartSubtotal
                          return (custom ? parseFloat(adjustedTotal) : (applyFriendsAndFamily ? Math.max(0, cartSubtotal - ff) : cartSubtotal)).toFixed(2)
                        })()} MXN)`
                    }
                  </span>
                </button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment()}
                    disabled={isPinpadLoading || isProcessingPayment}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium transition-colors"
                  >
                    Omitir terminal (Registrar cobro manual / terminal independiente)
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleConfirmPayment()}
                disabled={isProcessingPayment}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={20} />
                <span>
                  {isProcessingPayment 
                    ? 'Procesando Pago...' 
                    : paymentMethod === 'cash' 
                      ? 'Confirmar Cobro en Efectivo e Imprimir Ticket' 
                      : 'Confirmar Transferencia SPEI e Imprimir Ticket'
                  }
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note Modal */}
      {editingItem && (
        <OrderNoteModal
          item={editingItem}
          onSave={handleUpdateNote}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Recipe Modal */}
      {recipeProduct && (
        <DarkKitchenRecipeModal
          isOpen={!!recipeProduct}
          onClose={() => setRecipeProduct(null)}
          product={recipeProduct as any}
        />
      )}

      {/* Category Order Customization Modal */}
      {showCategoryOrderModal && (
        <CategoryOrderModal
          isOpen={showCategoryOrderModal}
          onClose={() => setShowCategoryOrderModal(false)}
          currentCategories={categories}
          onSave={handleSaveCategoryOrder}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleSoftDeleteCategory}
          onAddCategory={handleAddCategory}
        />
      )}
    </div>
  )
}

