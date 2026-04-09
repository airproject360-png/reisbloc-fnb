-- ============================================================
-- Reisbloc POS - Esquema de Base de Datos
-- Version: 3.2.1
-- Sistema Multi-Tenant para Restaurantes
-- ============================================================

-- ============================================================
-- LIMPIEZA SEGURA: Eliminar políticas RLS antiguas (idempotente)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations CASCADE;
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users CASCADE;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON public.users CASCADE;
DROP POLICY IF EXISTS "Users can view devices in their organization" ON public.devices CASCADE;
DROP POLICY IF EXISTS "Users can manage their own devices" ON public.devices CASCADE;
DROP POLICY IF EXISTS "Admins can manage all devices in their organization" ON public.devices CASCADE;
DROP POLICY IF EXISTS "Users can view products in their organization" ON public.products CASCADE;
DROP POLICY IF EXISTS "Admins can manage products in their organization" ON public.products CASCADE;
DROP POLICY IF EXISTS "Users can view orders in their organization" ON public.orders CASCADE;
DROP POLICY IF EXISTS "Staff can create and update orders in their organization" ON public.orders CASCADE;
DROP POLICY IF EXISTS "Users can view sales in their organization" ON public.sales CASCADE;
DROP POLICY IF EXISTS "Staff can create sales in their organization" ON public.sales CASCADE;
DROP POLICY IF EXISTS "Users can view closings in their organization" ON public.closings CASCADE;
DROP POLICY IF EXISTS "Admins can manage closings in their organization" ON public.closings CASCADE;
DROP POLICY IF EXISTS "Admins can view audit logs in their organization" ON public.audit_logs CASCADE;

-- ============================================================
-- SECCIÓN 1: TABLAS PRINCIPALES
-- ============================================================

-- ORGANIZACIONES (Tenant Root)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- USUARIOS (Vinculados a Organización)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name character varying,
  username text,
  email text,
  pin character varying,
  pin_hash character varying,
  auth_provider text DEFAULT 'pin',
  auth_id text,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['admin', 'capitan', 'mesero', 'cocina', 'bar', 'supervisor'])),
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- DISPOSITIVOS (Seguridad Física + Ubicación)
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  mac_address character varying UNIQUE,
  device_name character varying,
  fingerprint text,
  ip_address character varying,
  geolocation jsonb,
  device_type character varying,
  browser character varying,
  os character varying,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  is_approved boolean DEFAULT false,
  is_trusted boolean DEFAULT false,
  requires_2fa boolean DEFAULT false,
  last_access timestamp with time zone DEFAULT now(),
  last_ip_change timestamp with time zone,
  last_location_change timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  price numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  minimum_stock integer DEFAULT 0,
  has_inventory boolean DEFAULT true,
  available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ÓRDENES (Operación en Vivo)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_number integer NOT NULL,
  waiter_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status character varying DEFAULT 'pending',
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  total numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- VENTAS (Histórico Financiero)
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  waiter_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  table_number integer NOT NULL,
  total numeric NOT NULL,
  payment_method character varying NOT NULL,
  tip_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- CIERRES DE CAJA
CREATE TABLE IF NOT EXISTS public.closings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  total_sales numeric DEFAULT 0,
  total_cash numeric DEFAULT 0,
  total_card numeric DEFAULT 0,
  total_digital numeric DEFAULT 0,
  total_tips numeric DEFAULT 0,
  status character varying DEFAULT 'closed',
  created_at timestamp with time zone DEFAULT now()
);

-- LOGS DE AUDITORÍA
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action character varying NOT NULL,
  table_name character varying,
  record_id character varying,
  changes jsonb,
  ip_address character varying,
  created_at timestamp with time zone DEFAULT now()
);

-- SESIONES DE LOGIN (Auditoría de autenticación)
CREATE TABLE IF NOT EXISTS public.login_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  ip_address character varying NOT NULL,
  device_fingerprint text,
  geolocation jsonb,
  browser character varying,
  os character varying,
  auth_method character varying CHECK (auth_method IN ('pin', 'google_oauth', 'email')),
  requires_2fa boolean DEFAULT false,
  two_fa_verified boolean DEFAULT false,
  two_fa_method character varying,
  anomalies jsonb,
  access_token text,
  session_duration_minutes integer,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- ============================================================
-- SECCIÓN 2: ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_pin ON public.users(pin);
CREATE INDEX IF NOT EXISTS idx_devices_org ON public.devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_org ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_org ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_closings_org ON public.closings(organization_id);
CREATE INDEX IF NOT EXISTS idx_closings_date ON public.closings(date);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(organization_id);

-- ============================================================
-- SECCIÓN 3: FUNCIONES DE NEGOCIO
-- ============================================================

-- Función: Detectar Anomalías de Seguridad
CREATE OR REPLACE FUNCTION detect_security_anomalies(
  p_user_id uuid,
  p_org_id uuid,
  p_new_ip character varying,
  p_new_fingerprint text,
  p_new_location jsonb
) RETURNS json AS $$
DECLARE
  last_session RECORD;
  anomalies jsonb := '{}'::jsonb;
  requires_2fa boolean := false;
