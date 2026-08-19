/**
 * AI Assistant & Intelligence Service
 * Reisbloc POS - F&B Client-Customized Edition
 */

export interface AISuggestion {
  id: string;
  type: 'upsell' | 'inventory_alert' | 'sales_insight' | 'recipe_cost' | 'audit_warning';
  title: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  category?: 'pos' | 'closing' | 'inventory' | 'audit';
  actionText?: string;
  metadata?: Record<string, any>;
}

export interface ClosingAuditSummary {
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  totalSales: number;
  ordersCount: number;
  voidsCount: number;
  discountsTotal: number;
}

class AIAssistantService {
  /**
   * Generates smart upselling & beverage pairing suggestions based on current table cart
   */
  generateUpsellSuggestions(currentItems: Array<{ productName: string; category?: string }>): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const itemNames = currentItems.map(i => i.productName.toLowerCase());

    const hasFood = itemNames.some(name => name.includes('taco') || name.includes('burger') || name.includes('ceviche') || name.includes('postre') || name.includes('pizza') || name.includes('corte'));
    const hasDrink = itemNames.some(name => name.includes('cerveza') || name.includes('margarita') || name.includes('café') || name.includes('soda') || name.includes('vino') || name.includes('coctel'));
    const hasDessert = itemNames.some(name => name.includes('postre') || name.includes('flan') || name.includes('cheesecake') || name.includes('pastel') || name.includes('helado'));

    if (hasFood && !hasDrink) {
      suggestions.push({
        id: 'upsell-drink-1',
        type: 'upsell',
        category: 'pos',
        title: '🍹 Maridaje Inteligente Recomienda Bebida',
        description: 'El cliente ha ordenado platillos principales sin bebida registrada. Recomienda la bebida especial o coctel de la casa.',
        confidence: 0.94,
        actionText: 'Ofrecer Bebida Especial'
      });
    }

    if (hasFood && hasDrink && !hasDessert) {
      suggestions.push({
        id: 'upsell-dessert-1',
        type: 'upsell',
        category: 'pos',
        title: '🍰 Cierre Sugerido (Postres & Digestivos)',
        description: 'Mesa lista para la etapa de cierre. Recomienda el postre de autor o café digestivo para incrementar el ticket un 18%.',
        confidence: 0.89,
        actionText: 'Ofrecer Carta de Postres'
      });
    }

    if (itemNames.length >= 4) {
      suggestions.push({
        id: 'upsell-combo-1',
        type: 'upsell',
        category: 'pos',
        title: '⭐ Promoción de Combo / Botella',
        description: 'Comanda con múltiples comensales detectada. Sugiere paquete familiar o botella con descuento de volumen.',
        confidence: 0.85,
        actionText: 'Ver Promociones de Grupo'
      });
    }

    return suggestions;
  }

  /**
   * Generates AI Shift Closing Audit Summary
   */
  generateClosingAuditSummary(data: ClosingAuditSummary): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    if (Math.abs(data.discrepancy) > 0) {
      const isShort = data.discrepancy < 0;
      suggestions.push({
        id: 'closing-discrepancy',
        type: 'audit_warning',
        category: 'closing',
        title: isShort ? '⚠️ Descuadre Faltante en Caja' : '⚠️ Sobrante no Registrado en Caja',
        description: `Se detectó una diferencia de $${Math.abs(data.discrepancy).toFixed(2)} MXN entre el efectivo esperado ($${data.expectedCash.toFixed(2)}) y contado ($${data.actualCash.toFixed(2)}).`,
        confidence: 0.98,
        actionText: 'Auditar Transacciones en Efectivo'
      });
    }

    if (data.voidsCount > 3) {
      suggestions.push({
        id: 'closing-voids-alert',
        type: 'audit_warning',
        category: 'closing',
        title: '🛡️ Alerta de Cancelaciones en Turno',
        description: `Se registraron ${data.voidsCount} anulaciones de platillos en el turno. La IA sugiere revisar los motivos para descartar mermas no reportadas.`,
        confidence: 0.91,
        actionText: 'Ver Detalle de Anulaciones'
      });
    }

    if (data.discountsTotal > 500) {
      suggestions.push({
        id: 'closing-discounts-alert',
        type: 'sales_insight',
        category: 'closing',
        title: '📉 Alto Volumen de Descuentos Aplicados',
        description: `Total de cortesías y descuentos acumulados: $${data.discountsTotal.toFixed(2)} MXN en ${data.ordersCount} órdenes.`,
        confidence: 0.88
      });
    }

    // Resumen Ejecutivo de la IA
    suggestions.push({
      id: 'closing-ai-summary',
      type: 'sales_insight',
      category: 'closing',
      title: '📊 Resumen de Salud Operativa del Turno',
      description: `Ventas totales: $${data.totalSales.toFixed(2)} MXN en ${data.ordersCount} comandes. Ticket promedio: $${(data.ordersCount > 0 ? data.totalSales / data.ordersCount : 0).toFixed(2)} MXN. Estado de auditoría: ${Math.abs(data.discrepancy) === 0 ? 'Conforme / Sin descuadres' : 'Requiere revisión de supervisión'}.`,
      confidence: 0.96
    });

    return suggestions;
  }

  /**
   * Generates AI sales insights for Admin/Manager dashboard
   */
  generateSalesInsights(totalSales: number, ordersCount: number, topItems: string[]): AISuggestion[] {
    const avgTicket = ordersCount > 0 ? (totalSales / ordersCount).toFixed(2) : '0';

    return [
      {
        id: 'sales-insight-1',
        type: 'sales_insight',
        category: 'audit',
        title: '📊 Análisis de Ticket Promedio',
        description: `El ticket promedio actual es de $${avgTicket} MXN en ${ordersCount} comandas.`,
        confidence: 0.95
      },
      {
        id: 'sales-insight-2',
        type: 'sales_insight',
        category: 'pos',
        title: '🔥 Platillo / Bebida Estrella',
        description: topItems.length > 0 
          ? `Artículos con mayor rotación en el periodo: ${topItems.slice(0, 3).join(', ')}.`
          : 'Mantén un monitoreo constante del volumen de barra en horas pico.',
        confidence: 0.90
      }
    ];
  }

  /**
   * Generates AI Inventory & Waste Alerts
   */
  generateInventoryAuditInsights(lowStockItems: Array<{ name: string; current: number; min: number }>): AISuggestion[] {
    return lowStockItems.map((item, idx) => ({
      id: `inv-alert-${idx}`,
      type: 'inventory_alert',
      category: 'inventory',
      title: `📦 Stock Crítico: ${item.name}`,
      description: `Existencia actual (${item.current}) está por debajo del mínimo configurado (${item.min}). Sugerimos generar orden de compra preventiva.`,
      confidence: 0.96,
      actionText: 'Generar Reabastecimiento'
    }));
  }
}

export const aiAssistantService = new AIAssistantService();
export default aiAssistantService;

