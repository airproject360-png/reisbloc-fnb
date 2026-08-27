import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function inspectTables() {
  console.log('🔍 Inspeccionando tablas en Supabase...')

  const { data: products, error: pErr } = await supabase.from('products').select('*').limit(5)
  console.log('Productos muestra:', pErr ? pErr.message : products?.length)

  const { data: ingredients, error: iErr } = await supabase.from('ingredients').select('*').limit(5)
  console.log('Insumos muestra:', iErr ? iErr.message : ingredients?.length)

  const { data: recipes, error: rErr } = await supabase.from('recipes').select('*').limit(5)
  console.log('Recetas muestra:', rErr ? rErr.message : recipes?.length)
}

inspectTables()
