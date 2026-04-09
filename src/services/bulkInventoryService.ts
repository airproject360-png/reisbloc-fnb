/**
 * ============================================================
 * SERVICIO DE INVENTARIO A GRANEL
 * ============================================================
 * 
 * Maneja descuentos de inventario basados en recetas.
 * Las recetas son preexistentes, solo permiten UPDATE no INSERT.
 * Todos los descuentos incluyen merma automáticamente.
 */

import { supabase } from '@/config/supabase';

// ============================================================
// TIPOS
// ============================================================

export interface Ingredient {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  unit_type: 'kg' | 'liter' | 'units';
  current_stock: number;
  reorder_level: number;
  waste_margin_percent: number;
  is_active: boolean;
}

export interface RecipeItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity_required: number;
  unit_type: string;
  waste_margin_percent: number;
  quantity_with_waste: number;
  current_stock: number;
  is_available: boolean;
}

export interface Recipe {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  is_active: boolean;
  version: number;
  created_at: string;
  ingredients: RecipeItem[];
}

export interface InventoryMovement {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'waste';
  quantity_base: number;
  quantity_with_waste: number;
  waste_margin_percent: number;
  related_order_id?: string;
  related_recipe_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface DiscountResult {
  success: boolean;
  message: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity_discounted: number;
  remaining_stock: number;
}

// ============================================================
// SERVICIO PRINCIPAL
// ============================================================

class BulkInventoryService {
  /**
   * Obtener todas las recetas preexistentes
   */
  async getRecipes(): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('vw_recipes_detail')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  }

