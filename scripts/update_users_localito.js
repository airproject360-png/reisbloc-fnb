import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function updateUsersForLocalito() {
  console.log('🚀 ASIGNANDO ACCESOS Y USUARIOS ADMIN A TENANT LOCALITO EN SUPABASE...')

  const emailsToAuthorize = [
    'darredondo830@gmail.com',
    'airproject360@gmail.com',
    'lic.garciagarciaoctavio@gmail.com',
    'admin@localito.reisbloc.com'
  ]

  for (const email of emailsToAuthorize) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', LOCALITO_ORG_ID)
      .eq('email', email)
      .maybeSingle()

    if (!existingUser) {
      console.log(`➕ Registrando acceso Admin LOCALITO para email: ${email}`)
      const { error } = await supabase.from('users').insert([
        {
          organization_id: LOCALITO_ORG_ID,
          name: email.split('@')[0],
          username: email.split('@')[0],
          email: email,
          pin: '1234',
          role: 'admin',
          active: true
        }
      ])
      if (error) {
        console.error(`⚠️ Error agregando ${email}:`, error.message)
      } else {
        console.log(`  ✓ Acceso concedido a ${email}`)
      }
    } else {
      console.log(`  - Usuario ${email} ya existe en LOCALITO tenant`)
    }
  }

  console.log('✅ Todos los emails autorizados para LOCALITO tenant.')
}

updateUsersForLocalito()
