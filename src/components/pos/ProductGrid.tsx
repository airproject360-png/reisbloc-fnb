import { useMemo, useState } from 'react'
import { Product } from '@/types'
import { Package, AlertTriangle, CheckCircle, Utensils, Wine } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product) => void
  disableAdd?: boolean
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const categoryColors: Record<string, string> = {
  'Bebidas': 'from-blue-500 to-cyan-500',
  'Desayuno': 'from-orange-400 to-amber-500',
  'Especialidades': 'from-teal-500 to-emerald-600',
  'Entradas': 'from-lime-500 to-green-600',
  'Postres': 'from-pink-400 to-rose-500',
  'Otros': 'from-gray-500 to-gray-600',
}

export function ProductGrid({ products, onAdd, disableAdd = false }: ProductGridProps) {
  const [filter, setFilter] = useState<'all' | 'food' | 'drinks'>('all')
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const isOutOfStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) <= 0
  }

  const isLowStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) > 0 && (product.currentStock ?? 0) <= (product.minimumStock ?? 5)
  }

  const getCategoryGradient = (category: string): string => {
    return categoryColors[category] || 'from-gray-500 to-gray-600'
  }

  const filteredProducts = useMemo(() => {
    if (filter === 'drinks') return products.filter(p => p.category === 'Bebidas')
    if (filter === 'food') return products.filter(p => p.category !== 'Bebidas' && p.category !== 'Postres')
    return products
  }, [products, filter])

  const totalDrinks = useMemo(() => products.filter(p => p.category === 'Bebidas').length, [products])
  const totalFood = useMemo(() => products.filter(p => p.category !== 'Bebidas' && p.category !== 'Postres').length, [products])

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-indigo-600" size={28} />
            Productos
          </h2>
          <p className="text-sm text-gray-500 mt-1">Selecciona para agregar al pedido</p>
        </div>
        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
          {filteredProducts.length} ítems
        </span>
      </div>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Todos ({products.length})
        </button>
        <button
          onClick={() => setFilter('food')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            filter === 'food' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          <Utensils size={16} /> Alimentos ({totalFood})
        </button>
        <button
          onClick={() => setFilter('drinks')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            filter === 'drinks' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          <Wine size={16} /> Bebidas ({totalDrinks})
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg font-medium">No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => !disableAdd && onAdd(product)}
              disabled={disableAdd}
              className={`group relative text-left rounded-2xl border-2 p-5 shadow-md transition-all transform hover:scale-105 ${
                isOutOfStock(product) || disableAdd
                  ? 'border-red-300 bg-red-50/50 opacity-60 cursor-not-allowed'
                  : 'border-transparent bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {/* Product Image */}
              <div className="relative mb-4 h-36 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {product.imageUrl && !brokenImages[product.id] ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => {
                      setBrokenImages(prev => ({ ...prev, [product.id]: true }))
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                    <Package size={34} />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent" />
              </div>

              {/* Category Badge */}
              <div className={`absolute top-3 right-3 bg-gradient-to-r ${getCategoryGradient(product.category)} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}>
                {product.category}
              </div>

              <div className="mt-2">
                <p className="text-lg font-bold text-gray-900 mb-1 pr-20">{product.name}</p>
                <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {currency.format(product.price)}
                </p>
              </div>

              {/* Stock Status */}
              {product.hasInventory && (
                <div className="mt-4">
                  {isOutOfStock(product) ? (
                    <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-xl px-3 py-2">
                      <AlertTriangle className="text-red-600" size={18} />
                      <span className="text-sm font-bold text-red-700">Agotado</span>
                    </div>
                  ) : isLowStock(product) ? (
                    <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 rounded-xl px-3 py-2">
                      <AlertTriangle className="text-amber-600" size={18} />
                      <span className="text-sm font-bold text-amber-700">
                        Stock bajo: {product.currentStock ?? 0}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-xl px-3 py-2">
                      <CheckCircle className="text-green-600" size={18} />
                      <span className="text-sm font-bold text-green-700">
                        Stock: {product.currentStock ?? 0}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Hover Effect */}
              {!isOutOfStock(product) && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductGrid
