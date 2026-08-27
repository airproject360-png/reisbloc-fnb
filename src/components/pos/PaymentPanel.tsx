import { useState } from 'react'
import logger from '@/utils/logger'
import { X, DollarSign, Loader2, CheckCircle, CreditCard } from 'lucide-react'
import mercadopagoService from '@/services/mercadopagoService'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'mercadopago' | 'transfer'
  currency?: 'MXN' | 'USD'
  tip: number
  tipCurrency?: 'MXN' | 'USD'
  total: number
  splitRequested?: boolean
}

interface PaymentPanelProps {
  orderTotal: number
  orderId?: string
  orderIds?: string[]
  tableNumber: number
  onPaymentComplete: (result: PaymentResult) => void | Promise<void>
  onCancel: () => void
}

export default function PaymentPanel({
  orderTotal,
  orderId,
  orderIds,
  tableNumber,
  onPaymentComplete,
  onCancel,
}: PaymentPanelProps) {
  const ids = orderIds || (orderId ? [orderId] : [])

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mercadopago' | 'transfer'>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sin propinas registradas en el sistema
  const total = orderTotal

  const completePayment = async (result: PaymentResult) => {
    setSuccess(true)
    await new Promise(resolve => setTimeout(resolve, 450))

    try {
      await onPaymentComplete(result)
    } catch (callbackError: any) {
      const callbackMessage = callbackError?.message || 'No se pudo completar el pago'
      logger.error('payment', 'Error al finalizar pago en callback', callbackError as any)
      setSuccess(false)
      setError(callbackMessage)
    }
  }

  const handlePayment = async () => {
    try {
      setLoading(true)
      setError(null)

      if (paymentMethod === 'cash') {
        const transactionId = `cash-${Date.now()}`
        logger.info('payment', 'Cash payment', { amount: total })

        await new Promise(resolve => setTimeout(resolve, 500))
        await completePayment({
          transactionId,
          paymentMethod,
          currency: 'MXN',
          tip: 0,
          total,
        })
      } else if (paymentMethod === 'transfer' || paymentMethod === 'mercadopago') {
        try {
          const payment = await mercadopagoService.processDirectPayment({
            amount: total,
            description: `Cuenta ${tableNumber} - ${ids.length} orden${ids.length > 1 ? 'es' : ''}`,
            orderId: ids[0],
            email: 'customer@restaurant.com',
            paymentMethodId: paymentMethod
          })

          logger.info('payment', 'Pago registrado manualmente', payment.id)

          await completePayment({
            transactionId: payment.id,
            paymentMethod: paymentMethod,
            currency: 'MXN',
            tip: 0,
            total,
          })
        } catch (err: any) {
          logger.error('payment', 'Error en registro de pago', err as any)
          throw err
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar pago'
      logger.error('payment', 'Payment error', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-slate-950/80 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onCancel}
            disabled={loading || success}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="text-xs uppercase font-extrabold tracking-wider text-amber-400 mb-1">
            Cobro de Cuenta #{tableNumber}
          </div>
          <h2 className="text-2xl font-black">Resumen de Pago</h2>
          {ids.length > 1 && (
            <p className="text-xs text-slate-300 mt-1">{ids.length} órdenes consolidadas</p>
          )}
        </div>

        <div className="p-6">
          {/* Order Total Display */}
          <div className="bg-slate-900 p-5 rounded-2xl mb-6 text-white shadow-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-300">Total a Cobrar:</span>
              <span className="text-3xl font-black text-amber-400">
                ${total.toFixed(2)} <span className="text-xs font-normal text-slate-400">MXN</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 font-medium leading-relaxed border-t border-slate-800 pt-2">
              💡 Las propinas se dejan en efectivo en mesa y no se ingresan al sistema.
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-extrabold text-slate-900 mb-3">Método de Pago</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                disabled={loading || success}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all transform active:scale-95 ${
                  paymentMethod === 'cash'
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-teal-900/30 border border-teal-500 scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <DollarSign size={26} strokeWidth={2.5} />
                <span className="text-sm font-extrabold">Efectivo</span>
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                disabled={loading || success}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all transform active:scale-95 ${
                  paymentMethod === 'transfer'
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-900/30 border border-purple-500 scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <CreditCard size={26} strokeWidth={2.5} />
                <span className="text-sm font-extrabold">Transferencia SPEI</span>
              </button>
            </div>

            {paymentMethod === 'transfer' && (
              <div className="mt-3 p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs leading-relaxed font-medium">
                <strong>📲 SPEI / Transferencia Directa:</strong> Verificar la recepción del comprobante bancario antes de confirmar.
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-xs text-red-700 font-bold">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              disabled={loading || success}
              className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm active:scale-95"
            >
              Cancelar
            </button>

            <button
              onClick={handlePayment}
              disabled={loading || success}
              className="flex-1 px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-teal-900/30 transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Procesando...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={18} />
                  ¡Pago Registrado!
                </>
              ) : (
                'Confirmar Pago'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
