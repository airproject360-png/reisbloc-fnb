/**
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * 
 * THIS SCRIPT USES A SERVICE ROLE KEY WHICH HAS FULL DATABASE ACCESS.
 * Never expose service_role keys in client-side code or public repositories.
 * 
 * THIS SCRIPT IS FOR ADMINISTRATIVE PURPOSES ONLY.
 * 
 ***

 * Usage: 
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node seed_localito_supabase.js
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

async function seedLocalitoTenant() {
  console.log('🚀 CONFIGURANDO TENANT MULTI-TENANT PARA LOCALITO EN SUPABASE...')

  // 1. Obtener o Crear la Organización "LOCALITO"
  let { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', 'localito')
    .maybeSingle()

  if (orgError) {
    console.error('❌ Error buscando organización localito:', orgError)
    return
  }

  if (!org) {
    console.log('➕ Creando nueva organización "LOCALITO - Guisos & Barra Fría"...')
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: 'LOCALITO - Guisos & Barra Fría',
          slug: 'localito',
          logo_url: '/logo_localito.jpg',
          active: true,
        },
      ])
      .select()
      .single()

    if (createOrgError) {
      console.error('❌ Error creando organización:', createOrgError)
      return
    }
    org = newOrg
  }

  console.log(`✅ Organización LOCALITO activa (ID: ${org.id})`)

  // 2. Crear o actualizar Usuario Admin de LOCALITO
  const adminEmail = 'admin@localito.reisbloc.com'
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', org.id)
    .eq('email', adminEmail)
    .maybeSingle()

  if (!existingUser) {
    console.log('👤 Registrando usuario Admin para LOCALITO...')
    const { error: createUserError } = await supabase.from('users').insert([
      {
        organization_id: org.id,
        name: 'Admin LOCALITO',
        username: 'admin_localito',
        email: adminEmail,
        pin: '1234',
        role: 'admin',
        active: true,
      },
    ])
    if (createUserError) {
      console.error('⚠️ Warning registrando usuario:', createUserError.message)
    } else {
      console.log('✅ Usuario Admin registrado exitosamente (PIN: 1234)')
    }
  }

  // Inspect products table columns
  const { data: sampleProduct } = await supabase.from('products').select('*').limit(1)
  if (sampleProduct && sampleProduct.length > 0) {
    console.log('📋 Columnas existentes en tabla products:', Object.keys(sampleProduct[0]))
  }

  // 3. Insertar productos del catálogo LOCALITO bajo org.id
  const localitoProducts = [
    {
      organization_id: org.id,
      name: 'Cazuela de Guisado del Día con Arroz y Frijoles',
      category: 'Guisos',
      price: 125,
      available: true,
      has_inventory: true,
      current_stock: 50,
      minimum_stock: 10,
    },
    {
      organization_id: org.id,
      name: 'Tacos de Guisado Fiesteros (Orden de 3)',
      category: 'Guisos',
      price: 110,
      available: true,
      has_inventory: true,
      current_stock: 60,
      minimum_stock: 10,
    },
    {
      organization_id: org.id,
      name: 'Ceviche Fresco de Barra Fría con Totopos',
      category: 'Barra Fría',
      price: 145,
      available: true,
      has_inventory: true,
      current_stock: 40,
      minimum_stock: 5,
    },
    {
      organization_id: org.id,
      name: 'Ensalada Barra Fría con Pollo a las Hierbas',
      category: 'Barra Fría',
      price: 130,
      available: true,
      has_inventory: true,
      current_stock: 40,
      minimum_stock: 5,
    },
    {
      organization_id: org.id,
      name: 'Chilaquiles Verdes o Rojos con Pollo',
      category: 'Desayunos',
      price: 135,
      available: true,
      has_inventory: true,
      current_stock: 50,
      minimum_stock: 10,
    },
    {
      organization_id: org.id,
      name: 'Baguette de Arrachera al Chimichurri',
      category: 'Comidas',
      price: 155,
      available: true,
      has_inventory: true,
      current_stock: 35,
      minimum_stock: 5,
    },
    {
      organization_id: org.id,
      name: 'Agua Fresca Natural de Horchata / Jamaica (1L)',
      category: 'Bebidas',
      price: 45,
      available: true,
      has_inventory: true,
      current_stock: 80,
      minimum_stock: 15,
    },
  ]

  console.log('📦 Insertando platillos y bebidas en catálogo exclusivo de LOCALITO...')
  for (const prod of localitoProducts) {
    const { data: existingProd } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', org.id)
      .eq('name', prod.name)
      .maybeSingle()

    if (!existingProd) {
      const { error: insertProdErr } = await supabase.from('products').insert([prod])
      if (insertProdErr) {
        console.error(`⚠️ Error insertando ${prod.name}:`, insertProdErr.message)
      } else {
        console.log(`  ✓ Platillo agregado: ${prod.name}`)
      }
    } else {
      console.log(`  - Platillo ya existente: ${prod.name}`)
    }
  }


  console.log('\n===========================================================')
  console.log('🎉 TENANT LOCALITO CONFIGURADO Y AISLADO EN SUPABASE NUBE')
  console.log(`ORGANIZATION_ID: ${org.id}`)
  console.log('===========================================================\n')

  return org.id
}

seedLocalitoTenant()
