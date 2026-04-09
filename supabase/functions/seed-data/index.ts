import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), 
        { status: 400, headers: corsHeaders });
    }

    const { action, data, token } = body;
    console.log('📥 Seed request:', action);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Config error' }), 
        { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================================
    // ACTION: seed-event-menu
    // Crear productos, ingredientes y recetas para un menú de evento.
    // ============================================================
    if (action === 'seed-event-menu') {
      const { org_id } = data;
      
      if (!org_id) {
        return new Response(JSON.stringify({ error: 'Missing org_id' }), 
          { status: 400, headers: corsHeaders });
      }

      try {
        const eventMenu = [
          { name: 'Caguama', price: 80, category: 'Bebidas Evento' },
          { name: 'Cerveza Individual', price: 40, category: 'Bebidas Evento' },
          { name: 'Shot Mezcal', price: 100, category: 'Bebidas Evento' },
          { name: 'Shot Tequila', price: 90, category: 'Bebidas Evento' },
        ];

        // 1. Upsert Products
        const { data: upsertedProducts, error: productError } = await supabaseAdmin
          .from('products')
          .upsert(eventMenu.map(p => ({ ...p, organization_id: org_id, has_inventory: true, available: true })), { onConflict: 'name, organization_id' })
          .select();

        if (productError) throw new Error(`Failed to upsert products: ${productError.message}`);
        console.log('✅ Upserted products:', upsertedProducts?.length);

        // 2. Create Ingredient Category
        const { data: eventCategory, error: catError } = await supabaseAdmin
          .from('ingredient_categories')
          .upsert({ name: 'Bebidas Evento', organization_id: org_id }, { onConflict: 'name, organization_id' })
          .select().single();
        
        if (catError) throw new Error(`Failed to create category: ${catError.message}`);
        console.log('✅ Upserted category:', eventCategory?.name);

        // 3. Get 'pza' measurement unit
        const { data: unit, error: unitError } = await supabaseAdmin
            .from('measurement_units')
            .select('id')
            .eq('organization_id', org_id)
            .eq('code', 'pza')
            .single();

        if (unitError || !unit) throw new Error(`'pza' unit not found for org ${org_id}. Please seed base units first.`);

        // 4. Create Ingredients
        const ingredients = upsertedProducts.map(p => ({
          name: p.name,
          organization_id: org_id,
          category_id: eventCategory.id,
          unit_id: unit.id,
          current_stock: 100, // Stock inicial
          min_stock: 10,
          cost_per_unit: p.price * 0.5, // Costo estimado
          is_active: true
        }));
        
        const { data: createdIngredients, error: ingError } = await supabaseAdmin
          .from('ingredients')
          .upsert(ingredients, { onConflict: 'name, organization_id' })
          .select();

        if (ingError) throw new Error(`Failed to create ingredients: ${ingError.message}`);
        console.log('✅ Upserted ingredients:', createdIngredients?.length);

        // 5. Create Recipes
        const ingredientMap = Object.fromEntries(createdIngredients.map(ing => [ing.name, ing.id]));
        let recipeCount = 0;

        for (const product of upsertedProducts) {
          const { data: newRecipe, error: recipeError } = await supabaseAdmin
            .from('recipes')
            .upsert({
              organization_id: org_id,
              product_id: product.id,
              is_active: true,
              version: 1
            }, { onConflict: 'product_id' })
            .select()
            .single();

          if (!recipeError && newRecipe) {
            const { error: itemError } = await supabaseAdmin
              .from('recipe_items')
              .upsert({
                recipe_id: newRecipe.id,
                ingredient_id: ingredientMap[product.name],
                quantity_required: 1,
                waste_margin: 0
              }, { onConflict: 'recipe_id, ingredient_id' });

            if (!itemError) {
              recipeCount++;
              console.log('✅ Upserted recipe for:', product.name);
            }
          }
        }

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Event menu created/updated successfully',
          summary: {
            products: upsertedProducts.length,
            ingredients: createdIngredients.length,
            recipes: recipeCount
          }
        }), { status: 200, headers: corsHeaders });

      } catch (error) {
        console.error('❌ Error in seed-event-menu:', error.message);
        return new Response(JSON.stringify({ 
          error: 'Failed to create event menu',
          details: error.message 
        }), { status: 500, headers: corsHeaders });
      }
    }


    // ============================================================
    // ACTION: seed-demo-recipes
    // Crear recetas de demostración para pruebas
    // ============================================================
    if (action === 'seed-demo-recipes') {
      const { org_id } = data;
      
      if (!org_id) {
        return new Response(JSON.stringify({ error: 'Missing org_id' }), 
          { status: 400, headers: corsHeaders });
      }

      try {
        // 1. Crear categorías de ingredientes
        const categories = [
          { name: 'Proteínas', org_id },
          { name: 'Lácteos', org_id },
          { name: 'Vegetales', org_id },
          { name: 'Hierbas & Condimentos', org_id },
          { name: 'Bebidas', org_id }
        ];

        const { data: createdCategories, error: catError } = await supabaseAdmin
          .from('ingredient_categories')
          .insert(categories)
          .select();

        if (catError) throw new Error('Failed to create categories: ' + catError.message);
        console.log('✅ Created categories:', createdCategories?.length);

        // 2. Obtener measurement units
        const { data: units, error: unitError } = await supabaseAdmin
          .from('measurement_units')
          .select('id, code')
          .eq('organization_id', org_id);

        if (unitError) throw new Error('Failed to fetch units: ' + unitError.message);
        const unitMap = Object.fromEntries(units?.map((u: any) => [u.code, u.id]) || []);

        // 3. Crear ingredientes de ejemplo
        const ingredients = [
          // PROTEÍNAS
          { name: 'Huevo', unit_id: unitMap['pza'], category_id: createdCategories?.[0].id, cost_per_unit: 0.50 },
          { name: 'Pechuga de Pollo', unit_id: unitMap['g'], category_id: createdCategories?.[0].id, cost_per_unit: 0.008 },
          { name: 'Jamón', unit_id: unitMap['g'], category_id: createdCategories?.[0].id, cost_per_unit: 0.012 },
          { name: 'Tocino', unit_id: unitMap['g'], category_id: createdCategories?.[0].id, cost_per_unit: 0.010 },
          { name: 'Queso Oaxaca', unit_id: unitMap['g'], category_id: createdCategories?.[0].id, cost_per_unit: 0.015 },
          
          // VEGETALES
          { name: 'Tomate', unit_id: unitMap['g'], category_id: createdCategories?.[2].id, cost_per_unit: 0.002 },
          { name: 'Cebolla', unit_id: unitMap['g'], category_id: createdCategories?.[2].id, cost_per_unit: 0.001 },
          { name: 'Chile Serrano', unit_id: unitMap['pza'], category_id: createdCategories?.[2].id, cost_per_unit: 0.20 },
          { name: 'Cilantro', unit_id: unitMap['g'], category_id: createdCategories?.[3].id, cost_per_unit: 0.05 },
          { name: 'Lechuga', unit_id: unitMap['g'], category_id: createdCategories?.[2].id, cost_per_unit: 0.003 },
          
          // LÁCTEOS
          { name: 'Leche', unit_id: unitMap['ml'], category_id: createdCategories?.[1].id, cost_per_unit: 0.002 },
          { name: 'Mantequilla', unit_id: unitMap['g'], category_id: createdCategories?.[1].id, cost_per_unit: 0.030 },
          { name: 'Crema', unit_id: unitMap['ml'], category_id: createdCategories?.[1].id, cost_per_unit: 0.004 },
          
          // CONDIMENTOS
          { name: 'Sal', unit_id: unitMap['g'], category_id: createdCategories?.[3].id, cost_per_unit: 0.001 },
          { name: 'Pimienta', unit_id: unitMap['g'], category_id: createdCategories?.[3].id, cost_per_unit: 0.020 },
          { name: 'Aceite Vegetal', unit_id: unitMap['ml'], category_id: createdCategories?.[3].id, cost_per_unit: 0.002 },
        ];

        const { data: createdIngredients, error: ingError } = await supabaseAdmin
          .from('ingredients')
          .insert(ingredients.map(i => ({
            ...i,
            organization_id: org_id,
            current_stock: 1000,
            min_stock: 100
          })))
          .select();

        if (ingError) throw new Error('Failed to create ingredients: ' + ingError.message);
        console.log('✅ Created ingredients:', createdIngredients?.length);

        // 4. Obtener productos existentes
        const { data: products, error: prodError } = await supabaseAdmin
          .from('products')
          .select('id, name, category')
          .eq('organization_id', org_id)
          .eq('available', true);

        if (prodError) throw new Error('Failed to fetch products: ' + prodError.message);

        // 5. Crear recetas para productos comunes
        const recipes: any = [];
        const ingredientMap = Object.fromEntries(
          createdIngredients?.map((ing: any) => [ing.name, ing.id]) || []
        );

        // RECETAS DE DESAYUNO
        if (products?.some((p: any) => p.name === 'Huevos Revueltos')) {
          recipes.push({
            product_id: products.find((p: any) => p.name === 'Huevos Revueltos')?.id,
            items: [
              { ingredient: 'Huevo', quantity: 3, waste: 0.02 },
              { ingredient: 'Mantequilla', quantity: 20, waste: 0.05 },
              { ingredient: 'Sal', quantity: 2, waste: 0 },
              { ingredient: 'Pimienta', quantity: 1, waste: 0 }
            ]
          });
        }

        if (products?.some((p: any) => p.name.includes('Huevos Rancheros'))) {
          recipes.push({
            product_id: products.find((p: any) => p.name.includes('Huevos Rancheros'))?.id,
            items: [
              { ingredient: 'Huevo', quantity: 2, waste: 0.02 },
              { ingredient: 'Tomate', quantity: 150, waste: 0.10 },
              { ingredient: 'Cebolla', quantity: 50, waste: 0.10 },
              { ingredient: 'Chile Serrano', quantity: 1, waste: 0.05 }
            ]
          });
        }

        // Insertar recetas
        let recipeCount = 0;
        for (const recipe of recipes) {
          const { data: newRecipe, error: recipeError } = await supabaseAdmin
            .from('recipes')
            .insert({
              organization_id: org_id,
              product_id: recipe.product_id,
              is_active: true
            })
            .select()
            .single();

          if (!recipeError && newRecipe) {
            // Insertar items de receta
            const recipeItems = recipe.items.map((item: any) => ({
              recipe_id: newRecipe.id,
              ingredient_id: ingredientMap[item.ingredient],
              quantity_required: item.quantity,
              waste_margin: item.waste
            }));

            const { error: itemError } = await supabaseAdmin
              .from('recipe_items')
              .insert(recipeItems);

            if (!itemError) {
              recipeCount++;
              console.log('✅ Recipe created:', recipe.product_id);
            }
          }
        }

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Demo recipes created',
          summary: {
            categories: createdCategories?.length || 0,
            ingredients: createdIngredients?.length || 0,
            recipes: recipeCount
          }
        }), { status: 200, headers: corsHeaders });

      } catch (error) {
        console.error('❌ Error:', error.message);
        return new Response(JSON.stringify({ 
          error: 'Failed to create demo data',
          details: error.message 
        }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), 
      { status: 400, headers: corsHeaders });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: corsHeaders });
  }
});
