import axios from 'axios'

async function testManagementAPI() {
  const query = `
    ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.daily_closes DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.devices DISABLE ROW LEVEL SECURITY;
  `

  console.log('Sending SQL DDL query to Supabase Management API...')
}

testManagementAPI()
