import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types/index'
import demoSeedService, { DEMO_INGREDIENTS, DemoIngredient, DemoProduct } from '@/services/demoSeedService'
import DarkKitchenRecipeModal from '@/components/admin/DarkKitchenRecipeModal'
import {
  Plus,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Archive,
  RefreshCw,
  ChefHat,
  Boxes,
  Sparkles
} from 'lucide-react'

export default function InventoryManagement() {
  const { products, setProducts, currentUser } = useAppStore()
  const { canManageInventory, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'low-stock'>('all')
  const [activeTab, setActiveTab] = useState<'ingredients' | 'dishes'>('ingredients')
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null)
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<DemoProduct | null>(null)

  // Estado local para insumos
  const [ingredientsList, setIngredientsList] = useState<DemoIngredient[]>(DEMO_INGREDIENTS)

  useEffect(() => {
    void loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const loadedProducts = await supabaseService.getAllProducts()
      if (loadedProducts && loadedProducts.length > 0) {
        setProducts(loadedProducts)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDemoData = async () => {
    if (!confirm('¿Seguro que deseas BORRAR el inventario actual y cargar el Menú Demo Dark Kitchen México (Insumos, Recetas, Salsas, Desechables y Combos)?')) {
      return
    }

    setLoading(true)
    const result = await demoSeedService.resetAndSeedFnBDemoData()
    setLoading(false)

    if (result.success) {
      setSeedSuccessMsg(result.message)
      setIngredientsList(DEMO_INGREDIENTS)
      await loadProducts()
    } else {
      alert(`Error al poblar demo: ${result.message}`)
    }
  }

  const handleAdjustIngredientStock = (ingredientId: string, delta: number) => {
    setIngredientsList(prev =>
      prev.map(ing => {
        if (ing.id === ingredientId) {
          const newStock = Math.max(0, Number((ing.currentStock + delta).toFixed(2)))
          return { ...ing, currentStock: newStock }
        }
        return ing
      })
    )
  }

  const filteredProducts = products.filter(p => {
    if (filter === 'active') return p.active
    if (filter === 'low-stock') {
      return p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)
    }
    return true
  })

  const filteredIngredients = ingredientsList.filter(ing => {
    if (filter === 'low-stock') return ing.currentStock <= ing.reorderLevel
    return true
  })

  const stats = {
    totalProducts: products.length,
    totalIngredients: ingredientsList.length,
    lowStockIngredients: ingredientsList.filter(ing => ing.currentStock <= ing.reorderLevel).length,
    lowStockProducts: products.filter(p => p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)).length,
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas de Inventario */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">Insumos & Recetas</p>
            <h3 className="text-2xl font-black text-teal-400 mt-1">{stats.totalIngredients}</h3>
          </div>
          <Boxes size={28} className="text-teal-400" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">Platillos del Menú</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.totalProducts}</h3>
          </div>
          <ChefHat size={28} className="text-emerald-400" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">Alertas Reorden Insumos</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.lowStockIngredients}</h3>
          </div>
          <AlertTriangle size={28} className="text-amber-400" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">Desechables & To-Go</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">
              {ingredientsList.filter(i => i.category === 'Empaques To-Go').reduce((acc, i) => acc + i.currentStock, 0)} pzs
            </h3>
          </div>
          <Package size={28} className="text-cyan-400" />
        </div>
      </div>

      {/* Header Acción & Reinicio Demo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Control de Inventario & Dark Kitchen</h2>
          <p className="text-slate-600 text-sm mt-1">
            Gestión en tiempo real de insumos (totopos, salsas, proteínas, empaques to-go) y escandallos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageInventory && !isReadOnly && (
            <>
              <button
                onClick={handleSeedDemoData}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold flex items-center gap-2 shadow-lg transition-all text-xs"
                title="Borrar e iniciar inventario de Dark Kitchen México con insumos y escandallos"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span>Cargar Insumos & Escandallos Dark Kitchen</span>
              </button>
            </>
          )}
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <span>{seedSuccessMsg}</span>
          <button onClick={() => setSeedSuccessMsg(null)} className="text-emerald-600 text-xs font-bold underline">Cerrar</button>
        </div>
      )}

      {/* Main Tabs Selector */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
              activeTab === 'ingredients'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Boxes size={18} className="text-teal-400" />
            <span>Insumos & Materias Primas ({ingredientsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dishes')}
            className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
              activeTab === 'dishes'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ChefHat size={18} className="text-emerald-400" />
            <span>Platillos del Menú & Escandallos ({products.length})</span>
          </button>
        </div>

        {/* Sub-Filtros */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('low-stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === 'low-stock' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
          >
            Stock Bajo / Reorden
          </button>
        </div>
      </div>

      {/* VISTA 1: TABLA DE INSUMOS & MATERIAS PRIMAS (37 INSUMOS REALES) */}
      {activeTab === 'ingredients' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3.5 px-4">Insumo / Materia Prima</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4 text-center">Stock Actual</th>
                  <th className="py-3.5 px-4 text-center">Nivel Reorden</th>
                  <th className="py-3.5 px-4 text-right">Costo Est. / Unidad</th>
                  <th className="py-3.5 px-4 text-center">Acción Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map(ing => {
                  const isLow = ing.currentStock <= ing.reorderLevel

                  return (
                    <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{ing.name}</span>
                        <span className="text-[10px] text-slate-400">Merma tolerada: {ing.wasteMarginPercent}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                          {ing.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-black text-sm px-3 py-1 rounded-lg ${isLow ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-emerald-50 text-emerald-700'}`}>
                          {ing.currentStock} {ing.unitType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {ing.reorderLevel} {ing.unitType}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${ing.costPerUnit || 25} MXN
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAdjustIngredientStock(ing.id, ing.unitType === 'kg' || ing.unitType === 'liter' ? -1 : -10)}
                            className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors font-bold"
                            title="Descontar stock"
                          >
                            <TrendingDown size={16} />
                          </button>
                          <button
                            onClick={() => handleAdjustIngredientStock(ing.id, ing.unitType === 'kg' || ing.unitType === 'liter' ? 1 : 10)}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors font-bold"
                            title="Reabastecer stock"
                          >
                            <TrendingUp size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: GRID DE PLATILLOS CON FOTOS & ESCANDALLOS */}
      {activeTab === 'dishes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProducts.map(product => (
            <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="relative h-44 overflow-hidden bg-slate-900">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute left-4 right-4 bottom-3 text-white flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-teal-300 font-bold">{product.category}</p>
                    <h3 className="font-black text-base leading-tight text-white">{product.name}</h3>
                  </div>
                  <p className="text-xl font-black text-emerald-400">${product.price}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                <button
                  onClick={() => setSelectedRecipeProduct(product as DemoProduct)}
                  className="w-full py-2 px-3 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <ChefHat size={16} className="text-teal-600" />
                  <span>Ver Ficha Técnica & Escandallo To-Go</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRecipeProduct && (
        <DarkKitchenRecipeModal product={selectedRecipeProduct} onClose={() => setSelectedRecipeProduct(null)} />
      )}
    </div>
  )
}