import { useMemo } from 'react'
import printService from '@/services/printService'
import { OrderItem, Product } from '@/types'
import { ShoppingCart, Send, Trash2, AlertTriangle } from 'lucide-react'

interface CartSummaryProps {
  tableNumber: number
  items: OrderItem[]
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

export function CartSummary({ tableNumber, items, onSend, onClear, sending, products = [], stockError }: CartSummaryProps) {
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

  const isDisabled = items.length === 0 || sending || hasStockIssue

  const handlePrint = async () => {
    if (items.length === 0) return
    // Construir HTML simple para ticket de cuenta (58mm)
    const date = new Date().toLocaleString('es-MX')
    const lines = items
      .map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.quantity}x ${item.productName}</span>
          <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
      `)
      .join('')

    const html = `
      <div style="width:58mm;padding:8px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
        <div style="text-align:center;margin-bottom:8px;border-bottom:1px solid #000;">
          <div style="font-weight:bold;font-size:12px;">CEVICHERIA MEXA</div>
          <div style="font-size:9px;">Restaurante y Marisquería</div>
          <div style="font-size:9px;">Mesa ${tableNumber}</div>
        </div>
        <div style="margin-bottom:6px;font-size:9px;">
          <div>Fecha: ${date}</div>
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          ${lines}
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Subtotal:</span>
            <span>$${totals.subtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>IVA (16%):</span>
            <span>$${totals.tax.toFixed(2)}</span>
          </div>
          <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:12px;">
            <span>TOTAL:</span>
            <span>$${totals.total.toFixed(2)}</span>
          </div>
        </div>
        <div style="text-align:center;font-size:9px;margin-top:8px;">
          <div>Este no es comprobante fiscal.</div>
          <div style="margin-top:4px;font-size:8px;">Gracias por su preferencia</div>
        </div>
      </div>
    `

    try {
      await printService.printReceipt(html, { title: 'Cuenta', width: 58 })
    } catch (e) {
      // noop: errores ya se loguean en printService
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" size={28} />
            Resumen
          </h2>
          <p className="text-sm font-semibold text-indigo-600 mt-1">Mesa {tableNumber}</p>
        </div>
        <button
          onClick={onClear}
          disabled={items.length === 0}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-300 transition-colors p-2 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={18} />
          Limpiar
        </button>
      </div>

      {stockError && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 p-4 border-2 border-red-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            <p className="text-sm font-bold text-red-700">{stockError}</p>
          </div>
        </div>
      )}

      {hasStockIssue && !stockError && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-2 border-amber-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            <p className="text-sm font-bold text-amber-700">Stock insuficiente para algunos productos</p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-3 mb-6">
        <div className="flex justify-between text-gray-700">
          <span className="font-semibold">Subtotal</span>
          <span className="font-bold text-lg">{currency.format(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span className="font-semibold">IVA (16%)</span>
          <span className="font-bold text-lg">{currency.format(totals.tax)}</span>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className="flex justify-between text-xl pt-2">
          <span className="font-black text-gray-900">Total</span>
          <span className="font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {currency.format(totals.total)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handlePrint}
          disabled={items.length === 0}
          className={`w-full rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all transform flex items-center justify-center gap-3 ${
            items.length === 0
              ? 'cursor-not-allowed bg-gray-300 shadow-none'
              : 'bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black hover:scale-105 shadow-gray-500/50'
          }`}
        >
          Imprimir Cuenta
        </button>

        <button
          onClick={onSend}
          disabled={isDisabled}
          className={`w-full rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all transform flex items-center justify-center gap-3 ${
            isDisabled
              ? 'cursor-not-allowed bg-gray-300 shadow-none'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 shadow-blue-500/50'
          }`}
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Enviando...
            </>
          ) : hasStockIssue ? (
            <>
              <AlertTriangle size={20} />
              Stock insuficiente
            </>
          ) : (
            <>
              <Send size={20} />
              Enviar a cocina
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default CartSummary
