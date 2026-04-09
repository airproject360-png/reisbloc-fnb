import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type InviteRole = 'admin' | 'supervisor'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return response({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return response({ error: 'Missing Supabase env vars' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return response({ error: 'Missing authorization header' }, 401)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser()

  if (callerError || !caller) {
    return response({ error: 'Unauthorized caller' }, 401)
  }

  const callerEmail = String(caller.email || '').toLowerCase()
  const { data: callerAppUser, error: callerRoleError } = await supabaseAdmin
    .from('users')
    .select('id, role, organization_id')
    .or(`auth_id.eq.${caller.id},email.eq.${callerEmail}`)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (callerRoleError) {
    return response({ error: callerRoleError.message }, 500)
  }

  if (!callerAppUser || callerAppUser.role !== 'admin') {
    return response({ error: 'Only admin can invite users' }, 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return response({ error: 'Invalid request body' }, 400)
  }

  const rawEmail = String(body.email || '').trim().toLowerCase()
  const role: InviteRole = body.role === 'admin' ? 'admin' : 'supervisor'
  const organizationSlug = String(body.organizationSlug || 'evento').trim().toLowerCase()
  const expiresInHours = Math.max(1, Math.min(Number(body.expiresInHours || 48), 168))

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return response({ error: 'Invalid email address' }, 400)
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', organizationSlug)
    .single()

  if (orgError || !org) {
    return response({ error: `Organization ${organizationSlug} not found` }, 404)
  }

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
  const redirectTo = `${req.headers.get('origin') || 'http://localhost:5173'}/auth/callback`

  const { data: invitedData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(rawEmail, {
    redirectTo,
    data: {
      role,
      organization_id: org.id,
      organization_slug: org.slug,
      invite_expires_at: expiresAt,
      invited_by: caller.id,
    },
  })

  if (inviteError) {
    return response({ error: inviteError.message }, 400)
  }

  const authUserId = invitedData.user?.id

  const baseUserPayload = {
    organization_id: org.id,
    name: rawEmail.split('@')[0],
    username: rawEmail.split('@')[0],
    email: rawEmail,
    role,
    active: true,
    auth_provider: 'google',
  }

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('organization_id', org.id)
    .eq('email', rawEmail)
    .maybeSingle()

  if (existingUserError) {
    return response({ error: existingUserError.message }, 500)
  }

  if (existingUser?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        ...baseUserPayload,
        auth_id: authUserId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)

    if (updateError) {
      return response({ error: updateError.message }, 500)
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from('users').insert([
      {
        ...baseUserPayload,
        auth_id: authUserId || null,
        pin: null,
      },
    ])

    if (insertError) {
      return response({ error: insertError.message }, 500)
    }
  }

  return response({
    success: true,
    message: 'Invitation sent successfully',
    email: rawEmail,
    role,
    expiresAt,
    organization: {
      id: org.id,
      slug: org.slug,
      name: org.name,
    },
  })
})
