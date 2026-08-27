import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'

const supabase = createClient(SUPABASE_URL, ANON_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function testInsertOrder() {
  const payload = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    items: [{ id: 'prod-beb-coca', productName: 'Coca-Cola 600ml', quantity: 1, unitPrice: 35 }],
    status: 'sent',
    created_at: new Date().toISOString(),
    subtotal: 35,
    total: 35,
    notes: '🍽️ Comida'
  }

  const { data, error } = await supabase.from('orders').insert([payload]).select()
  if (error) {
    console.error('❌ Insert Error:', error)
  } else {
    console.log('✅ SUCCESS! Order inserted:', data)
  }
}

testInsertOrder()
