import { useState, useMemo } from 'react'
import { Sparkles, X, Bot, ChevronRight, TrendingUp, Lightbulb, ShieldAlert, PackageCheck, DollarSign, Send, MessageSquare } from 'lucide-react'
import { aiAssistantService } from '@/services/aiAssistantService'
import { APP_CONFIG } from '@/config/constants'
import { useAppStore } from '@/store/appStore'

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  currentCartItems?: Array<{ productName: string; category?: string }>
  closingData?: {
    expectedCash: number
    actualCash: number
    discrepancy: number
    totalSales: number
    ordersCount: number
    voidsCount: number
    discountsTotal: number
  }
}

export default function AIAssistantModal({ 
  isOpen, 
  onClose, 
  currentCartItems = [],
  closingData
}: AIAssistantModalProps) {
  const { products, draftOrders, currentTableNumber } = useAppStore()
  const [activeTab, setActiveTab] = useState<'all' | 'pos' | 'closing' | 'inventory'>('all')

  // Chat interactivo con la IA
  const [userQuery, setUserQuery] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([])

  // Obtener items del carrito actual de la mesa
  const activeCart = useMemo(() => {
    if (currentCartItems.length > 0) return currentCartItems
    const tableNum = currentTableNumber ?? 0
    const items = draftOrders[tableNum] || []
    return items.map((i: any) => ({ productName: i.productName, category: i.category || 'general' }))
  }, [currentCartItems, draftOrders, currentTableNumber])

  // Obtener insumos/productos reales con stock bajo
  const realLowStockItems = useMemo(() => {
    return (products || [])
      .filter(p => p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 10))
      .map(p => ({ name: p.name, current: p.currentStock || 0, min: p.minimumStock || 10 }))
  }, [products])

  if (!isOpen) return null

  // Generar sugerencias dinámicas con datos reales de LOCALITO
  const upsellSuggestions = aiAssistantService.generateUpsellSuggestions(activeCart)
  
  const closingAudit = closingData 
    ? aiAssistantService.generateClosingAuditSummary(closingData)
    : aiAssistantService.generateClosingAuditSummary({
        expectedCash: 0,
        actualCash: 0,
        discrepancy: 0,
        totalSales: 0,
        ordersCount: 0,
        voidsCount: 0,
        discountsTotal: 0
      })

  const inventoryInsights = aiAssistantService.generateInventoryAuditInsights(realLowStockItems)

  const allSuggestions = [
    ...upsellSuggestions, 
    ...closingAudit, 
    ...inventoryInsights
  ]

  const filteredSuggestions = activeTab === 'all' 
    ? allSuggestions 
    : allSuggestions.filter(s => s.category === activeTab || (activeTab === 'pos' && s.type === 'upsell'))

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userQuery.trim()) return

    const question = userQuery.trim()
    setUserQuery('')

    const aiReply = aiAssistantService.answerStaffQuery(question, {
      totalSales: closingData?.totalSales || 0,
      ordersCount: closingData?.ordersCount || 0,
      products: products || [],
      lowStockItems: realLowStockItems,
    })

    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: question },
      { sender: 'ai', text: aiReply }
    ])
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden text-slate-100 space-y-4">
        
        {/* Glow de fondo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                Asistente IA POS · LOCALITO
              </h2>
              <p className="text-xs text-slate-400">Inteligencia operativa en tiempo real con datos reales de la caja e inventario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs de Filtro */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Todas las Sugerencias', icon: Sparkles },
            { id: 'pos', label: 'Sugerencias Venta', icon: Lightbulb },
            { id: 'closing', label: 'Cierre & Caja', icon: DollarSign },
            { id: 'inventory', label: 'Inventario Real', icon: PackageCheck },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105 font-black'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* List of Suggestions */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Bot size={40} className="mx-auto mb-2 text-slate-600" />
              <span>No hay alertas activas en esta sección. Todo operando conforme.</span>
            </div>
          ) : (
            filteredSuggestions.map((sug) => (
              <div
                key={sug.id}
                className={`p-3.5 rounded-2xl bg-slate-950/80 border transition-all flex items-start gap-3 shadow-md ${
                  sug.type === 'audit_warning' 
                    ? 'border-amber-500/40 bg-amber-950/20' 
                    : sug.type === 'inventory_alert'
                    ? 'border-rose-500/40 bg-rose-950/20'
                    : 'border-slate-800'
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
                  sug.type === 'audit_warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : sug.type === 'inventory_alert'
                    ? 'bg-rose-500/20 text-rose-400'
                    : sug.type === 'upsell'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-teal-500/20 text-teal-400'
                }`}>
                  {sug.type === 'audit_warning' ? (
                    <ShieldAlert size={18} />
                  ) : sug.type === 'inventory_alert' ? (
                    <PackageCheck size={18} />
                  ) : sug.type === 'upsell' ? (
                    <Lightbulb size={18} />
                  ) : (
                    <TrendingUp size={18} />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      {sug.title}
                    </h4>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700">
                      {Math.round(sug.confidence * 100)}% Coincidencia
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">{sug.description}</p>

                  {sug.actionText && (
                    <button
                      onClick={onClose}
                      className="text-xs font-bold text-teal-300 hover:text-white flex items-center gap-1 transition-colors bg-slate-900 px-3 py-1 rounded-lg border border-slate-800"
                    >
                      <span>{sug.actionText}</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat / Consulta Directa con IA */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <p className="text-[11px] font-bold text-teal-400 flex items-center gap-1">
            <MessageSquare size={13} />
            <span>Consulta Interactiva de Personal:</span>
          </p>

          {/* Historial de chat breve */}
          {chatMessages.length > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800/80 text-xs">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`p-1.5 rounded-lg ${msg.sender === 'user' ? 'bg-slate-800 text-white font-semibold text-right' : 'bg-teal-950/60 text-teal-200 border border-teal-800/40'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendQuery} className="flex gap-2">
            <input
              type="text"
              placeholder="Ej. ¿Cuánto llevamos vendido hoy? o ¿Hay stock bajo?"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-teal-500 font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            >
              <Send size={14} />
              <span>Preguntar</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles size={12} className="text-teal-400" />
            Auditoría en tiempo real con datos de LOCALITO
          </span>
          <span className="text-slate-500 font-bold">
            LOCALITO POS AI v3.2.1
          </span>
        </div>
      </div>
    </div>
  )
}
