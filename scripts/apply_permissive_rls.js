import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function applyRLS() {
  console.log('⚡ Habilitando acceso RLS universal para la base de datos de LOCALITO...')

  const sqlStatements = [
    `ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.sales DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.ingredients DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.recipes DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.daily_closes DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS public.devices DISABLE ROW LEVEL SECURITY;`
  ]

  for (const sql of sqlStatements) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
      if (error) {
        console.log(`RPC exec_sql error for '${sql}':`, error.message)
      } else {
        console.log(`✅ SQL Executed: ${sql}`)
      }
    } catch (err) {
      console.log(`Catch error executing SQL:`, err)
    }
  }
}

applyRLS()
