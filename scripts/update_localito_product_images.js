import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const categoryImages = {
  'Quesadillas Maíz': 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=800&auto=format&fit=crop',
  'Quesadillas Harina': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  'Platos': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
  'Especialidades': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  'Extras': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop',
  'Bebidas': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop'
}

async function updateProductImages() {
  console.log('🖼️ Actualizando imágenes de productos de LOCALITO en Supabase DB...')
  const { data: products } = await supabase.from('products').select('*').eq('organization_id', LOCALITO_ORG_ID)

  if (!products || products.length === 0) {
    console.log('No se encontraron productos para actualizar.')
    return
  }

  for (const p of products) {
    const imageUrl = categoryImages[p.category] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop'
    const { error } = await supabase
      .from('products')
      .update({ image_path: imageUrl })
      .eq('id', p.id)

    if (error) {
      console.error(`Error actualizando imagen de ${p.name}:`, error)
    } else {
      console.log(`✅ Imagen configurada para [${p.category}] ${p.name}`)
    }
  }
}

updateProductImages()
