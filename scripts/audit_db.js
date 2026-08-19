import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function auditDatabase() {
  console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE BASE DE DATOS SUPABASE (htjhzdtlvdbtlfdhsydq)...')
  
  const tables = ['organizations', 'users', 'products', 'categories', 'orders', 'sales', 'closings', 'audit_logs', 'devices']
  const report = {}

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(10)

      if (error) {
        report[table] = { status: 'ERROR', message: error.message, code: error.code }
      } else {
        report[table] = { status: 'OK', count: count || data?.length || 0, sample: data }
      }
    } catch (e) {
      report[table] = { status: 'EXCEPTION', message: e.message }
    }
  }

  console.log('\n=================== INFORME DE AUDITORÍA ===================')
  console.log(JSON.stringify(report, null, 2))
  console.log('===========================================================\n')
}

auditDatabase()
