import { useState, useMemo } from 'react'
import { Search, Sparkles, MapPin, ChefHat, Utensils } from 'lucide-react'
import { DEMO_PRODUCTS, DemoProduct } from '@/services/demoSeedService'
import { useAppStore } from '@/store/appStore'
import DarkKitchenRecipeModal from '@/components/admin/DarkKitchenRecipeModal'
import { getTenantSettings } from '@/config/tenantConfig'

export default function PublicMenu() {
  const tenant = getTenantSettings()
  const { products: storeProducts } = useAppStore()
  const displayProducts = useMemo(() => {
    if (storeProducts && storeProducts.length > 0) return storeProducts
    return tenant.isLocalito ? DEMO_PRODUCTS : []
  }, [storeProducts, tenant.isLocalito])

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [recipeModalProduct, setRecipeModalProduct] = useState<DemoProduct | null>(null)

  const categories = ['Todos', 'Quesadillas Maíz', 'Quesadillas Harina', 'Platos', 'Especialidades', 'Extras', 'Bebidas']

  const filteredProducts = useMemo(() => {
    return displayProducts.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [displayProducts, selectedCategory, searchTerm])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 select-none">
      {/* Header Banner - Read Only Digital Menu */}
      <header className="relative bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border-b border-teal-500/20 px-4 py-8 md:py-10 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(20,184,166,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-1">
              <Sparkles size={14} className="text-amber-400" />
              <span>{tenant.isLocalito ? 'Menú Digital QR Informativo · localito.reisbloc.com' : `Menú Digital · ${tenant.clientName}`}</span>
            </div>
            
            {tenant.logoUrl ? (
              <img 
                src={tenant.logoUrl} 
                alt={tenant.clientName} 
                className="h-16 md:h-20 w-auto object-contain rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <Utensils className="text-amber-400" size={32} />
                <h1 className="text-2xl md:text-3xl font-black text-white">{tenant.clientName}</h1>
              </div>
            )}
            
            <p className="text-slate-300 text-sm md:text-base mt-1 max-w-lg font-medium">
              {tenant.isLocalito 
                ? 'Especialidades en Guisos Caseros, Quesadillas de Maíz y Harina, Antojitos, Sopes, Gorditas, Frijoles Puercos y Bebidas.'
                : (tenant.clientTagline || 'Consulta nuestras especialidades y platillos del día.')}
            </p>
          </div>

          <div className="flex flex-col gap-2 max-w-md">
            <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 shadow-xl">
              <MapPin size={22} className="text-teal-400 shrink-0" />
              <div>
                <div className="font-extrabold text-white text-sm">Atención en Barra & Servicio a Mesas</div>
                <div className="text-slate-400 mt-0.5">
                  Los pedidos y comands son tomados directamente en Barra o por nuestro personal capacitado mediante Tablet autorizada.
                </div>
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
              placeholder="Buscar platillo, quesadilla, gordita, sope, bebida..."
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

      {/* Grid de Productos con Fotos Alta Resolución - Solo Lectura */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="low-perf-card bg-slate-900/80 backdrop-blur-md border border-slate-800/80 hover:border-teal-500/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between"
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
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-white/10 text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                    {product.category}
                  </span>
                  <span className="absolute bottom-3 right-3 text-xl font-black text-white px-3.5 py-1.5 rounded-xl bg-teal-600/90 backdrop-blur shadow-lg border border-teal-400/30">
                    ${product.price} <span className="text-xs font-normal">MXN</span>
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 pt-1">
                <button
                  onClick={() => setRecipeModalProduct(product)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-teal-400 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <ChefHat size={16} />
                  <span>Ver Receta & Rendimiento</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Recipe Escandallo Modal */}
      {recipeModalProduct && (
        <DarkKitchenRecipeModal
          isOpen={!!recipeModalProduct}
          onClose={() => setRecipeModalProduct(null)}
          product={recipeModalProduct}
        />
      )}
    </div>
  )
}
