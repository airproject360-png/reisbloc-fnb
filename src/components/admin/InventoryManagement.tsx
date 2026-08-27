import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types/index'
import demoSeedService, { DEMO_INGREDIENTS, DemoIngredient, DemoProduct } from '@/services/demoSeedService'
import DarkKitchenRecipeModal from '@/components/admin/DarkKitchenRecipeModal'
import { optimizeImageFile } from '@/utils/imageOptimizationService'
import {
  Plus,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  RefreshCw,
  ChefHat,
  Boxes,
  Upload,
  Image as ImageIcon,
  X,
  Trash2,
  Sparkles,
  DollarSign
} from 'lucide-react'

export default function InventoryManagement() {
  const { products, setProducts, currentUser } = useAppStore()
  const { canManageInventory, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'low-stock'>('all')
  const [activeTab, setActiveTab] = useState<'ingredients' | 'dishes'>('ingredients')
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null)
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<DemoProduct | null>(null)

  // Estado para modal de crear/editar producto
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form state
  const [productName, setProductName] = useState('')
  const [productCategory, setProductCategory] = useState('Quesadillas Maíz')
  const [productPrice, setProductPrice] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productImageUrl, setProductImageUrl] = useState('')
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  // Receta state (insumos requeridos)
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string; quantityRequired: number }[]>([
    { ingredientId: 'ing-26', quantityRequired: 1 }, // Tortilla maíz por defecto
  ])

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
    if (!confirm('¿Seguro que deseas BORRAR el inventario actual y cargar el Menú Demo Dark Kitchen México (Insumos, Recetas y Desechables)?')) {
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

  // Manejador de subida y compresión automática de fotos (<80 KB)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const { dataUrl, sizeKb } = await optimizeImageFile(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
      })
      setProductImageUrl(dataUrl)
      setImageSizeKb(sizeKb)
    } catch (err) {
      alert('No se pudo optimizar la imagen. Intenta con otra foto.')
    } finally {
      setIsCompressing(false)
    }
  }

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setProductName(product.name)
      setProductCategory(product.category)
      setProductPrice(product.price.toString())
      setProductDescription(product.description || '')
      setProductImageUrl(product.imageUrl || '')
      setImageSizeKb(null)
      setRecipeItems((product as DemoProduct).recipeIngredients || [{ ingredientId: 'ing-26', quantityRequired: 1 }])
    } else {
      setEditingProduct(null)
      setProductName('')
      setProductCategory('Quesadillas Maíz')
      setProductPrice('')
      setProductDescription('')
      setProductImageUrl('')
      setImageSizeKb(null)
      setRecipeItems([{ ingredientId: 'ing-26', quantityRequired: 1 }])
    }
    setShowProductModal(true)
  }

  const handleAddRecipeIngredient = () => {
    setRecipeItems(prev => [...prev, { ingredientId: 'ing-27', quantityRequired: 1 }])
  }

  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipeItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      alert('Por favor ingresa el nombre del platillo')
      return
    }

    const priceNum = parseFloat(productPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Por favor ingresa un precio válido')
      return
    }

    if (recipeItems.length === 0) {
      alert('⚠️ Debes asignar al menos 1 insumo a la receta del platillo para el control de inventario.')
      return
    }

    const newProduct: any = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: productName,
      category: productCategory,
      price: priceNum,
      description: productDescription,
      imageUrl: productImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
      active: true,
      hasInventory: true,
      currentStock: 100,
      minimumStock: 10,
      recipeIngredients: recipeItems,
    }

    // Actualizar lista en store
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? newProduct : p))
    } else {
      setProducts([newProduct, ...products])
    }

    setShowProductModal(false)
    alert(`✅ Platillo "${productName}" guardado exitosamente con su receta de inventario.`)
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
  }

  const categoriesList = ['Quesadillas Maíz', 'Quesadillas Harina', 'Platos', 'Especialidades', 'Extras', 'Bebidas']

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none font-sans">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase">Total Insumos</p>
            <p className="text-3xl font-black text-teal-400 mt-1">{stats.totalIngredients}</p>
          </div>
          <Boxes size={28} className="text-teal-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase">Platillos con Receta</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{stats.totalProducts}</p>
          </div>
          <ChefHat size={28} className="text-emerald-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase">Insumos Stock Bajo</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{stats.lowStockIngredients}</p>
          </div>
          <Package size={28} className="text-amber-400" />
        </div>
      </div>

      {/* Header Acción */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Control de Inventario & Recetas</h2>
          <p className="text-slate-600 text-sm mt-1">
            Gestión en tiempo real de insumos (totopos, guisos, tortillas, proteínas) y recetas del menú.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageInventory && !isReadOnly && (
            <>
              <button
                onClick={() => handleOpenProductModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black flex items-center gap-2 shadow-lg transition-all text-xs active:scale-95"
              >
                <Plus size={16} />
                <span>+ Crear Nuevo Platillo con Receta</span>
              </button>

              <button
                onClick={handleSeedDemoData}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-slate-200 hover:bg-slate-800 font-bold flex items-center gap-2 border border-slate-800 text-xs"
                title="Restablecer insumos y recetas por defecto"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Recargar Recetas Demo</span>
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
            <span>Platillos del Menú & Recetas ({products.length})</span>
          </button>
        </div>

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

      {/* VISTA 1: TABLA DE INSUMOS */}
      {activeTab === 'ingredients' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-900 text-slate-300 text-xs uppercase font-extrabold">
                <tr>
                  <th className="p-4">Insumo / Materia Prima</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-center">Stock Actual</th>
                  <th className="p-4 text-center">Stock Mínimo</th>
                  <th className="p-4 text-right">Ajuste Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map(ing => {
                  const isLow = ing.currentStock <= ing.reorderLevel
                  return (
                    <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {ing.name}
                        <span className="block text-xs font-normal text-slate-400">Unidad: {ing.unitType}</span>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-500">{ing.category}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {ing.currentStock} {ing.unitType}
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs font-bold text-slate-500">{ing.reorderLevel} {ing.unitType}</td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustIngredientStock(ing.id, ing.unitType === 'kg' || ing.unitType === 'liter' ? -0.5 : -1)}
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

      {/* VISTA 2: GRID DE PLATILLOS CON FOTOS & RECETAS */}
      {activeTab === 'dishes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProducts.map(product => (
            <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
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
                </div>
              </div>

              <div className="p-4 pt-0 space-y-2">
                <button
                  onClick={() => setSelectedRecipeProduct(product as DemoProduct)}
                  className="w-full py-2 px-3 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <ChefHat size={16} className="text-teal-600" />
                  <span>Ver Receta & Insumos</span>
                </button>

                {canManageInventory && !isReadOnly && (
                  <button
                    onClick={() => handleOpenProductModal(product)}
                    className="w-full py-2 px-3 bg-slate-900 text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Edit2 size={14} className="text-amber-400" />
                    <span>Editar Platillo y Foto</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR PLATILLO CON COMPRESIÓN DE FOTO & RECETA OBLIGATORIA */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {editingProduct ? 'Editar Platillo & Receta' : 'Nuevo Platillo del Menú Interactivo'}
                </h3>
                <p className="text-xs text-teal-400 font-bold mt-0.5">
                  Foto optimizada WebP (menos de 80 KB) + Receta de Insumos Obligatoria
                </p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Form Input Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nombre del Platillo *</label>
                  <input
                    type="text"
                    placeholder="Ej. Quesadilla de Chicharrón Prensado"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Categoría del Menú *</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 text-sm font-semibold"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Precio de Venta ($ MXN) *</label>
                  <input
                    type="number"
                    placeholder="45.00"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 text-sm font-black text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Descripción Breve</label>
                  <input
                    type="text"
                    placeholder="Quesadilla hecha a mano con guiso casero..."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              </div>

              {/* Subida & Compresión Automática de Foto (<80 KB) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="block font-bold text-teal-300">
                  📸 Foto del Platillo (Compresión Automática Ligera WebP):
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {productImageUrl ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-800 shrink-0 bg-slate-900">
                      <img src={productImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-dashed border-slate-800 bg-slate-900 flex flex-col items-center justify-center text-slate-500 shrink-0">
                      <ImageIcon size={28} />
                      <span className="text-[10px] mt-1">Sin foto</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer"
                    />
                    {isCompressing && (
                      <p className="text-amber-400 font-bold animate-pulse">Optimizando y reduciendo tamaño de foto...</p>
                    )}
                    {imageSizeKb !== null && (
                      <p className="text-emerald-400 font-bold">
                        ⚡ Foto Optimizada: {imageSizeKb} KB (WebP Ultra-Ligero, listo para BD)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Receta e Insumos Obligatorios */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ChefHat size={16} />
                    <span>Receta & Insumos Requeridos por Porción (Obligatorio)</span>
                  </label>
                  <button
                    onClick={handleAddRecipeIngredient}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>+ Agregar Insumo</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {recipeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <select
                        value={item.ingredientId}
                        onChange={(e) => {
                          const val = e.target.value
                          setRecipeItems(prev => prev.map((ri, i) => i === idx ? { ...ri, ingredientId: val } : ri))
                        }}
                        className="flex-1 bg-slate-950 text-white p-2 rounded-lg border border-slate-800 font-bold text-xs"
                      >
                        {ingredientsList.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unitType})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Porción (ej. 1 u 0.05)"
                        value={item.quantityRequired}
                        onChange={(e) => {
                          const qty = parseFloat(e.target.value) || 0
                          setRecipeItems(prev => prev.map((ri, i) => i === idx ? { ...ri, quantityRequired: qty } : ri))
                        }}
                        className="w-28 bg-slate-950 text-emerald-400 p-2 rounded-lg border border-slate-800 font-black text-xs text-center"
                      />

                      {recipeItems.length > 1 && (
                        <button
                          onClick={() => handleRemoveRecipeIngredient(idx)}
                          className="p-2 text-rose-400 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg"
              >
                Guardar Platillo & Receta
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecipeProduct && (
        <DarkKitchenRecipeModal product={selectedRecipeProduct} onClose={() => setSelectedRecipeProduct(null)} />
      )}
    </div>
  )
}