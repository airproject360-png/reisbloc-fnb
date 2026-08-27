/**
 * AI Assistant & Operational Intelligence Service
 * LOCALITO Guisos & Barra Fría - Real Data POS Assistant
 */

export interface AISuggestion {
  id: string;
  type: 'upsell' | 'inventory_alert' | 'sales_insight' | 'audit_warning';
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
   * Sugerencias operativas para el pedido (complementos, postres, adicionales)
   * Sin conceptos de maridaje.
   */
  generateUpsellSuggestions(currentItems: Array<{ productName: string; category?: string }>): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const itemNames = currentItems.map(i => i.productName.toLowerCase());

    const hasQuesadillasOrDishes = itemNames.some(name =>
      name.includes('quesadilla') || name.includes('platillo') || name.includes('guiso') || name.includes('sope') || name.includes('gordita')
    );
    const hasExtras = itemNames.some(name => name.includes('frijol') || name.includes('queso') || name.includes('extra'));
    const hasBeverage = itemNames.some(name => name.includes('coca') || name.includes('agua') || name.includes('refresco') || name.includes('bebida'));

    if (hasQuesadillasOrDishes && !hasExtras) {
      suggestions.push({
        id: 'upsell-extra-1',
        type: 'upsell',
        category: 'pos',
        title: '🫘 Sugerencia de Adicional: Frijoles Puercos o Queso Extra',
        description: 'La orden incluye guisos o quesadillas sin adicionales. Puedes sugerir una porción de Frijoles Puercos o Queso Extra.',
        confidence: 0.92,
        actionText: 'Ofrecer Frijoles Puercos'
      });
    }

    if (hasQuesadillasOrDishes && !hasBeverage) {
      suggestions.push({
        id: 'upsell-drink-1',
        type: 'upsell',
        category: 'pos',
        title: '🥤 Sugerencia: Ofrecer Refresco o Agua Fresca',
        description: 'La comanda aún no tiene registrado refresco o agua. Recuerda ofrecer la bebida de la casa.',
        confidence: 0.88,
        actionText: 'Ofrecer Bebida'
      });
    }

    if (itemNames.length >= 3) {
      suggestions.push({
        id: 'upsell-dessert-1',
        type: 'upsell',
        category: 'pos',
        title: '🍰 Cierre de Comanda: Postre del Día',
        description: 'Mesa con múltiples consumos. Puedes sugerir el postre casero o café para completar el servicio.',
        confidence: 0.85,
        actionText: 'Ofrecer Postre'
      });
    }

    return suggestions;
  }

  /**
   * Auditoría y Resumen Operativo Real del Turno
   */
  generateClosingAuditSummary(data: ClosingAuditSummary): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    if (Math.abs(data.discrepancy) > 0) {
      const isShort = data.discrepancy < 0;
      suggestions.push({
        id: 'closing-discrepancy',
        type: 'audit_warning',
        category: 'closing',
        title: isShort ? '⚠️ Diferencia Faltante en Caja' : '⚠️ Diferencia Sobrante en Caja',
        description: `Diferencia detectada de $${Math.abs(data.discrepancy).toFixed(2)} MXN entre el efectivo esperado ($${data.expectedCash.toFixed(2)}) y el físico ($${data.actualCash.toFixed(2)}).`,
        confidence: 0.98,
        actionText: 'Revisar Ventas en Efectivo'
      });
    }

    if (data.voidsCount > 2) {
      suggestions.push({
        id: 'closing-voids-alert',
        type: 'audit_warning',
        category: 'closing',
        title: '🛡️ Registro de Cancelaciones',
        description: `Se han registrado ${data.voidsCount} anulaciones en el turno. Sugerimos verificar la causa en cocina/caja.`,
        confidence: 0.91,
        actionText: 'Ver Anulaciones'
      });
    }

    // Resumen Operativo Real
    suggestions.push({
      id: 'closing-ai-summary',
      type: 'sales_insight',
      category: 'closing',
      title: '📊 Resumen de Salud Operativa del Día',
      description: `Ventas registradas: $${data.totalSales.toFixed(2)} MXN en ${data.ordersCount} comandas. Ticket promedio: $${(data.ordersCount > 0 ? data.totalSales / data.ordersCount : 0).toFixed(2)} MXN. Estado de arqueo: ${Math.abs(data.discrepancy) === 0 ? 'Sin cuadres pendientes' : 'Con observaciones en caja'}.`,
      confidence: 0.96
    });

    return suggestions;
  }

  /**
   * Alertas Reales de Inventario & Stock Bajo
   */
  generateInventoryAuditInsights(lowStockItems: Array<{ name: string; current: number; min: number }>): AISuggestion[] {
    if (lowStockItems.length === 0) {
      return [{
        id: 'inv-ok',
        type: 'inventory_alert',
        category: 'inventory',
        title: '✅ Inventario Estable',
        description: 'Todos los insumos y platillos cuentan con niveles de stock óptimos para el turno.',
        confidence: 0.95
      }];
    }

    return lowStockItems.map((item, idx) => ({
      id: `inv-alert-${idx}`,
      type: 'inventory_alert',
      category: 'inventory',
      title: `📦 Stock Bajo: ${item.name}`,
      description: `Existencia actual (${item.current}) está por debajo del límite mínimo (${item.min}). Generar reabastecimiento.`,
      confidence: 0.96,
      actionText: 'Revisar Inventario'
    }));
  }

  /**
   * Motor de Respuestas Interactivas a Consultas del Personal
   */
  answerStaffQuery(query: string, context: { totalSales: number; ordersCount: number; products: any[]; lowStockItems: any[] }): string {
    const q = query.toLowerCase();

    if (q.includes('cuanto') && (q.includes('venta') || q.includes('vendido') || q.includes('caja') || q.includes('llevamos'))) {
      return `📊 Hasta el momento se han registrado $${context.totalSales.toFixed(2)} MXN en total, repartidos en ${context.ordersCount} comandas (Ticket promedio: $${context.ordersCount > 0 ? (context.totalSales / context.ordersCount).toFixed(2) : '0.00'} MXN).`;
    }

    if (q.includes('recomend') || q.includes('sugier') || q.includes('ofrecer') || q.includes('ofresco')) {
      return `💡 Te recomiendo sugerir nuestros platillos de guisado estrella (Quesadillas de Chicharrón Prensado o Deshebrada), acompañadas de Frijoles Puercos y un Refresco bien frío.`;
    }

    if (q.includes('inventario') || q.includes('stock') || q.includes('falta') || q.includes('insumo')) {
      if (context.lowStockItems.length === 0) {
        return `📦 Todo el inventario está en niveles adecuados. Ningún insumo requiere reabastecimiento urgente en este momento.`;
      }
      const names = context.lowStockItems.slice(0, 3).map(i => i.name).join(', ');
      return `⚠️ Atención: Los siguientes insumos tienen stock bajo: ${names}.`;
    }

    return `🤖 Como tu Asistente IA POS de LOCALITO, puedo ayudarte a consultar las ventas del día, revisar el inventario de insumos o darte sugerencias operativas para la caja.`;
  }
}

export const aiAssistantService = new AIAssistantService();
export default aiAssistantService;
