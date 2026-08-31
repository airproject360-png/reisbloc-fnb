/**
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * 
 * THIS SCRIPT USES A SERVICE ROLE KEY WHICH HAS FULL DATABASE ACCESS.
 * Never expose service_role keys in client-side code or public repositories.
 * 
 * THIS SCRIPT IS FOR TESTING PURPOSES ONLY.
 * 
 * Usage: 
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node test_create_user.js
 * 
 * Or set the key in your .env.local file (ensure .env.local is in .gitignore).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
// ⚠️ SERVICE_ROLE_KEY should be set via environment variable for security
// Fallback to hardcoded key only for local development (NOT for production)
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ WARNING: Using fallback SERVICE_ROLE_KEY - set SUPABASE_SERVICE_ROLE_KEY env var for production use!')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function testUserInsert() {
  console.log('🧪 Probando inserción directa en tabla users...')

  const { data, error } = await supabase
    .from('users')
    .insert({
      organization_id: LOCALITO_ORG_ID,
      name: 'Test Staff',
      username: 'teststaff',
      email: 'teststaff@localito.reisbloc.com',
      role: 'capitan',
      active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('❌ Error inserción directa:', error)
  } else {
    console.log('✅ Inserción directa exitosa. ID:', data.id)
    await supabase.from('users').delete().eq('id', data.id)
    console.log('🧹 Usuario de prueba eliminado.')
  }
}

testUserInsert()
