import { useState } from 'react'
import { Sparkles, X, Bot, ChevronRight, TrendingUp, Lightbulb, ShieldAlert, PackageCheck, DollarSign } from 'lucide-react'
import { aiAssistantService } from '@/services/aiAssistantService'
import { APP_CONFIG } from '@/config/constants'

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
  const [activeTab, setActiveTab] = useState<'all' | 'pos' | 'closing' | 'inventory'>('all')

  if (!isOpen) return null

  const upsellSuggestions = aiAssistantService.generateUpsellSuggestions(currentCartItems)
  const salesInsights = aiAssistantService.generateSalesInsights(14250, 28, ['Margarita Artesanal', 'Tacos de Pescado', 'Cheesecake'])
  
  const closingAudit = closingData 
    ? aiAssistantService.generateClosingAuditSummary(closingData)
    : aiAssistantService.generateClosingAuditSummary({
        expectedCash: 4500,
        actualCash: 4450,
        discrepancy: -50,
        totalSales: 14250,
        ordersCount: 28,
        voidsCount: 2,
        discountsTotal: 350
      })

  const inventoryInsights = aiAssistantService.generateInventoryAuditInsights([
    { name: 'Tequila Reposado (750ml)', current: 2, min: 5 },
    { name: 'Filete de Pescado (kg)', current: 3.5, min: 8 }
  ])

  const allSuggestions = [
    ...upsellSuggestions, 
    ...closingAudit, 
    ...salesInsights, 
    ...inventoryInsights
  ]

  const filteredSuggestions = activeTab === 'all' 
    ? allSuggestions 
    : allSuggestions.filter(s => s.category === activeTab || (activeTab === 'pos' && s.type === 'upsell'))

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden text-slate-100">
        
        {/* Glow de fondo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                Asistente IA & Auditoría - {APP_CONFIG.CLIENT_NAME}
              </h2>
              <p className="text-xs text-slate-400">Recomendaciones operativas, maridajes y prevención de mermas</p>
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
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Todos', icon: Sparkles },
            { id: 'pos', label: 'Ventas & Maridaje', icon: Lightbulb },
            { id: 'closing', label: 'Cierre & Caja', icon: DollarSign },
            { id: 'inventory', label: 'Inventario & Mermas', icon: PackageCheck },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
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
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <Bot size={44} className="mx-auto mb-2 text-slate-600 animate-bounce-subtle" />
              <span>No hay alertas ni sugerencias registradas en esta categoría.</span>
            </div>
          ) : (
            filteredSuggestions.map((sug) => (
              <div
                key={sug.id}
                className={`p-4 rounded-2xl bg-slate-800/60 border hover:border-indigo-500/60 transition-all flex items-start gap-3 shadow-md ${
                  sug.type === 'audit_warning' 
                    ? 'border-amber-500/40 bg-amber-950/20' 
                    : sug.type === 'inventory_alert'
                    ? 'border-rose-500/40 bg-rose-950/20'
                    : 'border-slate-700/60'
                }`}
              >
                <div className={`mt-0.5 p-2.5 rounded-xl flex-shrink-0 ${
                  sug.type === 'audit_warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : sug.type === 'inventory_alert'
                    ? 'bg-rose-500/20 text-rose-400'
                    : sug.type === 'upsell'
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {sug.type === 'audit_warning' ? (
                    <ShieldAlert size={20} />
                  ) : sug.type === 'inventory_alert' ? (
                    <PackageCheck size={20} />
                  ) : sug.type === 'upsell' ? (
                    <Lightbulb size={20} />
                  ) : (
                    <TrendingUp size={20} />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {sug.title}
                    </h4>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-300 border border-slate-600">
                      {Math.round(sug.confidence * 100)}% Relevancia
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2.5">{sug.description}</p>

                  {sug.actionText && (
                    <button
                      onClick={onClose}
                      className="text-xs font-extrabold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors bg-teal-950/40 px-3 py-1.5 rounded-lg border border-teal-500/30 hover:border-teal-400"
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

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles size={12} className="text-teal-400" />
            Auditoría en tiempo real activa
          </span>
          <span className="text-slate-400">
            Reisbloc F&B Core v3.2.1
          </span>
        </div>
      </div>
    </div>
  )
}

