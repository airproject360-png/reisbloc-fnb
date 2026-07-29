import React from 'react'
import { X, ChefHat, Package, FileText, CheckCircle2, DollarSign } from 'lucide-react'
import { DemoProduct } from '@/services/demoSeedService'

interface DarkKitchenRecipeModalProps {
  product: DemoProduct | null
  onClose: () => void
}

export default function DarkKitchenRecipeModal({ product, onClose }: DarkKitchenRecipeModalProps) {
  if (!product) return null

  const recipeIngredients = product.recipeIngredients || []

  // Calcular costo aproximado de receta
  const estimatedCost = recipeIngredients.reduce((total, item) => {
    // Estimación rápida para demo escandallo
    if (item.ingredientId.includes('ing-26') || item.ingredientId.includes('ing-27')) return total + 3.8
    if (item.ingredientId.includes('ing-36') || item.ingredientId.includes('ing-37')) return total + 2.5
    if (item.quantityRequired < 1) return total + item.quantityRequired * 80
    return total + item.quantityRequired * 15
  }, 0)

  const marginPercentage = Math.round(((product.price - estimatedCost) / product.price) * 100)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative text-white overflow-hidden space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
              <ChefHat size={26} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 px-2 py-0.5 rounded-md bg-teal-950 border border-teal-800">
                Ficha Técnica & Escandallo Dark Kitchen
              </span>
              <h2 className="text-xl font-black text-white mt-1">{product.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Image & Key Specs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <img
            src={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop'}
            alt={product.name}
            className="w-28 h-28 object-cover rounded-xl border border-slate-800 shrink-0"
          />
          <div className="space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed">{product.description}</p>
            <div className="flex flex-wrap gap-4 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">PRECIO VENTA</span>
                <span className="text-base font-black text-emerald-400">${product.price} MXN</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">COSTO INSUMOS (EST.)</span>
                <span className="text-base font-black text-slate-200">${estimatedCost.toFixed(1)} MXN</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MARGEN BRUTO</span>
                <span className="text-base font-black text-teal-300">{marginPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Ingredients & To-Go Packaging Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-teal-400" />
            Desglose de Receta & Empaques Desechables To-Go
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {recipeIngredients.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">{item.ingredientName || item.ingredientId}</span>
                    {item.notes && <span className="text-[10px] text-slate-400">{item.notes}</span>}
                  </div>
                </div>

                <div className="font-black text-teal-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                  {item.quantityRequired} {item.unitType || 'kg/litros/piezas'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/20 text-[11px] text-teal-200/90 leading-relaxed">
          💡 <strong>Dark Kitchen Automation:</strong> Al vender esta comanda desde el POS o Menú Digital, el sistema resta automáticamente cada insumo (totopos, salsas, desechables) descontando de tu inventario en tiempo real.
        </div>
      </div>
    </div>
  )
}
