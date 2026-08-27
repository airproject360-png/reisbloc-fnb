import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const SODAS = [
  {
    organization_id: LOCALITO_ORG_ID,
    name: 'Coca-Cola 600ml',
    category: 'Bebidas',
    price: 35,
    current_stock: 48,
    minimum_stock: 10,
    has_inventory: true,
    available: true,
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop'
  },
  {
    organization_id: LOCALITO_ORG_ID,
    name: 'Sprite 600ml',
    category: 'Bebidas',
    price: 35,
    current_stock: 36,
    minimum_stock: 8,
    has_inventory: true,
    available: true,
    image_url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop'
  },
  {
    organization_id: LOCALITO_ORG_ID,
    name: 'Fanta 600ml',
    category: 'Bebidas',
    price: 35,
    current_stock: 36,
    minimum_stock: 8,
    has_inventory: true,
    available: true,
    image_url: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=800&auto=format&fit=crop'
  },
  {
    organization_id: LOCALITO_ORG_ID,
    name: 'Fresca 600ml',
    category: 'Bebidas',
    price: 35,
    current_stock: 24,
    minimum_stock: 6,
    has_inventory: true,
    available: true,
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop'
  },
  {
    organization_id: LOCALITO_ORG_ID,
    name: 'Sidral Mundet 600ml',
    category: 'Bebidas',
    price: 35,
    current_stock: 24,
    minimum_stock: 6,
    has_inventory: true,
    available: true,
    image_url: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=800&auto=format&fit=crop'
  },
  {
    organization_id: LOCALITO_ORG_ID,
    name: 'Agua Natural Ciel 600ml',
    category: 'Bebidas',
    price: 25,
    current_stock: 60,
    minimum_stock: 12,
    has_inventory: true,
    available: true,
    image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop'
  }
]

const SODA_INGREDIENTS = [
  { id: 'ing-beb-01', organization_id: LOCALITO_ORG_ID, name: 'Refresco Coca-Cola 600ml Botella', category: 'Bebidas Embotelladas', unit_type: 'units', current_stock: 48, minimum_stock: 10 },
  { id: 'ing-beb-02', organization_id: LOCALITO_ORG_ID, name: 'Refresco Sprite 600ml Botella', category: 'Bebidas Embotelladas', unit_type: 'units', current_stock: 36, minimum_stock: 8 },
  { id: 'ing-beb-03', organization_id: LOCALITO_ORG_ID, name: 'Refresco Fanta Naranja 600ml Botella', category: 'Bebidas Embotelladas', unit_type: 'units', current_stock: 36, minimum_stock: 8 },
  { id: 'ing-beb-04', organization_id: LOCALITO_ORG_ID, name: 'Refresco Fresca Toronja 600ml Botella', category: 'Bebidas Embotelladas', unit_type: 'units', current_stock: 24, minimum_stock: 6 },
  { id: 'ing-beb-05', organization_id: LOCALITO_ORG_ID, name: 'Refresco Sidral Mundet 600ml Botella', category: 'Bebidas Embotelladas', unit_type: 'units', current_stock: 24, minimum_stock: 6 },
  { id: 'ing-beb-06', organization_id: LOCALITO_ORG_ID, name: 'Botella Agua Natural Ciel 600ml', category: 'Bebidas Embotelladas', unit_type: 'units', current_stock: 60, minimum_stock: 12 }
]

async function seedSodas() {
  console.log('🥤 Eliminando refresco genérico y agregando refrescos embotellados individuales...')

  // Eliminar el producto genérico "Refrescos 600ml"
  await supabase
    .from('products')
    .delete()
    .eq('organization_id', LOCALITO_ORG_ID)
    .ilike('name', '%Refrescos 600ml%')

  // Insertar o actualizar refrescos individuales
  for (const soda of SODAS) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', LOCALITO_ORG_ID)
      .eq('name', soda.name)
      .maybeSingle()

    if (existing) {
      await supabase.from('products').update(soda).eq('id', existing.id)
    } else {
      await supabase.from('products').insert(soda)
    }
  }

  // Insertar insumos de inventario para refrescos
  for (const ing of SODA_INGREDIENTS) {
    await supabase.from('ingredients').upsert(ing)
  }

  console.log('✅ Refrescos embotellados precargados en inventario y productos Supabase.')
}

seedSodas()
