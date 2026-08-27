import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function fixProductAvailability() {
  console.log('🔧 Actualizando disponibilidad de productos en Supabase para LOCALITO...')

  const { data, error } = await supabase
    .from('products')
    .update({
      has_inventory: false,
      available: true,
      current_stock: 999
    })
    .eq('organization_id', LOCALITO_ORG_ID)

  if (error) {
    console.error('❌ Error al actualizar productos:', error)
  } else {
    console.log('✅ Todos los productos de LOCALITO actualizados como Disponibles en Supabase.')
  }
}

fixProductAvailability()
