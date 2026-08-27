import axios from 'axios'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

async function testSQLRest() {
  const endpoints = [
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    `${SUPABASE_URL}/pg`,
    `${SUPABASE_URL}/query`
  ]

  for (const ep of endpoints) {
    try {
      const res = await axios.post(ep, { query: 'SELECT 1;' }, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      console.log(`Endpoint ${ep} success:`, res.data)
    } catch (e) {
      console.log(`Endpoint ${ep} failed:`, e.response?.status, e.response?.data || e.message)
    }
  }
}

testSQLRest()
