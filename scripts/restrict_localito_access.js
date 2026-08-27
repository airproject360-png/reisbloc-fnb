import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function restrictAccessToOwnerOnly() {
  console.log('🔒 RESTRINGIENDO ACCESO EN SUPABASE NUBE ÚNICAMENTE AL PROPIETARIO...')

  const allowedEmails = ['airproject360@gmail.com', 'admin@localito.reisbloc.com']

  const { data: users, error: fetchErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('organization_id', LOCALITO_ORG_ID)

  if (fetchErr) {
    console.error('❌ Error obteniendo usuarios:', fetchErr)
    return
  }

  for (const user of users || []) {
    if (!allowedEmails.includes(user.email)) {
      console.log(`🗑️ Eliminando acceso no autorizado para: ${user.email}`)
      await supabase.from('users').delete().eq('id', user.id)
    }
  }

  console.log('✅ ACCESO EXCLUSIVO CONFIGURADO. Solo airproject360@gmail.com y admin@localito.reisbloc.com tienen acceso.')
}

restrictAccessToOwnerOnly()
