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

  // Lista dinámica de categorías sincronizadas con la gestión de inventario
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {filteredProducts.map(product => {
            const CategoryIcon = getCategoryIcon(product.category)
            const outOfStock = isOutOfStock(product)
            const lowStock = isLowStock(product)

            return (
            <button
              key={product.id}
              onClick={() => !disableAdd && onAdd(product)}
              disabled={disableAdd}
              className={`group relative text-left rounded-2xl border p-2.5 sm:p-3 shadow-sm transition-all transform active:scale-95 hover:shadow-md ${
                outOfStock || disableAdd
                  ? 'border-red-200 bg-red-50/40 opacity-60 cursor-not-allowed'
                  : 'border-slate-200/80 bg-white hover:border-amber-400 hover:-translate-y-0.5'
              }`}
            >
              {/* Product Image - Compact & Optimized */}
              <div className="relative mb-2 h-24 sm:h-28 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-100 shadow-inner">
                {product.imageUrl && !brokenImages[product.id] ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => {
                      setBrokenImages(prev => ({ ...prev, [product.id]: true }))
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                    <CategoryIcon size={24} />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                <div className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${getCategoryGradient(product.category)} px-2 py-0.5 text-[9px] font-bold text-white shadow-sm`}>
                  <CategoryIcon size={10} />
                  <span>{product.category}</span>
                </div>

                {!outOfStock && !disableAdd && (
                  <div className="absolute bottom-1.5 right-1.5 rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black shadow-md opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    + Añadir
                  </div>
                )}
              </div>

              {/* Title and Price */}
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors" title={product.name}>
                  {product.name}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm sm:text-base font-black text-emerald-600">
                    {currency.format(product.price)}
                  </p>
                  
                  {/* Compact Stock indicator */}
                  {product.hasInventory && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      outOfStock
                        ? 'bg-red-100 text-red-700'
                        : lowStock
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {outOfStock ? 'Agotado' : `${product.currentStock ?? 0}`}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )})}
        </div>
      )}
    </div>
  )
}

export default ProductGrid

