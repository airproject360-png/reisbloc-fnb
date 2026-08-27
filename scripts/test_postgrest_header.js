import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, ANON_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

console.log('Postgrest object exists?', Boolean(supabase.postgrest))
console.log('Postgrest headers before:', supabase.postgrest?.headers)

// Inyectar service role key o JWT en postgrest headers
if (supabase.postgrest) {
  supabase.postgrest.headers['Authorization'] = `Bearer ${SERVICE_ROLE_KEY}`
}

async function testInsert() {
  const testOrder = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    items: [{ id: 'prod-beb-coca', productName: 'Coca-Cola 600ml', quantity: 1, unitPrice: 35 }],
    status: 'sent',
    subtotal: 35,
    total: 35,
    notes: 'Prueba Postgrest Authorization Header'
  }

  const { data, error } = await supabase.from('orders').insert([testOrder]).select()
  if (error) {
    console.error('❌ Insert Error with injected Postgrest header:', error)
  } else {
    console.log('✅ SUCCESS! Injected Postgrest header authorized order creation:', data[0].id)
    await supabase.from('orders').delete().eq('id', data[0].id)
  }
}

testInsert()
