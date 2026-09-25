import React, { useState, useEffect } from 'react'
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  ChevronsDown, 
  ChevronsUp, 
  RotateCcw, 
  Check, 
  Sparkles, 
  SlidersHorizontal,
  Coffee,
  GripVertical
} from 'lucide-react'

interface CategoryOrderModalProps {
  isOpen: boolean
  onClose: () => void
  currentCategories: string[]
  onSave: (newOrder: string[]) => void
}

export default function CategoryOrderModal({
  isOpen,
  onClose,
  currentCategories,
  onSave,
}: CategoryOrderModalProps) {
  // Excluimos 'TODOS' ya que siempre se mantiene en la primera posición fija
  const filterList = (cats: string[]) =>
    cats
      .filter(c => c.toUpperCase().trim() !== 'TODOS')
      .map(c => c.toUpperCase().trim())

  const [order, setOrder] = useState<string[]>(() => filterList(currentCategories))

  useEffect(() => {
    if (isOpen) {
      setOrder(filterList(currentCategories))
    }
  }, [isOpen, currentCategories])

  if (!isOpen) return null

  // Mover una posición arriba
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...order]
    const temp = newOrder[index - 1]
    newOrder[index - 1] = newOrder[index]
    newOrder[index] = temp
    setOrder(newOrder)
  }

  // Mover una posición abajo
  const handleMoveDown = (index: number) => {
    if (index === order.length - 1) return
    const newOrder = [...order]
    const temp = newOrder[index + 1]
    newOrder[index + 1] = newOrder[index]
    newOrder[index] = temp
    setOrder(newOrder)
  }

  // Enviar al principio
  const handleMoveToTop = (index: number) => {
    if (index === 0) return
    const newOrder = [...order]
    const [item] = newOrder.splice(index, 1)
    newOrder.unshift(item)
    setOrder(newOrder)
  }

  // Enviar al final
  const handleMoveToBottom = (index: number) => {
    if (index === order.length - 1) return
    const newOrder = [...order]
    const [item] = newOrder.splice(index, 1)
    newOrder.push(item)
    setOrder(newOrder)
  }

  // Atajo rápido: Enviar "Bebidas" al final
  const handleSendBebidasToEnd = () => {
    const bebidas = order.filter(c => 
      c.toLowerCase().includes('bebida') || 
      c.toLowerCase().includes('refresco') || 
      c.toLowerCase().includes('cerveza') ||
      c.toLowerCase().includes('trago') ||
      c.toLowerCase().includes('agua')
    )
    const otros = order.filter(c => !bebidas.includes(c))
    setOrder([...otros, ...bebidas])
  }

  // Restaurar a configuración estándar de Localito en UPPERCASE
  const handleResetDefault = () => {
    const defaultCats = ['QUESADILLAS MAÍZ', 'QUESADILLAS HARINA', 'PLATOS', 'ESPECIALIDADES', 'EXTRAS', 'BEBIDAS']
    // Mantener cualquier otra categoría al final antes de Bebidas
    const existingOther = order.filter(c => !defaultCats.includes(c))
    const beverages = defaultCats.filter(c => c.includes('BEBIDA') || c.includes('REFRESCO'))
    const standardWithoutBev = defaultCats.filter(c => !c.includes('BEBIDA') && !c.includes('REFRESCO'))

    setOrder([...standardWithoutBev, ...existingOther, ...beverages])
  }

  const handleSave = () => {
    onSave(order.map(c => c.toUpperCase().trim()))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Organizar Categorías del Menú
              </h3>
              <p className="text-xs text-slate-400">
                Personaliza el orden de las pestañas en el POS como más cómodo sea para tu flujo de trabajo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Acciones Rápidas */}
        <div className="px-5 py-3 bg-slate-950/20 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendBebidasToEnd}
              className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Coffee size={14} className="text-teal-400" />
              <span>Bebidas al final 👉</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw size={13} />
              <span>Restaurar</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {order.length} categorías configuradas
          </span>
        </div>

        {/* Lista de Categorías con Controles de Desplazamiento */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 no-scrollbar">
          {/* Tarjeta fija para 'Todos' */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/40 text-slate-500 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[11px] font-black flex items-center justify-center">
                ★
              </span>
              <span className="font-bold text-slate-400">Todos (Fijo al inicio)</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-900 px-2 py-0.5 rounded">
              Predeterminado
            </span>
          </div>

          {order.map((category, index) => {
            const isBebida = category.toLowerCase().includes('bebida') || category.toLowerCase().includes('refresco')
            const isFirst = index === 0
            const isLast = index === order.length - 1

            return (
              <div
                key={category}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isBebida
                    ? 'bg-teal-950/20 border-teal-500/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Posición & Nombre */}
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 text-xs font-black flex items-center justify-center border border-slate-700">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-200">
                      {category}
                    </span>
                    {isBebida && (
                      <span className="text-[10px] font-extrabold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-800">
                        Bebida
                      </span>
                    )}
                  </div>
                </div>

                {/* Botones de Mover */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveToTop(index)}
                    disabled={isFirst}
                    title="Mover al principio"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-800"
                  >
                    <ChevronsUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={isFirst}
                    title="Subir una posición"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-800"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLast}
                    title="Bajar una posición"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-800"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveToBottom(index)}
                    disabled={isLast}
                    title="Mover al final (ideal para bebidas)"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-800"
                  >
                    <ChevronsDown size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Previsualización en Vivo de la Barra del POS */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" />
            <span>Vista previa de la barra en POS:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex-shrink-0">
              Todos
            </span>
            {order.map((cat, i) => (
              <span
                key={cat}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 flex-shrink-0"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Check size={16} />
            <span>Guardar Nuevo Orden</span>
          </button>
        </div>
      </div>
    </div>
  )
}
