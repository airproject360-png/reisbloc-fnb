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

async function upsertAppUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
  email: string,
  role: InviteRole,
) {
  const baseUserPayload = {
    organization_id: orgId,
    name: email.split('@')[0],
    username: email.split('@')[0],
    email,
    role,
    active: true,
    auth_provider: 'google',
  }

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', email)
    .maybeSingle()

  if (existingUserError) throw existingUserError

  if (existingUser?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        ...baseUserPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)

    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabaseAdmin.from('users').insert([
    {
      ...baseUserPayload,
      pin: null,
    },
  ])

  if (insertError) throw insertError
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

function buildRedirectUrl(appUrlRaw: string | null | undefined) {
  const fallback = 'https://reisbloc-fnb.vercel.app'
  const base = String(appUrlRaw || '').trim() || fallback
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  return `${normalized}/auth/callback`
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
    .or(`id.eq.${caller.id},email.eq.${callerEmail}`)
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
  const organizationSlug = String(body.organizationSlug || '').trim().toLowerCase()
  const expiresInHours = Math.max(1, Math.min(Number(body.expiresInHours || 48), 168))
  const appUrl = String(body.appUrl || req.headers.get('origin') || '').trim()

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return response({ error: 'Invalid email address' }, 400)
  }

  let org: { id: string; name: string; slug: string } | null = null

  if (organizationSlug) {
    const { data: orgBySlug } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', organizationSlug)
      .maybeSingle()

    if (orgBySlug) org = orgBySlug
  }

  if (!org) {
    const { data: orgById, error: orgByIdError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('id', callerAppUser.organization_id)
      .maybeSingle()

    if (orgByIdError) {
      return response({ error: orgByIdError.message }, 500)
    }

    org = orgById
  }

  if (!org) {
    return response({ error: 'Organization not found for current admin user' }, 404)
  }

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
  const redirectTo = buildRedirectUrl(appUrl)

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(rawEmail, {
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
    const inviteErrorMessage = String(inviteError.message || '')
    const normalizedInviteError = inviteErrorMessage.toLowerCase()
    const canContinueWithoutEmail =
      normalizedInviteError.includes('already been registered') ||
      normalizedInviteError.includes('email rate limit exceeded')

    if (canContinueWithoutEmail) {
      try {
        await upsertAppUser(supabaseAdmin, org.id, rawEmail, role)
      } catch (upsertError: any) {
        await writeInviteAudit(
          supabaseAdmin,
          callerAppUser.organization_id,
          callerAppUser.id,
          requestIp,
          rawEmail,
          role,
          true,
          `upsert_error: ${upsertError?.message || 'unknown error'}`,
        )

        return response({ error: upsertError?.message || 'Failed to provision user record' }, 500)
      }

      await writeInviteAudit(
        supabaseAdmin,
        callerAppUser.organization_id,
        callerAppUser.id,
        requestIp,
        rawEmail,
        role,
        false,
        `invite_warning: ${inviteErrorMessage}`,
      )

      return response({
        success: true,
        message: 'Usuario habilitado. Si no llega correo, puede entrar con Google usando ese email.',
        email: rawEmail,
        role,
        expiresAt,
        redirectTo,
        emailDelivery: 'deferred',
        organization: {
          id: org.id,
          slug: org.slug,
          name: org.name,
        },
      })
    }

    await writeInviteAudit(
      supabaseAdmin,
      callerAppUser.organization_id,
      callerAppUser.id,
      requestIp,
      rawEmail,
      role,
      true,
      `invite_error: ${inviteErrorMessage}`,
    )

    return response({ error: inviteErrorMessage, redirectTo }, 400)
  }

  try {
    await upsertAppUser(supabaseAdmin, org.id, rawEmail, role)
  } catch (upsertError: any) {
    return response({ error: upsertError?.message || 'Failed to provision user record' }, 500)
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
