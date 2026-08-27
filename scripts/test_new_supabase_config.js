import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testSupabaseOperations() {
  console.log('--- TEST 1: Insertar Orden ---')
  const testOrder = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    items: [{ id: 'prod-beb-coca', productName: 'Coca-Cola 600ml', quantity: 1, unitPrice: 35 }],
    status: 'sent',
    subtotal: 35,
    total: 35,
    notes: 'Prueba Config'
  }
  const { data: ordData, error: ordErr } = await supabase.from('orders').insert([testOrder]).select()
  console.log('Orders insert result:', { success: !ordErr, id: ordData?.[0]?.id, error: ordErr?.message })
  if (ordData?.[0]?.id) {
    await supabase.from('orders').delete().eq('id', ordData[0].id)
  }

  console.log('--- TEST 2: Insertar Venta ---')
  const testSale = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    total: 35,
    payment_method: 'cash'
  }
  const { data: saleData, error: saleErr } = await supabase.from('sales').insert([testSale]).select()
  console.log('Sales insert result:', { success: !saleErr, error: saleErr?.message })

  console.log('--- TEST 3: Obtener Usuarios ---')
  const { data: usersData, error: usersErr } = await supabase.from('users').select('*').eq('organization_id', LOCALITO_ORG_ID)
  console.log('Users count:', usersData?.length, 'Users:', usersData?.map(u => ({ username: u.username, email: u.email, role: u.role })), 'Error:', usersErr?.message)

  console.log('--- TEST 4: Obtener Audit Logs ---')
  const { data: logsData, error: logsErr } = await supabase.from('audit_logs').select('*').limit(5)
  console.log('Audit logs count:', logsData?.length, 'Error:', logsErr?.message)
}

testSupabaseOperations()
