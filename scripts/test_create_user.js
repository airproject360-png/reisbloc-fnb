import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function testUserInsert() {
  console.log('🧪 Probando inserción directa en tabla users...')

  const { data, error } = await supabase
    .from('users')
    .insert({
      organization_id: LOCALITO_ORG_ID,
      name: 'Test Staff',
      username: 'teststaff',
      email: 'teststaff@localito.reisbloc.com',
      role: 'capitan',
      active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('❌ Error inserción directa:', error)
  } else {
    console.log('✅ Inserción directa exitosa. ID:', data.id)
    await supabase.from('users').delete().eq('id', data.id)
    console.log('🧹 Usuario de prueba eliminado.')
  }
}

testUserInsert()
