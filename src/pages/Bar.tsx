import { useEffect, useState, useRef } from 'react'
import logger from '@/utils/logger'
import { Wine, Clock, AlertCircle, Bell } from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { Order } from '@/types/index'
import { sendNotificationToUsers } from '@/services/sendNotificationHelper'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/contexts/ToastContext'

type BarFilter = 'all' | 'sent' | 'ready' | 'served'

export default function Bar() {
  const { order: showOrderToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<BarFilter>('sent')
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const prevOrdersRef = useRef<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Audio de notificación (beep simple)
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiDYIF2W79+qbUg8OTqvn8raKOwcVa7r3GMUBAAAAAAABAAAAA')
    
    logger.info('bar', 'Component mounted')
    const unsubscribe = supabaseService.subscribeToActiveOrders(
      (data) => {
        const normalizedOrders = data.map(order => ({
          ...order,
          createdAt: order.createdAt instanceof Date ? order.createdAt : new Date((order as any).createdAt?.seconds * 1000 || Date.now()),
        }))
        
        // Detectar nuevas órdenes
        const currentOrderIds = normalizedOrders.map(o => o.id)
        const prevOrderIds = prevOrdersRef.current
        const newOrders = currentOrderIds.filter(id => !prevOrderIds.includes(id))
        
        if (newOrders.length > 0 && prevOrderIds.length > 0) {
          setNewOrdersCount(prev => prev + newOrders.length)
          // Mostrar toast de nuevas órdenes
          showOrderToast('🍹 Nueva Orden', `${newOrders.length} orden(es) de bebida(s) para preparar`, 5000)
          audioRef.current?.play().catch(e => logger.warn('bar', 'No se pudo reproducir audio', e as any))
        }
        
        prevOrdersRef.current = currentOrderIds
        setOrders(normalizedOrders)
        setLoading(false)
        setError(null)
      },
      (message) => {
        setError(message)
        setLoading(false)
      }
    )

    return () => {
      unsubscribe?.()
    }
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      logger.info('bar', `Changing order ${orderId} to ${newStatus}`)
      const order = orders.find(o => o.id === orderId)
      await supabaseService.updateOrderStatus(orderId, newStatus)
      logger.info('bar', `✅ Order ${orderId} updated to ${newStatus}`)
      
      // Notificar cuando la orden está lista
      if (newStatus === 'ready' && order && order.tableNumber) {
        try {
          showOrderToast('✓ Bebidas Listas', `Mesa ${order.tableNumber} - ${order.items?.length || 0} bebida(s)`, 5000)
          await sendNotificationToUsers({
            roles: ['mesero', 'capitan'],
            title: `Bebidas listas - Mesa ${order.tableNumber}`,
            body: `${order.items?.length || 0} bebida(s) listo(s) para servir`,
            type: 'order',
            priority: 'high',
            data: {
              orderId,
              tableNumber: String(order.tableNumber)
            }
          })
        } catch (notifError) {
          logger.warn('bar', 'No se pudo enviar notificación', notifError as any)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('bar', 'Error updating status', msg)
      setError(msg)
    }
  }

  const clearNotifications = () => {
    setNewOrdersCount(0)
  }

  const filteredOrders = orders
    .filter(o => {
      // Solo mostrar órdenes de bebidas (que tienen nota '🍹 Bebidas')
      if (!o.notes?.includes('🍹') && !o.notes?.includes('Bebidas')) return false
      if (filter === 'all') return true
      return o.status === filter
    })

  const counts = {
    sent: orders.filter(o => o.status === 'sent').length,
    ready: orders.filter(o => o.status === 'ready').length,
    served: orders.filter(o => o.status === 'served').length,
    all: orders.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center">
          <Wine className="mx-auto mb-4 text-purple-300 animate-pulse" size={48} />
          <p className="text-purple-100 text-lg">Cargando órdenes del bar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative">
      {/* Background Doodle */}
      <div 
        className="fixed inset-0 z-0 opacity-30 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '300px',
          filter: 'grayscale(100%)'
        }}
      />
      <div className="relative z-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <Wine size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Bar</h1>
                <p className="text-purple-100 text-sm">Sistema en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {newOrdersCount > 0 && (
                <button
                  onClick={clearNotifications}
                  className="relative px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold flex items-center gap-2 animate-pulse"
                >
                  <Bell size={20} />
                  <span>{newOrdersCount} nueva{newOrdersCount > 1 ? 's' : ''}</span>
                </button>
              )}
              <div className="text-right">
                <p className="text-sm text-purple-100">Total órdenes</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="rounded-lg bg-red-900/50 border border-red-700 p-4 flex gap-3">
            <AlertCircle className="text-red-300 flex-shrink-0" size={20} />
            <p className="text-red-100">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'sent' as const, label: 'Pendientes', icon: '⏳', color: 'purple' },
            { key: 'ready' as const, label: 'Listas', icon: '✓', color: 'green' },
            { key: 'served' as const, label: 'Servidas', icon: '🥂', color: 'indigo' },
            { key: 'all' as const, label: 'Todas', icon: '📋', color: 'slate' },
          ].map(({ key, label, icon, color }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); clearNotifications(); }}
              className={`relative px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                filter === key
                  ? color === 'purple'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'
                    : color === 'green'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
                    : color === 'indigo'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/50'
                    : 'bg-slate-700 text-white shadow-lg'
                  : 'bg-purple-900/50 text-purple-100 hover:bg-purple-800/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl">{icon}</span>
                <span>{label}</span>
                <span className="text-sm font-bold bg-white/20 px-2 py-1 rounded-full">
                  {counts[key]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Wine className="mx-auto mb-4 text-purple-400" size={64} />
            <p className="text-purple-200 text-lg">No hay órdenes {filter !== 'all' && `en estado "${filter}"`}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const statusConfig = {
                sent: { label: 'En preparación', color: 'bg-purple-800 text-purple-200', border: 'border-purple-500' },
                ready: { label: 'Lista', color: 'bg-green-800 text-green-200', border: 'border-green-500' },
                served: { label: 'Servida', color: 'bg-indigo-800 text-indigo-200', border: 'border-indigo-500' },
              }[order.status] || { label: order.status, color: 'bg-gray-800 text-gray-300', border: 'border-gray-600' }

              const elapsed = order.createdAt ? Math.floor((Date.now() - order.createdAt.getTime()) / 60000) : 0

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 ${statusConfig.border} bg-purple-950/50 backdrop-blur-sm p-6 shadow-xl`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-3xl font-bold text-white">Mesa {order.tableNumber}</p>
                      <div className="flex items-center gap-2 mt-1 text-purple-300 text-sm">
                        <Clock size={14} />
                        <span>Hace {elapsed} min</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                      {statusConfig.label}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-4 border-t border-purple-700 pt-4">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{item.productName}</p>
                          <p className="text-xs text-purple-300">${item.unitPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-purple-600 rounded-full w-10 h-10 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{item.quantity}</span>
                        </div>
                      </div>
                    )) || <p className="text-purple-300">Sin items</p>}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {order.status === 'sent' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold py-3 transition-colors"
                      >
                        ✓ Marcar como Lista
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 transition-colors"
                      >
                        🥂 Marcar como Servida
                      </button>
                    )}
                    {order.status === 'served' && (
                      <div className="text-center py-2 text-purple-300 text-sm">
                        Orden completada
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