BEGIN
  -- Obtener último login
  SELECT * INTO last_session FROM public.login_sessions
  WHERE user_id = p_user_id AND organization_id = p_org_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  -- Detectar cambio de IP
  IF last_session IS NOT NULL AND last_session.ip_address != p_new_ip THEN
    anomalies := anomalies || '{"ip_change": true}'::jsonb;
    requires_2fa := true;
  END IF;

  -- Detectar cambio de dispositivo
  IF last_session IS NOT NULL AND last_session.device_fingerprint != p_new_fingerprint THEN
    anomalies := anomalies || '{"device_change": true}'::jsonb;
    requires_2fa := true;
  END IF;

  -- Detectar cambio de ubicación (país)
  IF last_session IS NOT NULL AND p_new_location IS NOT NULL THEN
    IF (last_session.geolocation->>'country') IS DISTINCT FROM (p_new_location->>'country') THEN
      anomalies := anomalies || '{"location_change": true}'::jsonb;
      requires_2fa := true;
    END IF;
  END IF;

  -- Verificar velocidad imposible (simplificado)
  IF last_session IS NOT NULL AND p_new_location IS NOT NULL THEN
    anomalies := anomalies || '{"velocity_check": false}'::jsonb;
  END IF;

  RETURN json_build_object(
    'anomalies', anomalies,
    'requires_2fa', requires_2fa,
    'is_new_device', (last_session IS NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Registrar Sesión de Login
CREATE OR REPLACE FUNCTION register_login_session(
  p_user_id uuid,
  p_org_id uuid,
  p_device_id uuid,
  p_ip_address character varying,
  p_fingerprint text,
  p_geolocation jsonb,
  p_auth_method character varying,
  p_anomalies jsonb,
  p_requires_2fa boolean
) RETURNS json AS $$
DECLARE
  new_session_id uuid;
  access_token text;
BEGIN
  new_session_id := gen_random_uuid();
  access_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.login_sessions (
    id,
    organization_id,
    user_id,
    device_id,
    ip_address,
    device_fingerprint,
    geolocation,
    auth_method,
    anomalies,
    requires_2fa,
    two_fa_verified,
    access_token,
    expires_at
  ) VALUES (
    new_session_id,
    p_org_id,
    p_user_id,
    p_device_id,
    p_ip_address,
    p_fingerprint,
    p_geolocation,
    p_auth_method,
    p_anomalies,
    p_requires_2fa,
    NOT p_requires_2fa,
    access_token,
    NOW() + INTERVAL '24 hours'
  );

  RETURN json_build_object(
    'session_id', new_session_id,
    'access_token', access_token,
    'requires_2fa', p_requires_2fa,
    'expires_at', NOW() + INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECCIÓN 4: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
-- ============================================================
-- FUNCIONES HELPER CON SECURITY DEFINER (Evitan recursión RLS)
-- ============================================================

-- ✅ CRITICAL FIX: Función para obtener org_id del usuario actual sin recursión
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- ✅ CRITICAL FIX: Función para verificar si usuario es admin sin recursión
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role = 'admin', false)
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- ✅ CRITICAL FIX: Función para verificar si usuario es admin o supervisor
CREATE OR REPLACE FUNCTION public.is_user_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role IN ('admin', 'supervisor'), false)
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para ORGANIZATIONS
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (id = public.get_current_user_org_id());

-- Políticas para USERS (✅ RECURSION FIX)
CREATE POLICY "Users can view users in their organization"
ON public.users FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Admins can manage users in their organization"
ON public.users FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin()
);

-- Políticas para DEVICES (✅ RECURSION FIX)
CREATE POLICY "Users can view devices in their organization"
ON public.devices FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Users can manage their own devices"
ON public.devices FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all devices in their organization"
ON public.devices FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin()
);

-- Políticas para PRODUCTS (✅ RECURSION FIX)
CREATE POLICY "Users can view products in their organization"
ON public.products FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Admins can manage products in their organization"
ON public.products FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin_or_supervisor()
);

-- Políticas para ORDERS (✅ RECURSION FIX)
CREATE POLICY "Users can view orders in their organization"
ON public.orders FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Staff can create and update orders in their organization"
ON public.orders FOR ALL
USING (organization_id = public.get_current_user_org_id());

-- Políticas para SALES (✅ RECURSION FIX)
CREATE POLICY "Users can view sales in their organization"
ON public.sales FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Staff can create sales in their organization"
ON public.sales FOR INSERT
WITH CHECK (organization_id = public.get_current_user_org_id());

-- Políticas para CLOSINGS (✅ RECURSION FIX)
CREATE POLICY "Users can view closings in their organization"
ON public.closings FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Admins can manage closings in their organization"
ON public.closings FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin_or_supervisor()
);

-- Políticas para AUDIT_LOGS (✅ RECURSION FIX)
CREATE POLICY "Admins can view audit logs in their organization"
ON public.audit_logs FOR SELECT
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin()
);

-- ============================================================
-- SECCIÓN 5: DATOS INICIALES DE DEMO
-- ============================================================

-- Crear organización de prueba
INSERT INTO public.organizations (name, slug, active)
VALUES ('Restaurante Demo', 'restaurante-demo', true)
ON CONFLICT (slug) DO NOTHING;

-- Crear usuario admin de prueba con PIN
INSERT INTO public.users (organization_id, name, username, email, pin, role, active, auth_provider)
SELECT 
  id,
  'Admin Demo',
  'admin',
  'admin@restaurante.local',
  '1234',
  'admin',
  true,
  'pin'
FROM public.organizations 
WHERE slug = 'restaurante-demo'
ON CONFLICT DO NOTHING;

-- Productos de ejemplo
INSERT INTO public.products (organization_id, name, category, price, current_stock, has_inventory, available)
SELECT 
  org.id,
  producto.name,
  producto.category,
  producto.price,
  producto.stock,
  true,
  true
FROM public.organizations org
CROSS JOIN (
  VALUES
    ('Ceviche Clásico', 'Mariscos', 120.00, 50),
    ('Aguachile Verde', 'Mariscos', 140.00, 30),
    ('Cerveza Corona', 'Bebidas', 35.00, 100),
    ('Margarita', 'Cocteles', 80.00, 0),
    ('Tacos de Pescado', 'Platillos', 95.00, 40)
) AS producto(name, category, price, stock)
WHERE org.slug = 'restaurante-demo'
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
