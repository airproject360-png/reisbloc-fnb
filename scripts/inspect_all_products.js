import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function inspectProducts() {
  console.log('🔍 Inspeccionando todos los productos en la base de datos...')
  const { data: allProducts, error } = await supabase.from('products').select('*')
  
  if (error) {
    console.error('Error al obtener productos:', error)
    return
  }

  console.log(`Total productos en la tabla: ${allProducts.length}`)
  allProducts.forEach(p => {
    console.log(`- ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Org: ${p.organization_id} | Price: $${p.price}`)
  })
}

inspectProducts()
