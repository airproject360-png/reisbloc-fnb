import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function testAnonOperations() {
  console.log('--- TEST 1: Anon Insert Order ---')
  const testOrder = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    items: [{ id: 'prod-beb-coca', productName: 'Coca-Cola 600ml', quantity: 1, unitPrice: 35 }],
    status: 'sent',
    subtotal: 35,
    total: 35,
    notes: 'Prueba Anon'
  }
  const { data: ordData, error: ordErr } = await supabase.from('orders').insert([testOrder]).select()
  console.log('Orders anon result:', { success: !ordErr, id: ordData?.[0]?.id, error: ordErr?.message })
  if (ordData?.[0]?.id) {
    await supabase.from('orders').delete().eq('id', ordData[0].id)
  }

  console.log('--- TEST 2: Anon Insert Sale ---')
  const testSale = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    total: 35,
    payment_method: 'cash'
  }
  const { data: saleData, error: saleErr } = await supabase.from('sales').insert([testSale]).select()
  console.log('Sales anon result:', { success: !saleErr, error: saleErr?.message })

  console.log('--- TEST 3: Anon Fetch Products ---')
  const { data: prodsData, error: prodsErr } = await supabase.from('products').select('*').eq('organization_id', LOCALITO_ORG_ID)
  console.log('Products count:', prodsData?.length, 'Error:', prodsErr?.message)
}

testAnonOperations()
