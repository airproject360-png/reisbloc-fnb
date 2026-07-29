import { useState } from 'react'
import { Sparkles, X, Bot, ChevronRight, TrendingUp, Lightbulb, ShieldAlert } from 'lucide-react'
import { aiAssistantService, AISuggestion } from '@/services/aiAssistantService'

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  currentCartItems?: Array<{ productName: string; category?: string }>
}

export default function AIAssistantModal({ isOpen, onClose, currentCartItems = [] }: AIAssistantModalProps) {
  if (!isOpen) return null

  const upsellSuggestions = aiAssistantService.generateUpsellSuggestions(currentCartItems)
  const salesInsights = aiAssistantService.generateSalesInsights(12450, 24, ['Margarita Artesanal', 'Tacos de Pescado', 'Cheesecake'])

  const allSuggestions = [...upsellSuggestions, ...salesInsights]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Asistente de IA Reisbloc F&B
              </h2>
              <p className="text-xs text-slate-400">Recomendaciones inteligentes y sugerencias de venta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List of Suggestions */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {allSuggestions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Bot size={40} className="mx-auto mb-2 text-slate-600" />
              <span>No hay sugerencias en este momento para la comanda actual.</span>
            </div>
          ) : (
            allSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/50 transition-all flex items-start gap-3"
              >
                <div className="mt-1 p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  {sug.type === 'upsell' ? <Lightbulb size={18} /> : <TrendingUp size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white">{sug.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      {Math.round(sug.confidence * 100)}% Relevancia
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">{sug.description}</p>

                  {sug.actionText && (
                    <button
                      onClick={onClose}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
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
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Optimizando operativamente ventas, rotación de mesas e ingredientes.
        </div>
      </div>
    </div>
  )
}
