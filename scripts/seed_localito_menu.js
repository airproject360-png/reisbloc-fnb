import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function seedLocalitoMenuAndRecipes() {
  console.log('🧹 ELIMINANDO PRODUCTOS ANTIGUOS DE LOCALITO EN SUPABASE...')

  // 1. Delete all existing products for LOCALITO
  const { error: delPErr } = await supabase
    .from('products')
    .delete()
    .eq('organization_id', LOCALITO_ORG_ID)

  if (delPErr) {
    console.error('Error eliminando productos:', delPErr)
  }

  // Delete existing ingredients & recipes
  await supabase.from('recipes').delete().eq('organization_id', LOCALITO_ORG_ID)
  await supabase.from('ingredients').delete().eq('organization_id', LOCALITO_ORG_ID)

  console.log('✅ PRODUCTOS ANTIGUOS ELIMINADOS.')

  console.log('🌱 INSERTANDO PRODUCTOS DEL MENÚ REAL (FOTO) DE LOCALITO...')

  const menuProducts = [
    // Quesadillas Maíz
    { name: 'Quesadilla Maíz Sencilla', category: 'Quesadillas Maíz', price: 35.00, available: true, requires_recipe: true },
    { name: 'Quesadilla Maíz con Guisado', category: 'Quesadillas Maíz', price: 48.00, available: true, requires_recipe: true },
    { name: 'Quesadilla Maíz Extra Guisado', category: 'Quesadillas Maíz', price: 62.00, available: true, requires_recipe: true },

    // Quesadillas Harina
    { name: 'Quesadilla Harina Sencilla', category: 'Quesadillas Harina', price: 40.00, available: true, requires_recipe: true },
    { name: 'Quesadilla Harina con Guisado', category: 'Quesadillas Harina', price: 55.00, available: true, requires_recipe: true },
    { name: 'Quesadilla Harina Extra Guisado', category: 'Quesadillas Harina', price: 70.00, available: true, requires_recipe: true },

    // Platos & Platillos
    { name: 'Plato (1 guisado, 1 guarnición, 4 tortillas)', category: 'Platos', price: 95.00, available: true, requires_recipe: true },
    { name: 'Platillo (2 guisados, 1 guarnición, 4 tortillas)', category: 'Platos', price: 125.00, available: true, requires_recipe: true },
    { name: 'Sope Normal con Guisado', category: 'Platos', price: 45.00, available: true, requires_recipe: true },
    { name: 'Sope Extra Guisado', category: 'Platos', price: 60.00, available: true, requires_recipe: true },

    // Antojitos & Especialidades
    { name: 'Gordita con Guisado', category: 'Especialidades', price: 48.00, available: true, requires_recipe: true },
    { name: 'Volcán con Guisado', category: 'Especialidades', price: 52.00, available: true, requires_recipe: true },
    { name: 'Orden de Frijoles Puercos (Especialidad)', category: 'Especialidades', price: 65.00, available: true, requires_recipe: true },

    // Extras
    { name: 'Mini Pan Dulce', category: 'Extras', price: 18.00, available: true, requires_recipe: false },
    { name: 'Bolillo con Guisado', category: 'Extras', price: 45.00, available: true, requires_recipe: true },
    { name: 'Coctel de Fruta de Temporada', category: 'Extras', price: 40.00, available: true, requires_recipe: true },

    // Bebidas
    { name: 'Refrescos 600ml', category: 'Bebidas', price: 35.00, available: true, requires_recipe: false },
    { name: 'Agua de Sabor de la Casa', category: 'Bebidas', price: 32.00, available: true, requires_recipe: true },
    { name: 'Agua Natural 600ml', category: 'Bebidas', price: 25.00, available: true, requires_recipe: false },
    { name: 'Café de Olla', category: 'Bebidas', price: 30.00, available: true, requires_recipe: true },
    { name: 'Nescafé', category: 'Bebidas', price: 28.00, available: true, requires_recipe: false },
    { name: 'Jugo (Fruta de Temporada)', category: 'Bebidas', price: 38.00, available: true, requires_recipe: true },
  ]

  const insertedProducts = []
  for (const item of menuProducts) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        organization_id: LOCALITO_ORG_ID,
        name: item.name,
        category: item.category,
        price: item.price,
        current_stock: 100,
        minimum_stock: 10,
        has_inventory: true,
        available: true,
        requires_recipe: item.requires_recipe,
        prepare_time_minutes: 8,
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ Error insertando ${item.name}:`, error.message)
    } else {
      console.log(`✅ Producto creado: ${data.name} ($${data.price} MXN)`)
      insertedProducts.push(data)
    }
  }

  console.log('\n🥑 CREANDO INSUMOS DE INVENTARIO Y RECETAS TÉCNICAS...')

  const ingredientsList = [
    { name: 'Queso Oaxaca / Asadero', category: 'Lácteos', unit_type: 'kg', current_stock: 15.0, minimum_stock: 3.0 },
    { name: 'Tortilla de Maíz', category: 'Masa & Harinas', unit_type: 'kg', current_stock: 25.0, minimum_stock: 5.0 },
    { name: 'Tortilla de Harina', category: 'Masa & Harinas', unit_type: 'units', current_stock: 200, minimum_stock: 40 },
    { name: 'Masa de Nixtamal', category: 'Masa & Harinas', unit_type: 'kg', current_stock: 30.0, minimum_stock: 5.0 },
    { name: 'Guisado del Día (Pollo/Puerco/Res)', category: 'Guisados', unit_type: 'kg', current_stock: 40.0, minimum_stock: 8.0 },
    { name: 'Frijoles Puercos Especiales', category: 'Guisados', unit_type: 'kg', current_stock: 20.0, minimum_stock: 4.0 },
    { name: 'Guarnición (Arroz / Espagueti)', category: 'Guarniciones', unit_type: 'kg', current_stock: 25.0, minimum_stock: 5.0 },
    { name: 'Bolillo de Agua', category: 'Panadería', unit_type: 'units', current_stock: 50, minimum_stock: 10 },
    { name: 'Fruta de Temporada', category: 'Frutas', unit_type: 'kg', current_stock: 15.0, minimum_stock: 3.0 },
    { name: 'Café de Olla (Base Piloncillo/Canela)', category: 'Bebidas Base', unit_type: 'liter', current_stock: 20.0, minimum_stock: 5.0 },
  ]

  const insertedIngredientsMap = {}
  for (const ing of ingredientsList) {
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        organization_id: LOCALITO_ORG_ID,
        name: ing.name,
        category: ing.category,
        unit_type: ing.unit_type,
        current_stock: ing.current_stock,
        minimum_stock: ing.minimum_stock,
      })
      .select()
      .single()

    if (!error && data) {
      insertedIngredientsMap[ing.name] = data.id
      console.log(`📦 Insumo registrado: ${data.name}`)
    }
  }

  // Vincular recetas para productos clave
  for (const prod of insertedProducts) {
    if (prod.name.includes('Quesadilla Maíz')) {
      await supabase.from('recipes').insert([
        { organization_id: LOCALITO_ORG_ID, product_id: prod.id, ingredient_id: insertedIngredientsMap['Queso Oaxaca / Asadero'], quantity_required: 0.10 },
        { organization_id: LOCALITO_ORG_ID, product_id: prod.id, ingredient_id: insertedIngredientsMap['Tortilla de Maíz'], quantity_required: 0.08 }
      ])
    } else if (prod.name.includes('Plato') || prod.name.includes('Platillo')) {
      await supabase.from('recipes').insert([
        { organization_id: LOCALITO_ORG_ID, product_id: prod.id, ingredient_id: insertedIngredientsMap['Guisado del Día (Pollo/Puerco/Res)'], quantity_required: 0.25 },
        { organization_id: LOCALITO_ORG_ID, product_id: prod.id, ingredient_id: insertedIngredientsMap['Guarnición (Arroz / Espagueti)'], quantity_required: 0.15 },
        { organization_id: LOCALITO_ORG_ID, product_id: prod.id, ingredient_id: insertedIngredientsMap['Tortilla de Maíz'], quantity_required: 0.12 }
      ])
    } else if (prod.name.includes('Frijoles Puercos')) {
      await supabase.from('recipes').insert([
        { organization_id: LOCALITO_ORG_ID, product_id: prod.id, ingredient_id: insertedIngredientsMap['Frijoles Puercos Especiales'], quantity_required: 0.30 }
      ])
    }
  }

  console.log('🎉 MENÚ REAL Y RECETAS CONFIGURADAS 100% EN SUPABASE CLOUD!')
}

seedLocalitoMenuAndRecipes()
