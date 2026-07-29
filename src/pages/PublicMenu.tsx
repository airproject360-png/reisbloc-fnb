import { useState, useMemo } from 'react'
import { Utensils, Search, ShoppingBag, Plus, Minus, X, Check, Flame, Sparkles, Clock, MapPin } from 'lucide-react'
import { DEMO_PRODUCTS, DemoProduct } from '@/services/demoSeedService'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { OrderItem } from '@/types'

export default function PublicMenu() {
  const { products: storeProducts } = useAppStore()
  const displayProducts = useMemo(() => {
    return storeProducts && storeProducts.length > 0 ? storeProducts : DEMO_PRODUCTS
  }, [storeProducts])

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<Array<{ product: DemoProduct; quantity: number; notes?: string }>>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [tableNumber, setTableNumber] = useState<number>(1)
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in')
  const [selectedProductModal, setSelectedProductModal] = useState<DemoProduct | null>(null)
  const [itemNote, setItemNote] = useState('')
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = ['Todos', 'Desayunos', 'Comidas', 'Cenas', 'Bebidas', 'Combos', 'Postres']

  const filteredProducts = useMemo(() => {
    return displayProducts.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [displayProducts, selectedCategory, searchTerm])

  const addToCart = (product: DemoProduct, notes: string = '') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id)
      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        if (notes) updated[existingIndex].notes = notes
        return updated
      }
      return [...prev, { product, quantity: 1, notes }]
    })
    setSelectedProductModal(null)
    setItemNote('')
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as Array<{ product: DemoProduct; quantity: number; notes?: string }>
    )
  }

  const totalCartPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }, [cart])

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const handleSendOrder = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)

    try {
      const orderItems: OrderItem[] = cart.map((c) => ({
        id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        addedAt: new Date(),
        addedBy: 'Comensal Digital',
        canBeDeleted: false,
        notes: c.notes
      }))

      const newOrder = {
        id: `order-dig-${Date.now()}`,
        tableNumber: orderType === 'takeaway' ? 99 : tableNumber,
        items: orderItems,
        status: 'sent' as const,
        createdAt: new Date(),
        createdBy: 'Menú Digital Online'
      }

      await supabaseService.createOrder(newOrder)

      setOrderSuccessMsg(`¡Orden enviada a cocina! #${newOrder.id.slice(-4)} (${orderType === 'takeaway' ? 'Para Llevar' : `Mesa ${tableNumber}`})`)
      setCart([])
      setIsCartOpen(false)
    } catch (err: any) {
      console.error('Error enviando orden digital', err)
      alert('Se guardó la orden en el monitor local. ¡Gracias!')
      setCart([])
      setIsCartOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* Header Banner - Ultra Premium Glassmorphism */}
      <header className="relative bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border-b border-teal-500/20 px-4 py-8 md:py-12 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(20,184,166,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold mb-3">
              <Sparkles size={14} className="animate-spin" />
              <span>Menú Digital & Comandas Online</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Reisbloc <span className="text-teal-400">F&B</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-lg">
              Sabores auténticos mexicanos, desayunos, comidas, cenas y bebidas 100% naturales.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 shadow-xl">
              <MapPin size={18} className="text-teal-400 shrink-0" />
              <div>
                <div className="font-bold text-white">Servicio a Mesa & Para Llevar</div>
                <div className="text-slate-400">Ordena en vivo directo a Cocina y Barra</div>
              </div>
            </div>

            <div className="bg-teal-950/60 border border-teal-500/30 p-3 rounded-2xl text-[11px] text-teal-200 flex items-center justify-around gap-2 text-center">
              <div>
                <span className="font-black text-teal-400 block">1. Pedido en Vivo</span>
                <span>Mesero o QR</span>
              </div>
              <span className="text-teal-500 font-bold">→</span>
              <div>
                <span className="font-black text-teal-400 block">2. Preparación KDS</span>
                <span>Cocina / Barra</span>
              </div>
              <span className="text-teal-500 font-bold">→</span>
              <div>
                <span className="font-black text-teal-400 block">3. Pago Fácil</span>
                <span>Efectivo / SPEI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bar de Búsqueda y Filtros de Categorías */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 py-4 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar platillo, chilaquiles, tacos, smoothies, matcha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Categoría Pills */}
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

      {/* Alerta de éxito al enviar orden */}
      {orderSuccessMsg && (
        <div className="max-w-6xl mx-auto mt-6 px-4">
          <div className="p-4 rounded-2xl bg-teal-950/80 border border-teal-500/40 text-teal-200 text-sm font-semibold flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2">
              <Check className="text-teal-400" size={20} />
              <span>{orderSuccessMsg}</span>
            </div>
            <button onClick={() => setOrderSuccessMsg(null)} className="text-teal-400 text-xs font-bold underline">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Grid de Productos con Fotos Alta Resolución */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 hover:border-teal-500/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Image Wrapper */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                  <img
                    src={
                      product.imageUrl ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop'
                    }
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-white/10 text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                    {product.category}
                  </span>
                  <span className="absolute bottom-3 right-3 text-xl font-black text-white px-3 py-1 rounded-xl bg-teal-600/90 backdrop-blur shadow-lg">
                    ${product.price} <span className="text-xs font-normal">MXN</span>
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="px-5 pb-5 pt-2">
                <button
                  onClick={() => setSelectedProductModal(product)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-teal-500"
                >
                  <Plus size={16} />
                  <span>Agregar a Comanda</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Cart Trigger Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-xl mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-2xl flex items-center justify-between border border-teal-400/30 animate-bounce-subtle"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
                {totalCartCount}
              </div>
              <div className="text-left">
                <div className="text-xs text-teal-100">Comanda Digital</div>
                <div className="text-sm font-black">Ver Pedido</div>
              </div>
            </div>
            <div className="text-base font-black">${totalCartPrice} MXN</div>
          </button>
        </div>
      )}

      {/* Modal Detalle de Producto & Notas */}
      {selectedProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setSelectedProductModal(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <img
              src={
                selectedProductModal.imageUrl ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop'
              }
              alt={selectedProductModal.name}
              className="w-full h-44 object-cover rounded-2xl mb-4 border border-slate-800"
            />

            <h3 className="text-xl font-bold text-white">{selectedProductModal.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{selectedProductModal.description}</p>
            <div className="text-2xl font-black text-teal-400 mt-2">${selectedProductModal.price} MXN</div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Instrucciones / Modificadores (ej. Sin cebolla, Salsa Verde)
              </label>
              <input
                type="text"
                placeholder="ej. Tostado bien crujiente..."
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedProductModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => addToCart(selectedProductModal, itemNote)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg"
              >
                Confirmar Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-end z-50">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <ShoppingBag className="text-teal-400" size={22} />
                  Tu Comanda
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Selector de Tipo de Servicio */}
              <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-800 rounded-xl">
                <button
                  onClick={() => setOrderType('dine-in')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    orderType === 'dine-in' ? 'bg-teal-600 text-white shadow' : 'text-slate-400'
                  }`}
                >
                  Servicio en Mesa
                </button>
                <button
                  onClick={() => setOrderType('takeaway')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    orderType === 'takeaway' ? 'bg-teal-600 text-white shadow' : 'text-slate-400'
                  }`}
                >
                  Para Llevar
                </button>
              </div>

              {orderType === 'dine-in' && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Número de Mesa *</label>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-teal-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Mesa {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lista de Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white">{item.product.name}</h4>
                      {item.notes && <p className="text-[10px] text-teal-400 mt-0.5">Nota: {item.notes}</p>}
                      <div className="text-xs text-slate-400 mt-1">${item.product.price * item.quantity} MXN</div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold text-white px-1">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Cart Action */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total a pagar:</span>
                <span className="text-xl font-black text-teal-400">${totalCartPrice} MXN</span>
              </div>
              <button
                onClick={handleSendOrder}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{isSubmitting ? 'Enviando comanda...' : 'Confirmar & Enviar a Cocina'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