  /**
   * Obtener una receta específica
   */
  async getRecipe(recipeId: string): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('vw_recipes_detail')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching recipe:', error);
      throw error;
    }
  }

  /**
   * Actualizar una receta existente (SOLO UPDATE, no INSERT)
   */
  async updateRecipe(
    recipeId: string,
    updates: {
      name?: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<Recipe> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', recipeId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Recipe not found');

      return data;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }

  /**
   * Actualizar ingredientes de una receta
   */
  async updateRecipeItems(
    recipeId: string,
    items: Array<{
      ingredient_id: string;
      quantity_required: number;
      waste_margin_percent?: number;
    }>
  ): Promise<void> {
    try {
      // Primero eliminar items existentes
      const { error: deleteError } = await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', recipeId);

      if (deleteError) throw deleteError;

      // Luego crear nuevos items
      const itemsToInsert = items.map((item, idx) => ({
        recipe_id: recipeId,
        ingredient_id: item.ingredient_id,
        quantity_required: item.quantity_required,
        waste_margin_percent: item.waste_margin_percent,
        sort_order: idx,
      }));

      const { error: insertError } = await supabase
        .from('recipe_items')
        .insert(itemsToInsert);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error updating recipe items:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de ingredientes (stock)
   */
  async getIngredients(): Promise<Ingredient[]> {
    try {
      const { data, error } = await supabase
        .from('vw_ingredient_stock')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  }

  /**
   * Obtener un ingrediente específico
   */
  async getIngredient(ingredientId: string): Promise<Ingredient | null> {
    try {
      const { data, error } = await supabase
        .from('vw_ingredient_stock')
        .select('*')
        .eq('id', ingredientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching ingredient:', error);
      throw error;
    }
  }

  /**
   * DESCONTAR INVENTARIO AL VENDER
   * 
   * Calcula automáticamente la merma y descuenta.
   * Ejemplo: Vendo 2 ensaladas Caesar
   * - Lechuga: 2 recetas * 200g * 1.15 (merma 15%) = 460g descuento
   * 
   * @param recipeId ID de la receta
   * @param quantitySold Cantidad vendida
   * @param orderId ID del pedido (para auditoría)
   * @returns Resultado del descuento por ingrediente
   */
  async discountInventoryByRecipe(
    recipeId: string,
    quantitySold: number = 1,
    orderId?: string
  ): Promise<DiscountResult[]> {
    try {
      const { data, error } = await supabase.rpc(
        'discount_inventory_by_recipe',
        {
          p_recipe_id: recipeId,
          p_quantity_sold: quantitySold,
          p_order_id: orderId || null,
          p_created_by: null, // Se usa auth.uid() del servidor
        }
      );

      if (error) throw error;
      if (!data) throw new Error('No results from inventory discount');

      // Verificar si hubo errores
      const hasErrors = data.some((result: DiscountResult) => !result.success);
      if (hasErrors) {
        const errorMessage = data
          .filter((r: DiscountResult) => !r.success)
          .map((r: DiscountResult) => r.message)
          .join('; ');
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('Error discounting inventory:', error);
      throw error;
    }
  }

  /**
   * Verificar disponibilidad antes de vender
   */
  async checkRecipeAvailability(
    recipeId: string,
    quantitySold: number = 1
  ): Promise<{
    available: boolean;
    message: string;
    missingIngredients: Array<{
      name: string;
      required: number;
      available: number;
      unit: string;
    }>;
  }> {
    try {
      const recipe = await this.getRecipe(recipeId);
      if (!recipe) {
        return {
          available: false,
          message: 'Receta no encontrada',
          missingIngredients: [],
        };
      }

      const missingIngredients = recipe.ingredients
        .filter((item) => {
          const required = item.quantity_with_waste * quantitySold;
          return item.current_stock < required;
        })
        .map((item) => ({
          name: item.ingredient_name,
          required: item.quantity_with_waste * quantitySold,
          available: item.current_stock,
          unit: item.unit_type,
        }));

      if (missingIngredients.length > 0) {
        return {
          available: false,
          message: `Stock insuficiente: ${missingIngredients.map((m) => m.name).join(', ')}`,
          missingIngredients,
        };
      }

      return {
        available: true,
        message: 'Stock disponible',
        missingIngredients: [],
      };
    } catch (error) {
      console.error('Error checking recipe availability:', error);
      throw error;
    }
  }

  /**
   * Obtener histórico de movimientos de inventario
   */
  async getInventoryMovements(
    ingredientId?: string,
    limit: number = 50
  ): Promise<InventoryMovement[]> {
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ingredientId) {
        query = query.eq('ingredient_id', ingredientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory movements:', error);
      throw error;
    }
  }

  /**
   * Obtener resumen de stock (ingredientes críticos)
   */
  async getStockSummary(): Promise<{
    critical: Ingredient[];
    low: Ingredient[];
    ok: Ingredient[];
  }> {
    try {
      const { data, error } = await supabase
        .from('vw_ingredient_stock')
        .select('*');

      if (error) throw error;

      const ingredients = data || [];
      return {
        critical: ingredients.filter((i) => i.stock_status === 'CRITICAL'),
        low: ingredients.filter((i) => i.stock_status === 'LOW'),
        ok: ingredients.filter((i) => i.stock_status === 'OK'),
      };
    } catch (error) {
      console.error('Error fetching stock summary:', error);
      throw error;
    }
  }

  /**
   * Registrar ajuste manual de inventario
   */
  async adjustInventory(
    ingredientId: string,
    quantityChange: number, // Positivo o negativo
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          ingredient_id: ingredientId,
          movement_type: 'adjustment',
          quantity_base: Math.abs(quantityChange),
          quantity_with_waste: Math.abs(quantityChange),
          waste_margin_percent: 0,
          notes,
        });

      if (error) throw error;

      // Actualizar stock
      if (quantityChange !== 0) {
        await supabase
          .from('ingredients')
          .update({
            current_stock: supabase.rpc('set_ingredient_stock', {
              p_ingredient_id: ingredientId,
              p_change: quantityChange,
            }),
          })
          .eq('id', ingredientId);
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      throw error;
    }
  }
}

export const bulkInventoryService = new BulkInventoryService();
