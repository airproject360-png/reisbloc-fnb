/**
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * 
 * THIS SCRIPT USES A SERVICE ROLE KEY WHICH HAS FULL DATABASE ACCESS.
 * Never expose service_role keys in client-side code or commit them to repositories.
 * 
 * THIS SCRIPT SHOULD ONLY BE RUN ONCE in a trusted environment (local dev),
 * and only after backing up your database. It restricts users in the LOCALITO org
 * to only the two authorized emails.
 * 
 * RECOMMENDATION: Instead of running this script, use Supabase Dashboard > SQL Editor
 * to set up Row Level Security (RLS) policies properly. This script is kept for
 * reference only and should be removed from client repositories.
 * 
 * Uso: node restrict_localito_access.js  (solo en entorno local confiable, con backup)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htjhzdtlvdbtlfdhsydq.supabase.co'
/** @warning SERVICE_ROLE_KEY NUNCA debe exponerse en cliente ni repositorios públicos */
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0amh6ZHRsdmRidGxmZGhzeWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDQxMCwiZXhwIjoyMDg3NDgwNDEwfQ.RMl4RQ5dbzQgm49hI8dLH0RNcw7PrVm-BVFzhZ_j8hA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const LOCALITO_ORG_ID = '1a70643e-23a3-4224-939e-d7daf381c083'

async function restrictAccessToOwnerOnly() {
  console.log('🔒 RESTRINGIENDO ACCESO EN SUPABASE NÚMERO ÚNICAMENTE AL PROPIETARIO...')

  const allowedEmails = ['airproject360@gmail.com', 'admin@localito.reisbloc.com']

  const { data: users, error: fetchErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('organization_id', LOCALITO_ORG_ID)

  if (fetchErr) {
    console.error('❌ Error obteniendo usuarios:', fetchErr)
    return
  }

  for (const user of users || []) {
    if (!allowedEmails.includes(user.email)) {
      console.log(`🗑️ Eliminando acceso no autorizado para: ${user.email}`)
      await supabase.from('users').delete().eq('id', user.id)
    }
  }

  console.log('✅ ACCESO EXCLUSIVO CONFIGURADO. Solo airproject360@gmail.com y admin@localito.reisbloc.com tienen acceso.')
}

console.log('⚠️ Ejecutando restrict_localito_access.js - Script de restricción de acceso a tenant LOCALITO')
console.log('⚠️ Asegúrate de tener backup de base de datos antes de continuar.')
console.log('⚠️ Este script usa service_role key - NO ejecutar en producción sin supervisión.')

restrictAccessToOwnerOnly()
