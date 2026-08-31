import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'
import logger from '@/utils/logger'
import { Product } from '@/types/index'
import { DEMO_INGREDIENTS, DemoIngredient, DemoProduct } from '@/services/demoSeedService'
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
  DollarSign,
  Printer,
  ShoppingCart,
  CheckSquare,
  Square
} from 'lucide-react'

interface ShoppingItem {
  id: string
  name: string
  category: string
  unitType: string
  currentStock: number
  reorderLevel: number
  neededQuantity: number
  selected: boolean
  isCustom?: boolean
}

export default function InventoryManagement() {
  const { products, setProducts, currentUser } = useAppStore()
  const { canManageInventory, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'low-stock'>('all')
  const [activeTab, setActiveTab] = useState<'ingredients' | 'dishes'>('ingredients')
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<DemoProduct | null>(null)

  // Estado local para insumos
  const [ingredientsList, setIngredientsList] = useState<DemoIngredient[]>(DEMO_INGREDIENTS)

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

  // Estado para gestión de categorías
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('localito_categories')
      if (stored) return JSON.parse(stored)
    } catch {}
    return ['Quesadillas Maíz', 'Quesadillas Harina', 'Platos', 'Especialidades', 'Extras', 'Bebidas']
  })
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [editingCatName, setEditingCatName] = useState<string | null>(null)
  const [editCatInput, setEditCatInput] = useState('')

  // Estado para crear nuevo insumo rápido
  const [showNewIngredientModal, setShowNewIngredientModal] = useState(false)
  const [newIngName, setNewIngName] = useState('')
  const [newIngCategory, setNewIngCategory] = useState('Proteínas')
  const [newIngUnit, setNewIngUnit] = useState<'kg' | 'g' | 'l' | 'ml' | 'units'>('kg')
  const [newIngCost, setNewIngCost] = useState('')
  const [newIngStock, setNewIngStock] = useState('10')
  const [newIngReorder, setNewIngReorder] = useState('2')

  // Estado para Lista de Compras 58mm
  const [showShoppingListModal, setShowShoppingListModal] = useState(false)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [customItemName, setCustomItemName] = useState('')
  const [customItemQty, setCustomItemQty] = useState('1')
  const [customItemUnit, setCustomItemUnit] = useState('kg')

  useEffect(() => {
    void loadProducts()
  }, [])

  const saveCategories = (newCats: string[]) => {
    setCategoriesList(newCats)
    try {
      localStorage.setItem('localito_categories', JSON.stringify(newCats))
    } catch (e) {
      console.error('Error guardando categorías:', e)
    }
  }

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim()
    if (!trimmed) return
    if (categoriesList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoría ya existe.')
      return
    }
    const updated = [...categoriesList, trimmed]
    saveCategories(updated)
    setNewCatInput('')
  }

  const handleUpdateCategory = (oldName: string) => {
    const trimmed = editCatInput.trim()
    if (!trimmed || trimmed === oldName) {
      setEditingCatName(null)
      return
    }
    const updated = categoriesList.map(c => c === oldName ? trimmed : c)
    saveCategories(updated)
    setEditingCatName(null)
    setEditCatInput('')
  }

  const handleDeleteCategory = (catName: string) => {
    if (categoriesList.length <= 1) {
      alert('Debe existir al menos una categoría en el menú.')
      return
    }
    if (!confirm(`¿Eliminar la categoría "${catName}"? Los platillos con esta categoría deberán ser reasignados.`)) {
      return
    }
    const updated = categoriesList.filter(c => c !== catName)
    saveCategories(updated)
    if (productCategory === catName) {
      setProductCategory(updated[0])
    }
  }

  const handleCreateIngredient = async () => {
    if (!newIngName.trim()) {
      alert('Ingresa el nombre del insumo.')
      return
    }
    const cost = parseFloat(newIngCost) || 0
    const stock = parseFloat(newIngStock) || 0
    const reorder = parseFloat(newIngReorder) || 1

    const newIng: DemoIngredient = {
      id: `ing-${Date.now()}`,
      name: newIngName.trim(),
      category: newIngCategory,
      unitType: newIngUnit,
      currentStock: stock,
      reorderLevel: reorder,
      wasteMarginPercent: 5,
      costPerUnit: cost
    }

    setIngredientsList(prev => [newIng, ...prev])
    setRecipeItems(prev => [...prev, { ingredientId: newIng.id, quantityRequired: 1 }])
    setShowNewIngredientModal(false)
    setNewIngName('')
    setNewIngCost('')

    // Registro de Auditoría
    try {
      await supabaseService.logAudit({
        organization_id: supabaseService.getCurrentOrgId(),
        user_id: currentUser?.id,
        action: 'INGREDIENT_CREATED',
        table_name: 'ingredients',
        record_id: newIng.id,
        changes: {
          name: newIng.name,
          category: newIng.category,
          unitType: newIng.unitType,
          currentStock: newIng.currentStock,
          reorderLevel: newIng.reorderLevel,
          costPerUnit: newIng.costPerUnit,
          createdBy: currentUser?.username || currentUser?.name,
          role: currentUser?.role,
          timestamp: new Date().toISOString(),
        }
      })
    } catch (e) {
      logger.warn('audit', 'Error registrando auditoria de insumo:', e as any)
    }

    alert(`✅ Insumo "${newIng.name}" creado y agregado a la receta.`)
  }

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

  const handleAdjustIngredientStock = async (ingredientId: string, delta: number) => {
    const target = ingredientsList.find(i => i.id === ingredientId)
    const oldStock = target?.currentStock ?? 0
    const newStock = Math.max(0, Number((oldStock + delta).toFixed(2)))

    setIngredientsList(prev =>
      prev.map(ing => {
        if (ing.id === ingredientId) {
          return { ...ing, currentStock: newStock }
        }
        return ing
      })
    )

    // Registro de auditoría obligatorio
    try {
      await supabaseService.logAudit({
        organization_id: supabaseService.getCurrentOrgId(),
        user_id: currentUser?.id,
        action: 'INGREDIENT_STOCK_ADJUSTED',
        table_name: 'ingredients',
        record_id: ingredientId,
        changes: {
          ingredientName: target?.name,
          delta,
          oldStock,
          newStock,
          adjustedBy: currentUser?.username || currentUser?.name,
          role: currentUser?.role,
          timestamp: new Date().toISOString(),
        }
      })
    } catch (e) {
      logger.warn('audit', 'Error registrando auditoria de stock:', e as any)
    }
  }

  // Manejador de lista de compras 58mm
  const handleOpenShoppingListModal = () => {
    const initial: ShoppingItem[] = ingredientsList.map(ing => {
      const isLow = ing.currentStock <= ing.reorderLevel
      const deficit = isLow ? Math.max(1, Number(((ing.reorderLevel * 2) - ing.currentStock).toFixed(1))) : 1
      return {
        id: ing.id,
        name: ing.name,
        category: ing.category,
        unitType: ing.unitType,
        currentStock: ing.currentStock,
        reorderLevel: ing.reorderLevel,
        neededQuantity: deficit,
        selected: isLow,
      }
    })
    setShoppingItems(initial)
    setShowShoppingListModal(true)
  }

  const handleAddCustomShoppingItem = () => {
    if (!customItemName.trim()) return
    const newItem: ShoppingItem = {
      id: `custom-${Date.now()}`,
      name: customItemName.trim(),
      category: 'Extra / Insumo',
      unitType: customItemUnit,
      currentStock: 0,
      reorderLevel: 0,
      neededQuantity: parseFloat(customItemQty) || 1,
      selected: true,
      isCustom: true,
    }
    setShoppingItems(prev => [newItem, ...prev])
    setCustomItemName('')
    setCustomItemQty('1')
  }

  const handlePrintShoppingList = async () => {
    const selectedList = shoppingItems.filter(i => i.selected)
    if (selectedList.length === 0) {
      alert('⚠️ Selecciona al menos un insumo para generar la lista de compras.')
      return
    }

    const dateStr = new Date().toLocaleString('es-MX')
    const operator = currentUser?.username || currentUser?.name || 'Cocina LOCALITO'
    const role = currentUser?.role || 'cocinero'

    const itemsHtml = selectedList.map(item => `
      <div style="padding:4px 0;border-bottom:1px dashed #bbb;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:11px;">
          <span style="font-weight:bold;">[ ] ${item.name}</span>
          <div style="font-size:9px;color:#555;">Stock: ${item.currentStock} ${item.unitType} (Min: ${item.reorderLevel})</div>
        </div>
        <div style="font-size:12px;font-weight:900;text-align:right;">
          ${item.neededQuantity} ${item.unitType}
        </div>
      </div>
    `).join('')

    const ticketHtml = `
      <div style="width:58mm;padding:6px;font-family:'Courier New', monospace;font-size:11px;line-height:1.25;color:#000;">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:6px;">
          <div style="font-weight:900;font-size:15px;letter-spacing:1px;">LOCALITO</div>
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;margin-top:2px;">LISTA DE COMPRAS & RESURTIDO</div>
          <div style="font-size:8px;color:#444;margin-top:2px;">localito.reisbloc.com</div>
        </div>

        <div style="font-size:9px;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:6px;">
          <div><strong>Fecha:</strong> ${dateStr}</div>
          <div><strong>Solicitado por:</strong> ${operator} (${role.toUpperCase()})</div>
          <div><strong>Total Artículos:</strong> ${selectedList.length} insumos</div>
        </div>

        <div style="border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-size:9px;font-weight:bold;margin-bottom:4px;border-bottom:1px solid #000;padding-bottom:2px;">
            <span>INSUMO A COMPRAR</span>
            <span>CANTIDAD</span>
          </div>
          ${itemsHtml}
        </div>

        <div style="text-align:center;font-size:9px;margin-top:8px;">
          <div style="border:1px solid #000;padding:4px;margin-bottom:4px;">
            [ ] Surtido verificado y recibido en cocina
          </div>
          <div style="font-size:8px;color:#555;">Reisbloc F&B · Dark Kitchen Supplies</div>
        </div>
      </div>
    `

    try {
      await printService.printReceipt(ticketHtml, { title: 'Lista de Compras 58mm', width: 58 })
      
      // Log audit
      try {
        await supabaseService.logAudit({
          organization_id: supabaseService.getCurrentOrgId(),
          user_id: currentUser?.id,
          action: 'SHOPPING_LIST_GENERATED',
          table_name: 'inventory',
          record_id: `shop-${Date.now()}`,
          changes: {
            generatedBy: operator,
            role,
            itemCount: selectedList.length,
            items: selectedList.map(i => ({ name: i.name, qty: i.neededQuantity, unit: i.unitType })),
            timestamp: new Date().toISOString(),
          }
        })
      } catch (e) {
        logger.warn('audit', 'Error logging shopping list audit:', e as any)
      }

      setShowShoppingListModal(false)
      alert('✅ Lista de compras enviada a la impresora térmica de 58mm.')
    } catch (err: any) {
      console.error('Error imprimiendo lista de compras:', err)
      alert(`Error al imprimir lista: ${err?.message || err}`)
    }
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
      setProductCategory(product.category || categoriesList[0] || 'Quesadillas Maíz')
      setProductPrice(product.price.toString())
      setProductDescription(product.description || '')
      setProductImageUrl(product.imageUrl || '')
      setImageSizeKb(null)
      setRecipeItems((product as DemoProduct).recipeIngredients || [{ ingredientId: 'ing-26', quantityRequired: 1 }])
    } else {
      setEditingProduct(null)
      setProductName('')
      setProductCategory(categoriesList[0] || 'Quesadillas Maíz')
      setProductPrice('')
      setProductDescription('')
      setProductImageUrl('')
      setImageSizeKb(null)
      setRecipeItems([{ ingredientId: 'ing-26', quantityRequired: 1 }])
    }
    setShowProductModal(true)
  }

  const handleAddRecipeIngredient = () => {
    setRecipeItems(prev => [...prev, { ingredientId: ingredientsList[0]?.id || 'ing-26', quantityRequired: 1 }])
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

    setLoading(true)
    try {
      if (editingProduct) {
        await supabaseService.updateProduct(editingProduct.id, {
          name: productName.trim(),
          category: productCategory,
          price: priceNum,
          description: productDescription.trim(),
          imageUrl: productImageUrl,
          imagePath: productImageUrl,
          active: true,
          hasInventory: true,
          currentStock: editingProduct.currentStock || 100,
          minimumStock: editingProduct.minimumStock || 10,
        })

        // Audit Log
        try {
          await supabaseService.logAudit({
            organization_id: supabaseService.getCurrentOrgId(),
            user_id: currentUser?.id,
            action: 'PRODUCT_UPDATED',
            table_name: 'products',
            record_id: editingProduct.id,
            changes: {
              name: productName.trim(),
              category: productCategory,
              price: priceNum,
              updatedBy: currentUser?.username || currentUser?.name,
              role: currentUser?.role,
              timestamp: new Date().toISOString(),
            }
          })
        } catch (e) {
          logger.warn('audit', 'Error registrando audit log de producto:', e as any)
        }
      } else {
        const created = await supabaseService.createProduct({
          name: productName.trim(),
          category: productCategory,
          price: priceNum,
          description: productDescription.trim(),
          imageUrl: productImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
          imagePath: productImageUrl || '',
          active: true,
          hasInventory: true,
          currentStock: 100,
          minimumStock: 10,
        })

        // Audit Log
        try {
          await supabaseService.logAudit({
            organization_id: supabaseService.getCurrentOrgId(),
            user_id: currentUser?.id,
            action: 'PRODUCT_CREATED',
            table_name: 'products',
            record_id: created?.id || `prod-${Date.now()}`,
            changes: {
              name: productName.trim(),
              category: productCategory,
              price: priceNum,
              createdBy: currentUser?.username || currentUser?.name,
              role: currentUser?.role,
              timestamp: new Date().toISOString(),
            }
          })
        } catch (e) {
          logger.warn('audit', 'Error registrando audit log de producto:', e as any)
        }
      }

      await loadProducts()
      setShowProductModal(false)
      alert(`✅ Platillo "${productName}" guardado y persistido exitosamente en la base de datos.`)
    } catch (err: any) {
      console.error('Error persistiendo producto en Supabase:', err)
      alert(`❌ Error al guardar en base de datos: ${err?.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Estás seguro de que deseas remover el platillo "${product.name}" del inventario y menú?`)) {
      return
    }
    setLoading(true)
    try {
      await supabaseService.deleteProduct(product.id)

      // Audit Log
      try {
        await supabaseService.logAudit({
          organization_id: supabaseService.getCurrentOrgId(),
          user_id: currentUser?.id,
          action: 'PRODUCT_DELETED',
          table_name: 'products',
          record_id: product.id,
          changes: {
            name: product.name,
            deletedBy: currentUser?.username || currentUser?.name,
            role: currentUser?.role,
            timestamp: new Date().toISOString(),
          }
        })
      } catch (e) {
        logger.warn('audit', 'Error registrando audit log de eliminacion:', e as any)
      }

      await loadProducts()
      alert(`✅ Platillo "${product.name}" removido exitosamente.`)
    } catch (err: any) {
      console.error('Error eliminando producto:', err)
      alert(`❌ Error al remover platillo: ${err?.message || err}`)
    } finally {
      setLoading(false)
    }
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
                onClick={handleOpenShoppingListModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black flex items-center gap-2 shadow-lg transition-all text-xs active:scale-95"
                title="Generar lista de compras y resurtido para ticket 58mm"
              >
                <ShoppingCart size={16} />
                <span>🛒 Lista de Compras 58mm</span>
              </button>

              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold flex items-center gap-1.5 border border-teal-500/30 text-xs transition-all shadow-md active:scale-95"
              >
                <Boxes size={15} />
                <span>Gestionar Categorías</span>
              </button>

              <button
                onClick={() => handleOpenProductModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black flex items-center gap-2 shadow-lg transition-all text-xs active:scale-95"
              >
                <Plus size={16} />
                <span>+ Crear Nuevo Platillo</span>
              </button>
            </>
          )}
        </div>
      </div>

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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenProductModal(product)}
                      className="py-2 px-3 bg-slate-900 text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Edit2 size={13} className="text-amber-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(product)}
                      className="py-2 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash2 size={13} className="text-rose-400" />
                      <span>Remover</span>
                    </button>
                  </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ChefHat size={16} />
                    <span>Receta & Insumos Requeridos por Porción (Obligatorio)</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewIngredientModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-teal-950 border border-teal-800 text-teal-300 font-bold text-[11px] flex items-center gap-1 hover:bg-teal-900"
                    >
                      <Plus size={13} />
                      <span>+ Crear Insumo Nuevo</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleAddRecipeIngredient}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-900"
                    >
                      <Plus size={13} />
                      <span>+ Asignar a Receta</span>
                    </button>
                  </div>
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
                          type="button"
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
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5"
              >
                {loading && <RefreshCw size={14} className="animate-spin" />}
                <span>{loading ? 'Guardando en BD...' : 'Guardar Platillo & Receta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN DE CATEGORÍAS */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-black">
                <Boxes size={20} />
                <span className="text-lg">Gestionar Categorías del Menú</span>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Agregar Categoría */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Nueva Categoría:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. Tacos & Costras"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-teal-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Lista de Categorías Existentes */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs font-bold text-slate-400 uppercase">Categorías Actuales ({categoriesList.length}):</p>
              <div className="space-y-2">
                {categoriesList.map((cat) => (
                  <div key={cat} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                    {editingCatName === cat ? (
                      <div className="flex-1 flex items-center gap-2 mr-2">
                        <input
                          type="text"
                          value={editCatInput}
                          onChange={(e) => setEditCatInput(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-slate-900 border border-teal-500 rounded-lg text-white font-bold text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCategory(cat)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px]"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingCatName(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-200">{cat}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCatName(cat)
                              setEditCatInput(cat)
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-amber-400"
                            title="Editar nombre"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400"
                            title="Eliminar categoría"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-black text-xs shadow-md"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR INSUMO RÁPIDO */}
      {showNewIngredientModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-black">
                <ChefHat size={20} />
                <span className="text-base">Crear Insumo / Materia Prima</span>
              </div>
              <button onClick={() => setShowNewIngredientModal(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nombre del Insumo *</label>
                <input
                  type="text"
                  placeholder="Ej. Cecina Enchilada, Salsa Verde, Crema"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={newIngCategory}
                    onChange={(e) => setNewIngCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  >
                    <option value="Proteínas">Proteínas</option>
                    <option value="Bases & Masas">Bases & Masas</option>
                    <option value="Verduras & Frescos">Verduras & Frescos</option>
                    <option value="Lácteos & Quesos">Lácteos & Quesos</option>
                    <option value="Abarrotes & Salsas">Abarrotes & Salsas</option>
                    <option value="Desechables & Empaque">Desechables & Empaque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Unidad de Medida</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="l">Litros (L)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="units">Piezas / Unidades</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Costo Unit. ($)</label>
                  <input
                    type="number"
                    placeholder="90.00"
                    value={newIngCost}
                    onChange={(e) => setNewIngCost(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Punto Reorden</label>
                  <input
                    type="number"
                    value={newIngReorder}
                    onChange={(e) => setNewIngReorder(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewIngredientModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateIngredient}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-md"
              >
                Guardar Insumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE COMPRAS PARA IMPRESORA TÉRMICA 58mm */}
      {showShoppingListModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400 font-black">
                <ShoppingCart size={22} />
                <div>
                  <h3 className="text-lg">Generar Lista de Compras & Resurtido</h3>
                  <p className="text-[11px] text-slate-400 font-normal">Formato optimizado para ticket térmico de 58 mm</p>
                </div>
              </div>
              <button onClick={() => setShowShoppingListModal(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Selector Insumos Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Insumos del Inventario (Sugeridos por Stock Bajo):</span>
                <span className="text-teal-400">{shoppingItems.filter(i => i.selected).length} seleccionados</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {shoppingItems.map((item, idx) => (
                  <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    item.selected ? 'bg-slate-950 border-amber-500/40 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}>
                    <label className="flex items-center gap-2 cursor-pointer flex-1 mr-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setShoppingItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: checked } : it))
                        }}
                        className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-200">{item.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          (Stock: {item.currentStock} {item.unitType} | Mín: {item.reorderLevel})
                        </span>
                      </div>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-400">Pedir:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={item.neededQuantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setShoppingItems(prev => prev.map((it, i) => i === idx ? { ...it, neededQuantity: val, selected: val > 0 } : it))
                        }}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right text-amber-300 font-bold text-xs focus:outline-none"
                      />
                      <span className="text-[11px] font-bold text-slate-400 w-10">{item.unitType}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Agregar Artículo Extra a la lista */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-teal-400 block">+ Agregar Artículo Extra o Suministro:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Servilletas, Desengrasante, Aceite 20L"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-teal-500"
                  />
                  <input
                    type="number"
                    placeholder="Cant"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-center text-xs font-bold"
                  />
                  <select
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  >
                    <option value="kg">kg</option>
                    <option value="pzas">pzas</option>
                    <option value="L">L</option>
                    <option value="paq">paq</option>
                    <option value="cajas">cajas</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomShoppingItem}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowShoppingListModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrintShoppingList}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center gap-2 active:scale-95"
              >
                <Printer size={16} />
                <span>Imprimir Lista en Ticket 58mm</span>
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