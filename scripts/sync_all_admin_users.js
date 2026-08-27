import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function syncAllAdmins() {
  console.log('🔄 Sincronizando usuarios administradores con sus Auth IDs oficiales en la tabla users...')

  const adminUsers = [
    {
      id: 'b303969a-4b1b-415c-a746-e71144c748c8', // Auth ID real de hunab.arredondo@gmail.com en el log
      organization_id: LOCALITO_ORG_ID,
      name: 'Hunab Arredondo',
      username: 'hunab',
      email: 'hunab.arredondo@gmail.com',
      role: 'admin',
      active: true
    },
    {
      id: '138803ec-5857-4c4e-922c-0fa0ada997fc',
      organization_id: LOCALITO_ORG_ID,
      name: 'Hunab Arredondo',
      username: 'hunab_alt',
      email: 'hunab.arredondo@gmail.com',
      role: 'admin',
      active: true
    },
    {
      id: '504f4d91-02ea-4693-bb9a-993614a55f03',
      organization_id: LOCALITO_ORG_ID,
      name: 'Admin LOCALITO',
      username: 'admin_localito',
      email: 'admin@localito.reisbloc.com',
      role: 'admin',
      active: true
    },
    {
      id: '1b3095d9-e8b2-44da-bbff-6ff57bb30960',
      organization_id: LOCALITO_ORG_ID,
      name: 'airproject360',
      username: 'airproject360',
      email: 'airproject360@gmail.com',
      role: 'admin',
      active: true
    }
  ]

  for (const usr of adminUsers) {
    const { data, error } = await supabase
      .from('users')
      .upsert(usr)
      .select()

    if (error) {
      console.error(`Error al sincronizar ${usr.email} (${usr.id}):`, error)
    } else {
      console.log(`✅ Sincronizado ${usr.email} (${usr.id}):`, data[0]?.id)
    }
  }
}

syncAllAdmins()
