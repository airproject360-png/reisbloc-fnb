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
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})

  const getCategoryIcon = (category: string) => {
    return category === 'Bebidas' ? Wine : Utensils
  }
  const isOutOfStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) <= 0
  }

  const isLowStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) > 0 && (product.currentStock ?? 0) <= (product.minimumStock ?? 5)
  }

  const getCategoryGradient = (category: string): string => {
    return categoryColors[category] || 'from-gray-500 to-gray-600'
  }

  // Lista dinámica de categorías basadas en el menú de LOCALITO
  const categories = useMemo(() => {
    const defaultCats = ['Todos', 'Quesadillas Maíz', 'Quesadillas Harina', 'Platos', 'Especialidades', 'Extras', 'Bebidas']
    const prodCats = Array.from(new Set(products.map(p => p.category))).filter(c => c && !defaultCats.includes(c))
    return [...defaultCats, ...prodCats]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return products
    return products.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase())
  }, [products, selectedCategory])

  const getCategoryCount = (cat: string) => {
    if (cat === 'Todos') return products.length
    return products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 select-none">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="text-amber-500" size={28} />
            Catálogo POS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Toca el producto para agregar al ticket</p>
        </div>
        <span className="bg-slate-900 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-2xl text-xs font-black shadow-md">
          {filteredProducts.length} platillo(s)
        </span>
      </div>

      {/* Pestañas de Categoría Táctiles POS (Como en el Menú) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
        {categories.map((cat) => {
          const count = getCategoryCount(cat)
          const isActive = selectedCategory.toLowerCase() === cat.toLowerCase()
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 min-h-[44px] active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 border border-amber-400 scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>{cat}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>


      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg font-medium">No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => {
            const CategoryIcon = getCategoryIcon(product.category)
            const outOfStock = isOutOfStock(product)
            const lowStock = isLowStock(product)

            return (
            <button
              key={product.id}
              onClick={() => !disableAdd && onAdd(product)}
              disabled={disableAdd}
              className={`group relative text-left rounded-2xl border-2 p-5 shadow-md transition-all transform hover:scale-105 ${
                outOfStock || disableAdd
                  ? 'border-red-300 bg-red-50/50 opacity-60 cursor-not-allowed'
                  : 'border-transparent bg-gradient-to-br from-white to-slate-50 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {/* Product Image */}
              <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
                {product.imageUrl && !brokenImages[product.id] ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={() => {
                      setBrokenImages(prev => ({ ...prev, [product.id]: true }))
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                    <CategoryIcon size={34} />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${getCategoryGradient(product.category)} px-3 py-1 text-xs font-bold text-white shadow-lg`}>
                  <CategoryIcon size={12} />
                  {product.category}
                </div>

                {!outOfStock && !disableAdd && (
                  <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    + Agregar
                  </div>
                )}
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
                  {outOfStock ? (
                    <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-xl px-3 py-2">
                      <AlertTriangle className="text-red-600" size={18} />
                      <span className="text-sm font-bold text-red-700">Agotado</span>
                    </div>
                  ) : lowStock ? (
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
              {!outOfStock && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all pointer-events-none" />
              )}
            </button>
          )})}
        </div>
      )}
    </div>
  )
}

export default ProductGrid
