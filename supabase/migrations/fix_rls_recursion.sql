-- ============================================================
-- Fix Recursión Infinita en RLS - Políticas de Users
-- Fecha: 2026-02-25
-- ============================================================

-- ✅ DROP Políticas viejas que causaban recursión
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
-- CREAR FUNCIONES CON SECURITY DEFINER (Evitan recursión)
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

-- ============================================================
-- CREAR NUEVAS POLÍTICAS (Sin recursión infinita)
-- ============================================================

-- Políticas para ORGANIZATIONS
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (id = public.get_current_user_org_id());

-- Políticas para USERS (✅ FIXED - No más recursión)
CREATE POLICY "Users can view users in their organization"
ON public.users FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Admins can manage users in their organization"
ON public.users FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin()
);

-- Políticas para DEVICES (✅ FIXED)
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

-- Políticas para PRODUCTS (✅ FIXED)
CREATE POLICY "Users can view products in their organization"
ON public.products FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Admins can manage products in their organization"
ON public.products FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin_or_supervisor()
);

-- Políticas para ORDERS (✅ FIXED)
CREATE POLICY "Users can view orders in their organization"
ON public.orders FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Staff can create and update orders in their organization"
ON public.orders FOR ALL
USING (organization_id = public.get_current_user_org_id());

-- Políticas para SALES (✅ FIXED)
CREATE POLICY "Users can view sales in their organization"
ON public.sales FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Staff can create sales in their organization"
ON public.sales FOR INSERT
WITH CHECK (organization_id = public.get_current_user_org_id());

-- Políticas para CLOSINGS (✅ FIXED)
CREATE POLICY "Users can view closings in their organization"
ON public.closings FOR SELECT
USING (organization_id = public.get_current_user_org_id());

CREATE POLICY "Admins can manage closings in their organization"
ON public.closings FOR ALL
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin_or_supervisor()
);

-- Políticas para AUDIT_LOGS (✅ FIXED)
CREATE POLICY "Admins can view audit logs in their organization"
ON public.audit_logs FOR SELECT
USING (
  organization_id = public.get_current_user_org_id()
  AND public.is_user_admin()
);

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
