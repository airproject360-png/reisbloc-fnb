import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { Product, OrderItem } from '@/types/index'
import { DEMO_PRODUCTS } from '@/services/demoSeedService'
import printService from '@/services/printService'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
import DarkKitchenRecipeModal from '@/components/admin/DarkKitchenRecipeModal'
import {
  Search,
  Sparkles,
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
  Store
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
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
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
  const [adjustedTotal, setAdjustedTotal] = useState<string>('')
  const [adjustmentReason, setAdjustmentReason] = useState<string>('')
  const [posTicketNotes, setPosTicketNotes] = useState<string>('')

  const canAdjustSale = currentUser?.role === 'admin' || currentUser?.role === 'capitan'

  // Lista simplificada de ubicaciones / mesas
  const tableLocations = [
    { id: 1, label: 'Mesa 1' },
    { id: 2, label: 'Mesa 2' },
    { id: 3, label: 'Mesa 3' },
    { id: 4, label: 'Mesa 4' },
    { id: 5, label: 'Mesa 5' },
    { id: 6, label: 'Mesa 6' },
    { id: 99, label: 'Barra' },
    { id: 100, label: 'Para Llevar' },
  ]

  const currentLoc = currentTableNumber || 1
  const cartItems = draftOrders[currentLoc] || []
  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const isReadOnly = currentUser?.role === 'supervisor'

  const categories = useMemo(() => {
    let savedCats = ['Quesadillas Maíz', 'Quesadillas Harina', 'Platos', 'Especialidades', 'Extras', 'Bebidas']
    try {
      const stored = localStorage.getItem('localito_categories')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) savedCats = parsed
      }
    } catch {}
    const defaultCats = ['Todos', ...savedCats]
    const prodCats = Array.from(new Set((products || []).map(p => p.category))).filter(c => c && !defaultCats.includes(c))
    return [...defaultCats, ...prodCats]
  }, [products])

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const prods = await supabaseService.getAllProducts()
      if (prods && prods.length > 0) {
        setProducts(prods)
      } else {
        setProducts(DEMO_PRODUCTS as any)
      }
    } catch (error) {
      logger.error('pos', 'Error loading products', error as any)
      setProducts(DEMO_PRODUCTS as any)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [products, selectedCategory, searchTerm])

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

  // 🧑‍🍳 ENVIAR A COCINA (IMPRIME COMANDA 58mm)
  const handleSendToKitchen = async () => {
    if (!currentUser || cartItems.length === 0 || sending) return

    setSending(true)
    try {
      const orderId = await supabaseService.createOrder({
        tableNumber: currentLoc,
        items: cartItems,
        status: 'sent',
        createdBy: currentUser.id,
        createdAt: new Date(),
        notes: `🍽️ Comida - ${tableLocations.find(l => l.id === currentLoc)?.label || `Mesa ${currentLoc}`}`,
      })

      // Imprimir comanda de cocina (58mm)
      try {
        const dateStr = new Date().toLocaleString('es-MX')
        const locName = tableLocations.find(l => l.id === currentLoc)?.label || `Mesa #${currentLoc}`
        const html = `
          <div style="width:58mm;padding:4px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
            <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:6px;">
              <div style="font-weight:900;font-size:15px;">*** COMANDA DE COCINA ***</div>
              <div style="font-size:12px;font-weight:bold;margin-top:2px;">LOCALITO - ${locName.toUpperCase()}</div>
              <div style="font-size:9px;margin-top:2px;">Fecha: ${dateStr}</div>
            </div>
            <div style="border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px;">
              ${cartItems.map(item => `
                <div style="margin-bottom:6px;">
                  <div style="font-size:13px;font-weight:900;">
                    [ ${item.quantity}x ] ${item.productName}
                  </div>
                  ${item.notes ? `<div style="font-size:10px;font-weight:bold;background:#eee;padding:2px;margin-top:2px;">↳ NOTA: ${item.notes}</div>` : ''}
                </div>
              `).join('')}
            </div>
            <div style="text-align:center;font-size:9px;font-weight:bold;">
              Folio: #${orderId.slice(-6).toUpperCase()}
            </div>
          </div>
        `
        await printService.printReceipt(html, { title: 'Comanda Cocina', width: 58 })
      } catch (err) {
        logger.warn('pos', 'Error imprimiendo comanda de cocina:', err as any)
      }

      alert(`✅ Comanda enviada a cocina (${tableLocations.find(l => l.id === currentLoc)?.label})`)
      clearDraftForTable(currentLoc)
      setShowCartDrawer(false)
    } catch (err: any) {
      alert(`❌ Error enviando comanda: ${err?.message || err}`)
    } finally {
      setSending(false)
    }
  }

  // 💰 COBRAR CUENTA (REGISTRA VENTA + DEDUCCIÓN DE INVENTARIO + IMPRIME TICKET 58mm FANCY)
  const handleConfirmPayment = async () => {
    if (!currentUser || cartItems.length === 0 || isProcessingPayment) return

    const originalTotal = cartSubtotal
    const isAdjusted = canAdjustSale && enablePriceAdjustment && parseFloat(adjustedTotal) >= 0 && parseFloat(adjustedTotal) !== originalTotal
    const finalTotal = isAdjusted ? parseFloat(adjustedTotal) : originalTotal

    if (isAdjusted && !adjustmentReason.trim()) {
      alert('⚠️ Para realizar un ajuste al total de la venta, es OBLIGATORIO ingresar el motivo en el apartado de notas.')
      return
    }

    const received = parseFloat(cashReceived) || finalTotal
    if (paymentMethod === 'cash' && received < finalTotal) {
      alert(`⚠️ El monto recibido ($${received}) es menor al total a pagar ($${finalTotal}).`)
      return
    }

    setIsProcessingPayment(true)
    try {
      const locLabel = tableLocations.find(l => l.id === currentLoc)?.label || `Mesa ${currentLoc}`

      // Si hubo ajuste por Admin/Capitán, registrar en audit_logs de Supabase
      if (isAdjusted) {
        try {
          await supabaseService.logAudit({
            organization_id: supabaseService.getCurrentOrgId(),
            user_id: currentUser.id,
            action: 'SALE_AMOUNT_ADJUSTED',
            table_name: 'sales',
            record_id: `pos-${currentLoc}-${Date.now()}`,
            changes: {
              originalTotal,
              adjustedTotal: finalTotal,
              difference: finalTotal - originalTotal,
              reason: adjustmentReason.trim(),
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
        discounts: isAdjusted ? originalTotal - finalTotal : 0,
        tax: 0,
        total: finalTotal,
        paymentMethod: paymentMethod === 'card' ? 'clip' : paymentMethod === 'transfer' ? 'digital' : 'cash',
        tip: 0,
        tipSource: 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)

      // 2. Imprimir ticket de venta fancy de 58mm (sin propina, Powered by Reisbloc)
      try {
        const ticketFolio = `LOC-${Date.now().toString().slice(-6)}`
        const dateStr = new Date().toLocaleString('es-MX')
        const methodLabel = paymentMethod === 'card' ? 'TARJETA (TERMINAL)' : paymentMethod === 'transfer' ? 'TRANSFERENCIA SPEI' : 'EFECTIVO'
        const changeAmount = paymentMethod === 'cash' ? Math.max(0, received - finalTotal) : 0

        const html = `
          <div style="width:58mm;padding:6px;font-family:'Courier New', monospace;font-size:11px;line-height:1.25;color:#000;">
            <!-- Header Logo & Store Name -->
            <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
              <div style="font-weight:900;font-size:16px;letter-spacing:1px;">LOCALITO</div>
              <div style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-top:1px;">Guisos & Barra Fría</div>
              <div style="font-size:9px;color:#333;margin-top:2px;">localito.reisbloc.com</div>
              <div style="font-size:10px;font-weight:bold;margin-top:4px;border:1px solid #000;padding:2px 0;">
                TICKET DE COMPRA
              </div>
            </div>

            <!-- Ticket Metadata -->
            <div style="font-size:9px;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;">
                <span><strong>Ubicación:</strong> ${locLabel}</span>
                <span><strong>Folio:</strong> ${ticketFolio}</span>
              </div>
              <div style="margin-top:2px;">Fecha: ${dateStr}</div>
              <div>Atendido por: ${currentUser.username || currentUser.name || 'Personal LOCALITO'}</div>
            </div>

            ${posTicketNotes.trim() ? `
            <!-- Customer Notes / Address -->
            <div style="border:1px dashed #000;padding:4px;margin-bottom:6px;font-size:9px;background:#f9f9f9;">
              <div style="font-weight:bold;">NOTAS / DIRECCIÓN DEL CLIENTE:</div>
              <div>${posTicketNotes.trim()}</div>
            </div>
            ` : ''}

            <!-- Itemized List -->
            <div style="border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:9px;border-bottom:1px stroke #ccc;padding-bottom:2px;margin-bottom:4px;">
                <span>CANT / DESCRIPCIÓN</span>
                <span>IMPORTE</span>
              </div>
              ${cartItems.map(item => `
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
              `).join('')}
            </div>

            <!-- Totals -->
            <div style="border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;">
                <span>TOTAL A PAGAR:</span>
                <span>$${finalTotal.toFixed(2)} MXN</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px;">
                <span>FORMA DE PAGO:</span>
                <span><strong>${methodLabel}</strong></span>
              </div>
              ${isAdjusted ? `
              <div style="font-size:9px;color:#333;margin-top:4px;font-style:italic;">
                * Ajuste autorizado por administración: ${adjustmentReason.trim()}
              </div>
              ` : ''}
              ${paymentMethod === 'cash' ? `
              <div style="display:flex;justify-content:space-between;font-size:9px;margin-top:2px;color:#444;">
                <span>Efectivo Recibido:</span>
                <span>$${received.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:bold;margin-top:2px;">
                <span>CAMBIO:</span>
                <span>$${changeAmount.toFixed(2)}</span>
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

        await printService.printReceipt(html, { title: `Ticket de Venta ${ticketFolio}`, width: 58 })
      } catch (printErr) {
        logger.warn('pos', 'Error imprimiendo ticket de venta:', printErr as any)
      }

      // 3. Limpiar borrador de la mesa
      clearDraftForTable(currentLoc)
      setShowPaymentModal(false)
      setShowCartDrawer(false)
      setCashReceived('')
      setAdjustedTotal('')
      setAdjustmentReason('')
      setPosTicketNotes('')
      setEnablePriceAdjustment(false)
      setShowChangeCalculator(false)
      alert('✅ Pago cobrado exitosamente y ticket generado')
    } catch (err: any) {
      alert(`❌ Error al procesar el cobro: ${err?.message || err}`)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 select-none">
      {/* Header Banner - Menú & Caja Unificada */}
      <header className="relative bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border-b border-teal-500/20 px-4 py-6 overflow-hidden shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-1">
              <Sparkles size={14} className="text-amber-400" />
              <span>Menú Interactivo & Caja Unificada · LOCALITO</span>
            </div>
            <img 
              src="/logo_localito.jpg" 
              alt="LOCALITO" 
              className="h-14 md:h-16 w-auto object-contain rounded-2xl border border-amber-500/30 shadow-xl shadow-amber-500/10"
            />
          </div>

          {/* Selector Simplificado de Ubicación / Mesas */}
          <div className="w-full md:w-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-xl">
            <p className="text-[10px] uppercase font-black tracking-wider text-teal-400 mb-1.5 text-center md:text-left">
              Ubicación / Mesa del Pedido:
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {tableLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setCurrentTable(loc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    currentLoc === loc.id
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg scale-105 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Bar de Búsqueda y Categorías */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 py-3.5 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar platillo, quesadilla, gordita, sope, bebida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/40 scale-105'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Productos Interactivo */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-bold">Cargando menú de platillos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const qtyInCart = getItemQuantityInCart(product.id)
              return (
                <div
                  key={product.id}
                  className="low-perf-card bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-teal-500/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Image & Price */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-800">
                      <img
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-white/10 text-[10px] font-bold text-teal-300 uppercase">
                        {product.category}
                      </span>
                      <span className="absolute bottom-3 right-3 text-lg font-black text-white px-3 py-1 rounded-xl bg-teal-600/90 backdrop-blur shadow-lg border border-teal-400/30">
                        ${product.price} <span className="text-xs font-normal">MXN</span>
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar per Product */}
                  <div className="p-4 pt-0 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setRecipeProduct(product)}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-teal-400 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
                      title="Ver receta y rendimiento"
                    >
                      <ChefHat size={16} />
                      <span className="hidden sm:inline">Receta</span>
                    </button>

                    <button
                      onClick={() => handleAddProduct(product)}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        qtyInCart > 0
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-md'
                      }`}
                    >
                      <Plus size={16} />
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
                  {tableLocations.find(l => l.id === currentLoc)?.label} · LOCALITO
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Display */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total A Cobrar</div>
              <div className="text-4xl font-black text-emerald-400 mt-1">
                ${cartSubtotal.toFixed(2)} <span className="text-sm font-normal text-slate-400">MXN</span>
              </div>
            </div>

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
              <div className="bg-teal-950/40 p-3.5 rounded-2xl border border-teal-500/30 text-xs text-teal-200 space-y-1 text-center">
                <p className="font-bold text-sm">💳 Cobro Manual con Tarjeta</p>
                <p className="text-slate-300">
                  Cobrar en tu terminal bancaria física / Clip y confirma cuando apruebe la transacción.
                </p>
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
            <button
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={20} />
              <span>{isProcessingPayment ? 'Procesando Pago...' : 'Confirmar Cobro e Imprimir Ticket'}</span>
            </button>
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
    </div>
  )
}
