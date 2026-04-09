import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type InviteRole = 'admin' | 'supervisor'

const MAX_INVITES_PER_IP_PER_MINUTE = 6
const MAX_INVITES_PER_IP_PER_HOUR = 25

const isoNow = () => new Date().toISOString()
const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString()

async function getRecentAuditCount(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
  userId: string | null,
  ipAddress: string | null,
  sinceIso: string
) {
  let query = supabaseAdmin
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('action', 'INVITE_SENT')
    .gte('created_at', sinceIso)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (ipAddress) {
    query = query.eq('ip_address', ipAddress)
  }

  const { count, error } = await query
  if (error) {
    return { count: 0, error }
  }

  return { count: count || 0, error: null }
}

async function writeInviteAudit(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
  userId: string,
  ipAddress: string | null,
  email: string,
  role: InviteRole,
  blocked: boolean,
  reason?: string
) {
  const payload = {
    organization_id: orgId,
    user_id: userId,
    action: blocked ? 'INVITE_BLOCKED' : 'INVITE_SENT',
    table_name: 'users',
    record_id: email,
    changes: {
      email,
      role,
      blocked,
      reason: reason || null,
      created_at: isoNow(),
    },
    ip_address: ipAddress,
  }

  await supabaseAdmin.from('audit_logs').insert([payload])
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return null
}

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

  // Anti-abuse: cap invite bursts per IP/minute and IP/hour
  const requestIp = getClientIp(req)

  const perMinuteWindow = isoMinutesAgo(1)
  const { count: ipPerMinuteCount, error: ipPerMinuteError } = await getRecentAuditCount(
    supabaseAdmin,
    callerAppUser.organization_id,
    null,
    requestIp,
    perMinuteWindow,
  )

  if (ipPerMinuteError) {
    return response({ error: ipPerMinuteError.message }, 500)
  }

  if (ipPerMinuteCount >= MAX_INVITES_PER_IP_PER_MINUTE) {
    await writeInviteAudit(
      supabaseAdmin,
      callerAppUser.organization_id,
      callerAppUser.id,
      requestIp,
      'rate-limit',
      'supervisor',
      true,
      `max ${MAX_INVITES_PER_IP_PER_MINUTE} invites/min reached for IP`,
    )

    return response(
      { error: `Rate limit reached for IP. Max ${MAX_INVITES_PER_IP_PER_MINUTE} invitaciones por minuto.` },
      429,
    )
  }

  const perHourWindow = isoMinutesAgo(60)
  const { count: ipPerHourCount, error: ipPerHourError } = await getRecentAuditCount(
    supabaseAdmin,
    callerAppUser.organization_id,
    null,
    requestIp,
    perHourWindow,
  )

  if (ipPerHourError) {
    return response({ error: ipPerHourError.message }, 500)
  }

  if (ipPerHourCount >= MAX_INVITES_PER_IP_PER_HOUR) {
    await writeInviteAudit(
      supabaseAdmin,
      callerAppUser.organization_id,
      callerAppUser.id,
      requestIp,
      'burst-limit',
      'supervisor',
      true,
      `max ${MAX_INVITES_PER_IP_PER_HOUR} invites/hour reached for IP`,
    )

    return response(
      { error: `Rate limit reached for IP. Max ${MAX_INVITES_PER_IP_PER_HOUR} invitaciones por hora.` },
      429,
    )
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

  await writeInviteAudit(
    supabaseAdmin,
    callerAppUser.organization_id,
    callerAppUser.id,
    requestIp,
    rawEmail,
    role,
    false,
  )

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
