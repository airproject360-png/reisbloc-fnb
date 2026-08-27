import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function testValidOrder() {
  // Get a valid user ID from users table
  const { data: user } = await supabase.from('users').select('id').eq('organization_id', LOCALITO_ORG_ID).limit(1).single()

  const payload = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    items: [{ id: 'prod-beb-coca', productName: 'Coca-Cola 600ml', quantity: 1, unitPrice: 35 }],
    status: 'sent',
    waiter_id: user ? user.id : null,
    created_at: new Date().toISOString(),
    subtotal: 35,
    total: 35,
    notes: '🍽️ Comida'
  }

  const { data, error } = await supabase.from('orders').insert([payload]).select()
  if (error) {
    console.error('❌ Insert Error:', error)
  } else {
    console.log('✅ SUCCESS! Order created perfectly:', data)
  }
}

testValidOrder()
