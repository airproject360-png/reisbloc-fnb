import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const OLD_ORG_ID = 'cb86de9f-48b9-4680-b6bc-6da0a15a98fa'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function cleanOldTenantData() {
  console.log(`🗑️ Eliminando productos del tenant no deseado (${OLD_ORG_ID})...`)
  const { data: delProds, error: errDel } = await supabase
    .from('products')
    .delete()
    .eq('organization_id', OLD_ORG_ID)
    .select()

  if (errDel) {
    console.error('Error al eliminar productos viejos:', errDel)
  } else {
    console.log(`✅ ${delProds?.length || 0} productos no deseados eliminados exitosamente!`)
  }

  // Verificar productos restantes para LOCALITO
  const { data: localitoProds } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', LOCALITO_ORG_ID)

  console.log(`📋 Productos oficiales de LOCALITO en base de datos: ${localitoProds?.length || 0}`)
  localitoProds?.forEach(p => console.log(`  - [${p.category}] ${p.name} ($${p.price})`))
}

cleanOldTenantData()
