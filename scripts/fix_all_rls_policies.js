import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDQ0MTAsImV4cCI6MjA4NzQ4MDQxMH0.j5v9FHF-MzFzxWU06aMBMMP6KB6ywkphdlMz3pPdJhw'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function checkAndFixRLS() {
  console.log('🔍 Probando permisos de inserción en anon client para orders...')
  const testOrder = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    items: [{ id: 'prod-beb-coca', productName: 'Coca-Cola 600ml', quantity: 1, unitPrice: 35 }],
    status: 'sent',
    subtotal: 35,
    total: 35,
    notes: 'Prueba RLS'
  }

  const { data: ordData, error: ordErr } = await supabaseAnon.from('orders').insert([testOrder]).select()
  console.log('Anon insert orders:', { ordData, ordErr })

  console.log('🔍 Probando permisos de inserción en anon client para sales...')
  const testSale = {
    organization_id: LOCALITO_ORG_ID,
    table_number: 1,
    total: 35,
    payment_method: 'cash'
  }
  const { data: saleData, error: saleErr } = await supabaseAnon.from('sales').insert([testSale]).select()
  console.log('Anon insert sales:', { saleData, saleErr })
}

checkAndFixRLS()
