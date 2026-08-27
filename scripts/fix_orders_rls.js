import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function fixRLS() {
  console.log('🔓 Verificando políticas RLS para la tabla orders...')
  // Insert with service role key works without RLS restrictions
  const testPayload = {
    organization_id: '1a70643e-23a3-4224-939e-d7daf381c083',
    table_number: 1,
    items: [{ id: 'test', productName: 'Test', quantity: 1, unitPrice: 10 }],
    status: 'sent',
    subtotal: 10,
    total: 10
  }
  const { data, error } = await supabase.from('orders').insert([testPayload]).select()
  if (error) {
    console.error('Error inserting with service role:', error)
  } else {
    console.log('✅ Service role insertion successful:', data[0].id)
    await supabase.from('orders').delete().eq('id', data[0].id)
  }
}

fixRLS()
