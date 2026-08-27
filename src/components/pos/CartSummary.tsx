import { useMemo } from 'react'
import { OrderItem, Product } from '@/types'
import { ShoppingCart, Send, Trash2, AlertTriangle } from 'lucide-react'

interface CartSummaryProps {
  tableNumber: number
  items: OrderItem[]
  readOnly?: boolean
  disableSend?: boolean
  onSend: () => void
  onClear: () => void
  sending: boolean
  products?: Product[]
  stockError?: string
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function CartSummary({
  tableNumber,
  items,
  readOnly = false,
  disableSend = false,
  onSend,
  onClear,
  sending,
  products = [],
  stockError,
}: CartSummaryProps) {
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.16
    const total = subtotal + tax
    return { subtotal, tax, total }
  }, [items])

  const hasStockIssue = useMemo(() => {
    return items.some(item => {
      const product = products.find(p => p.id === item.productId)
      return product?.hasInventory && (product.currentStock ?? 0) < item.quantity
    })
  }, [items, products])

  const isDisabled = disableSend || items.length === 0 || sending || hasStockIssue || readOnly

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 sticky top-6 border border-slate-200/80 select-none">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="text-amber-500" size={26} />
            Resumen Ticket
          </h2>
          <p className="text-xs font-bold text-teal-600 mt-0.5">Cuenta #{tableNumber}</p>
        </div>
        <button
          onClick={onClear}
          disabled={items.length === 0 || readOnly}
          className="flex items-center gap-1.5 text-xs font-extrabold text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300 transition-colors p-2 rounded-xl hover:bg-red-50"
        >
          <Trash2 size={16} />
          Limpiar
        </button>
      </div>

      {stockError && (
        <div className="mb-5 rounded-2xl bg-red-50 p-3.5 border border-red-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 shrink-0" size={18} />
            <p className="text-xs font-bold text-red-700">{stockError}</p>
          </div>
        </div>
      )}

      {hasStockIssue && !stockError && (
        <div className="mb-5 rounded-2xl bg-amber-50 p-3.5 border border-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <p className="text-xs font-bold text-amber-700">Stock insuficiente en inventario</p>
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="bg-slate-900 rounded-2xl p-4 space-y-2 mb-5 text-white shadow-md border border-slate-800">
        <div className="flex justify-between text-xs text-slate-300">
          <span className="font-semibold">Subtotal</span>
          <span className="font-extrabold">{currency.format(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-300">
          <span className="font-semibold">IVA (16%)</span>
          <span className="font-extrabold">{currency.format(totals.tax)}</span>
        </div>
        <div className="h-px bg-slate-800 my-1" />
        <div className="flex justify-between text-lg pt-1">
          <span className="font-black text-white">Total</span>
          <span className="font-black text-amber-400">
            {currency.format(totals.total)}
          </span>
        </div>
      </div>

      {/* Botón Principal: Enviar a Cocina (Generar Comanda Impresa) */}
      <button
        onClick={onSend}
        disabled={isDisabled}
        className={`w-full rounded-2xl py-4 px-6 text-sm font-black text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
          isDisabled
            ? 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none border border-slate-300'
            : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-900/30 hover:scale-[1.02]'
        }`}
      >
        {sending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Enviando a Cocina...
          </>
        ) : hasStockIssue ? (
          <>
            <AlertTriangle size={18} />
            Stock Insuficiente
          </>
        ) : (
          <>
            <Send size={18} />
            Enviar a Cocina (Imprimir Comanda)
          </>
        )}
      </button>
    </div>
  )
}

export default CartSummary
