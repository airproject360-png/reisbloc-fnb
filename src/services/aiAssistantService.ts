/**
 * AI Assistant & Intelligence Service
 * Reisbloc POS - F&B Edition
 */

export interface AISuggestion {
  id: string;
  type: 'upsell' | 'inventory_alert' | 'sales_insight' | 'recipe_cost';
  title: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  actionText?: string;
  metadata?: Record<string, any>;
}

class AIAssistantService {
  /**
   * Generates smart upselling suggestions based on current table cart
   */
  generateUpsellSuggestions(currentItems: Array<{ productName: string; category?: string }>): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const itemNames = currentItems.map(i => i.productName.toLowerCase());

    const hasFood = itemNames.some(name => name.includes('taco') || name.includes('burger') || name.includes('ceviche') || name.includes('postre'));
    const hasDrink = itemNames.some(name => name.includes('cerveza') || name.includes('margarita') || name.includes('café') || name.includes('soda'));

    if (hasFood && !hasDrink) {
      suggestions.push({
        id: 'upsell-drink-1',
        type: 'upsell',
        title: '🍹 Sugerencia de Bebida / Maridaje',
        description: 'El cliente ha ordenado alimentos pero aún no tiene bebida en la comanda. Recomienda una Margarita Artesanal o Cerveza fría.',
        confidence: 0.92,
        actionText: 'Sugerir Bebida Especial'
      });
    }

    if (hasFood && hasDrink) {
      suggestions.push({
        id: 'upsell-dessert-1',
        type: 'upsell',
        title: '🍰 Cierre Dulce (Postres & Café)',
        description: 'La comanda incluye comida y bebida. Sugiere la especialidad en postres (Cheesecake o Tiramisú) con un Espresso.',
        confidence: 0.88,
        actionText: 'Ofrecer Menú de Postres'
      });
    }

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
        title: '📊 Análisis de Ticket Promedio',
        description: `El ticket promedio actual es de $${avgTicket} MXN en ${ordersCount} comandas.`,
        confidence: 0.95
      },
      {
        id: 'sales-insight-2',
        type: 'sales_insight',
        title: '🔥 Platillo / Bebida Estrella',
        description: topItems.length > 0 
          ? `Tus artículos con mayor rotación hoy: ${topItems.slice(0, 3).join(', ')}.`
          : 'Mantén un monitoreo constante del volumen de barra en horas pico.',
        confidence: 0.90
      }
    ];
  }
}

export const aiAssistantService = new AIAssistantService();
export default aiAssistantService;
