import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function testUserInsert() {
  console.log('--- PROBANDO INSERCIÓN ANON ---')
  const { data: d1, error: e1 } = await supabaseAnon.from('users').insert({
    organization_id: LOCALITO_ORG_ID,
    name: 'Admin Localito',
    username: 'adminlocalito',
    email: 'adminlocalito@gmail.com',
    role: 'admin',
    active: true
  }).select()
  console.log('Anon insert result:', { data: d1, error: e1 })

  console.log('--- PROBANDO INSERCIÓN SERVICE ROLE ---')
  const { data: d2, error: e2 } = await supabaseAdmin.from('users').insert({
    organization_id: LOCALITO_ORG_ID,
    name: 'Admin Localito',
    username: 'adminlocalito',
    email: 'adminlocalito@gmail.com',
    role: 'admin',
    active: true
  }).select()
  console.log('Service role insert result:', { data: d2, error: e2 })
}

testUserInsert()
