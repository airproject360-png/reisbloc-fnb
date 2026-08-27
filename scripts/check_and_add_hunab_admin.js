import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkAndAddHunabAdmin() {
  const email = 'hunab.arredondo@gmail.com'
  const username = 'hunab'

  console.log(`🔍 Buscando usuario '${email}' en la base de datos...`)
  const { data: existing, error: errFetch } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', LOCALITO_ORG_ID)
    .or(`email.eq.${email},username.eq.${username}`)

  if (errFetch) {
    console.error('Error al buscar usuario:', errFetch)
    return
  }

  if (existing && existing.length > 0) {
    console.log(`✅ Usuario '${email}' encontrado:`, existing[0])
    // Asegurar que tenga rol admin y esté activo
    const { data: updated, error: errUpdate } = await supabase
      .from('users')
      .update({
        role: 'admin',
        active: true,
        email: email,
        name: 'Hunab Arredondo'
      })
      .eq('id', existing[0].id)
      .select()

    if (errUpdate) {
      console.error('Error al actualizar permisos de Hunab:', errUpdate)
    } else {
      console.log('👑 Permisos de Hunab verificados y actualizados a ADMIN:', updated[0])
    }
  } else {
    console.log(`➕ Usuario '${email}' no existía. Creándolo como ADMIN...`)
    const { data: created, error: errCreate } = await supabase
      .from('users')
      .insert({
        organization_id: LOCALITO_ORG_ID,
        name: 'Hunab Arredondo',
        username: username,
        email: email,
        role: 'admin',
        active: true
      })
      .select()

    if (errCreate) {
      console.error('Error al crear usuario Hunab:', errCreate)
    } else {
      console.log('✅ Usuario Hunab creado exitosamente como ADMIN:', created[0])
    }
  }
}

checkAndAddHunabAdmin()
