import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types/index'
import {
  Plus,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  ImagePlus,
  Archive,
} from 'lucide-react'

export default function InventoryManagement() {
  const { products, setProducts, currentUser } = useAppStore()
  const { canManageInventory, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'low-stock'>('all')

  useEffect(() => {
    void loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const loadedProducts = await supabaseService.getAllProducts()
      setProducts(loadedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (product: Product) => {
    if (isReadOnly) return

    try {
      await supabaseService.updateProduct(product.id, { active: !product.active })
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'unknown',
        action: 'PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: product.id,
        oldValue: { active: product.active },
        newValue: { active: !product.active },
      })
      await loadProducts()
    } catch (error) {
      console.error('Error toggling product:', error)
      alert('Error al actualizar producto')
    }
  }

  const handleAdjustStock = async (product: Product, adjustment: number) => {
    if (isReadOnly || !product.hasInventory) return

    const newStock = (product.currentStock || 0) + adjustment
    if (newStock < 0) {
      alert('El stock no puede ser negativo')
      return
    }

    try {
      await supabaseService.updateProduct(product.id, { currentStock: newStock })
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'unknown',
        action: 'INVENTORY_CHANGE',
        entityType: 'PRODUCT',
        entityId: product.id,
        oldValue: { stock: product.currentStock },
        newValue: { stock: newStock, adjustment },
      })
      await loadProducts()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('Error al ajustar inventario')
    }
  }

  const filteredProducts = products.filter(p => {
    if (filter === 'active') return p.active
    if (filter === 'low-stock') {
      return p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)
    }
    return true
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.active).length,
    withInventory: products.filter(p => p.hasInventory).length,
    lowStock: products.filter(p => p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)).length,
  }

  const categoryColors: Record<string, string> = {
    Comida: 'from-amber-500 to-orange-600',
    Bebidas: 'from-cyan-500 to-blue-600',
    Postres: 'from-fuchsia-500 to-pink-600',
    Otros: 'from-slate-500 to-zinc-700',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Productos" value={stats.total} icon={Package} color="from-slate-800 to-cyan-700" />
        <StatCard title="Activos" value={stats.active} icon={CheckCircle} color="from-emerald-600 to-lime-600" />
        <StatCard title="Con Inventario" value={stats.withInventory} icon={TrendingUp} color="from-sky-600 to-indigo-600" />
        <StatCard title="Stock Bajo" value={stats.lowStock} icon={AlertTriangle} color="from-rose-600 to-orange-600" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Gestion de Inventario</h2>
          <p className="text-slate-600 mt-1">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {canManageInventory && !isReadOnly && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nuevo Producto
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Eye className="text-blue-600" size={24} />
          <div>
            <p className="font-bold text-blue-900">Modo Solo Lectura</p>
            <p className="text-sm text-blue-700">Puedes revisar inventario, pero no modificarlo.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-r from-slate-800 to-cyan-700 text-white shadow-lg'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'active'
              ? 'bg-gradient-to-r from-emerald-600 to-lime-600 text-white shadow-lg'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setFilter('low-stock')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'low-stock'
              ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-lg'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Stock Bajo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-600">Cargando productos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProducts.map(product => {
            const isLowStock = product.hasInventory && (product.currentStock || 0) <= (product.minimumStock || 0)

            return (
              <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all">
                <div className="relative h-44 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${categoryColors[product.category] || categoryColors.Otros} flex items-center justify-center`}>
                      <span className="text-5xl font-black text-white/90">{product.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute left-4 right-4 bottom-3 text-white flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/70">{product.category}</p>
                      <h3 className="font-black text-lg leading-tight">{product.name}</h3>
                    </div>
                    <p className="text-2xl font-black">${product.price}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Estado</span>
                    <span className={`badge ${product.active ? 'badge-success' : 'bg-slate-200 text-slate-700'}`}>
                      {product.active ? 'Activo' : 'Archivado'}
                    </span>
                  </div>

                  {product.hasInventory ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Stock actual</span>
                        <span className={`font-black text-lg ${isLowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {product.currentStock || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Stock minimo</span>
                        <span className="font-semibold text-slate-900">{product.minimumStock || 0}</span>
                      </div>

                      {isLowStock && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-2">
                          <AlertTriangle size={16} className="text-rose-600" />
                          <span className="text-xs font-bold text-rose-700">Stock bajo</span>
                        </div>
                      )}

                      {canManageInventory && !isReadOnly && (
                        <div className="flex gap-2 pt-3 border-t border-slate-200">
                          <button
                            onClick={() => handleAdjustStock(product, -1)}
                            className="flex-1 p-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg font-bold transition-all"
                          >
                            <TrendingDown size={20} className="mx-auto" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(product, 1)}
                            className="flex-1 p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-bold transition-all"
                          >
                            <TrendingUp size={20} className="mx-auto" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-slate-500 italic text-center py-2">Sin control de inventario</div>
                  )}

                  {canManageInventory && !isReadOnly && (
                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                          product.active
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Archive size={16} />
                          {product.active ? 'Archivar' : 'Reactivar'}
                        </span>
                      </button>

                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreateModal && <ProductModal onClose={() => setShowCreateModal(false)} onSuccess={loadProducts} />}

      {editingProduct && (
        <ProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSuccess={loadProducts} />
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: any
  color: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-md p-4 shadow-md">
      <div className={`p-3 bg-gradient-to-br ${color} rounded-xl text-white w-fit mb-3`}>
        <Icon size={22} />
      </div>
      <p className="text-xs md:text-sm text-slate-600 font-semibold uppercase tracking-wide">{title}</p>
      <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  )
}

function ProductModal({
  product,
  onClose,
  onSuccess,
}: {
  product?: Product
  onClose: () => void
  onSuccess: () => void
}) {
  const { currentUser } = useAppStore()
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || 0,
    category: product?.category || 'Comida',
    imagePath: product?.imagePath || '',
    hasInventory: product?.hasInventory || false,
    currentStock: product?.currentStock || 0,
    minimumStock: product?.minimumStock || 10,
    active: product?.active ?? true,
  })
  const [imagePreview, setImagePreview] = useState<string | undefined>(product?.imageUrl)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleImageChange = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Solo puedes subir imagenes')
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      let uploadedImagePath = formData.imagePath

      if (selectedImage) {
        const optimizedImage = await optimizeImage(selectedImage)
        uploadedImagePath = await supabaseService.uploadProductImage(optimizedImage, formData.name)
      }

      const payload = {
        ...formData,
        imagePath: uploadedImagePath || undefined,
      }

      if (product) {
        await supabaseService.updateProduct(product.id, payload)

        if (product.imagePath && uploadedImagePath && product.imagePath !== uploadedImagePath) {
          void supabaseService.removeProductImage(product.imagePath)
        }

        await supabaseService.createAuditLog({
          userId: currentUser?.id || 'unknown',
          action: 'PRODUCT_UPDATED',
          entityType: 'PRODUCT',
          entityId: product.id,
          newValue: payload,
        })
      } else {
        const newId = await supabaseService.createProduct({
          ...payload,
          createdAt: new Date(),
        })

        await supabaseService.createAuditLog({
          userId: currentUser?.id || 'unknown',
          action: 'PRODUCT_CREATED',
          entityType: 'PRODUCT',
          entityId: newId,
          newValue: payload,
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error al guardar producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-black mb-4">{product ? 'Editar Producto' : 'Crear Producto'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Precio</label>
            <input
              type="number"
              value={formData.price || ''}
              onChange={e => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              className="input-field"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="input-field"
            >
              <option value="Comida">Comida</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Postres">Postres</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Imagen del producto</label>
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 bg-slate-50">
              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700">
                <ImagePlus size={18} />
                Seleccionar imagen
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e.target.files?.[0])} />
              </label>
              <p className="text-xs text-slate-500 mt-2 text-center">Se optimiza automaticamente para reducir consumo en Supabase.</p>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-3 rounded-lg w-full h-40 object-cover border border-slate-200" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hasInventory"
              checked={formData.hasInventory}
              onChange={e => setFormData({ ...formData, hasInventory: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="hasInventory" className="text-sm font-bold text-slate-700">
              Controlar inventario
            </label>
          </div>

          {formData.hasInventory && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Stock actual</label>
                <input
                  type="number"
                  value={formData.currentStock || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      currentStock: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="input-field"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Stock minimo</label>
                <input
                  type="number"
                  value={formData.minimumStock || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      minimumStock: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="input-field"
                  min="0"
                  required
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="active" className="text-sm font-bold text-slate-700">
              Producto activo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="flex-1 btn-success" disabled={loading}>
              {loading ? 'Guardando...' : product ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

async function optimizeImage(file: File): Promise<File> {
  const imageBitmap = await createImageBitmap(file)
  const maxWidth = 1280
  const maxHeight = 1280
  const scale = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height, 1)
  const width = Math.round(imageBitmap.width * scale)
  const height = Math.round(imageBitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return file

  context.drawImage(imageBitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/webp', 0.8)
  })

  if (!blob) return file
  return new File([blob], `${file.name.split('.')[0] || 'product'}.webp`, { type: 'image/webp' })
}