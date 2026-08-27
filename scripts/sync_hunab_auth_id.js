import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'
const HUNAB_AUTH_ID = '138803ec-5857-4c4e-922c-0fa0ada997fc'
const HUNAB_EMAIL = 'hunab.arredondo@gmail.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function syncHunabAuthId() {
  console.log(`🔄 Sincronizando ID de auth de Hunab (${HUNAB_AUTH_ID}) en la tabla users...`)
  
  // Upsert en tabla users con el ID de Auth oficial
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: HUNAB_AUTH_ID,
      organization_id: LOCALITO_ORG_ID,
      name: 'Hunab Arredondo',
      username: 'hunab',
      email: HUNAB_EMAIL,
      role: 'admin',
      active: true
    })
    .select()

  if (error) {
    console.error('Error al sincronizar id de Hunab en users:', error)
  } else {
    console.log('✅ Usuario Hunab sincronizado con su ID de Auth:', data[0])
  }
}

syncHunabAuthId()
