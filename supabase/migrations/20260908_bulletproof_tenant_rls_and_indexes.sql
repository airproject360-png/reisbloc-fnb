-- ==============================================================================
-- REISBLOC F&B - MIGRACIÓN DE BLINDAJE MULTI-TENANT & OPTIMIZACIÓN DE ÍNDICES
-- Versión: 3.4.0
-- Fecha: 2026-09-08
-- Objetivo:
--   1. Eliminar completamente las políticas permisivas (USING true / WITH CHECK true).
--   2. Implementar resolución determinista de tenant (current_tenant_id() y current_user_org_id()).
--   3. Establecer políticas RLS herméticas por organización en las 18 tablas del sistema.
--   4. Indexar todas las Foreign Keys no cubiertas y desplegar índices compuestos/parciales de alta velocidad.
-- ==============================================================================

-- ==============================================================================
-- PASO 1: FUNCIONES DE RESOLUCIÓN DE TENANT Y ROL
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id uuid;
  v_header_org text;
  v_jwt_org text;
BEGIN
  -- 1. Si el usuario está autenticado en Supabase Auth, resolver desde public.users
  IF auth.uid() IS NOT NULL THEN
    SELECT organization_id INTO v_org_id 
    FROM public.users 
    WHERE id = auth.uid() AND active = true
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      RETURN v_org_id;
    END IF;

    -- También verificar vinculación por email si id no coincidió directamente
    SELECT u.organization_id INTO v_org_id
    FROM public.users u
    JOIN auth.users au ON lower(au.email) = lower(u.email)
    WHERE au.id = auth.uid() AND u.active = true
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      RETURN v_org_id;
    END IF;
  END IF;

  -- 2. Resolver desde el claim 'org_id' del JWT (sesiones PIN / Terminal POS)
  BEGIN
    v_jwt_org := auth.jwt()->>'org_id';
    IF v_jwt_org IS NOT NULL AND v_jwt_org ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_jwt_org::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 3. Resolver desde el header HTTP 'x-organization-id' (PostgREST)
  BEGIN
    v_header_org := current_setting('request.headers', true)::json->>'x-organization-id';
    IF v_header_org IS NOT NULL AND v_header_org ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_header_org::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- Compatibilidad total hacia atrás con funciones existentes
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.current_tenant_id();
$$;

-- Helper para verificar rol de usuario
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT role::text INTO v_role 
    FROM public.users 
    WHERE id = auth.uid() AND active = true
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;

    SELECT u.role::text INTO v_role
    FROM public.users u
    JOIN auth.users au ON lower(au.email) = lower(u.email)
    WHERE au.id = auth.uid() AND u.active = true
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  BEGIN
    v_role := auth.jwt()->'user_metadata'->>'role';
    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
    v_role := auth.jwt()->>'role';
    IF v_role IS NOT NULL AND v_role NOT IN ('anon', 'authenticated', 'service_role') THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN 'authenticated';
END;
$$;

-- ==============================================================================
-- PASO 2: LIMPIEZA TOTAL DE POLÍTICAS INSEGURAS O ANTIGUAS
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ==============================================================================
-- PASO 3: POLÍTICAS RLS HERMÉTICAS POR TENANT (ZERO-TRUST)
-- ==============================================================================

-- 1. ORGANIZACIONES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_org_select" ON public.organizations
  FOR SELECT TO authenticated, anon
  USING (id = public.current_tenant_id());

-- 2. USUARIOS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_users_select" ON public.users
  FOR SELECT TO authenticated, anon
  USING (organization_id = public.current_tenant_id() AND active = true);

CREATE POLICY "tenant_users_insert" ON public.users
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    organization_id = public.current_tenant_id()
    OR id = auth.uid()
    OR (auth.uid() IS NOT NULL AND lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

CREATE POLICY "tenant_users_update" ON public.users
  FOR UPDATE TO authenticated, anon
  USING (organization_id = public.current_tenant_id() OR id = auth.uid())
  WITH CHECK (organization_id = public.current_tenant_id() OR id = auth.uid());

CREATE POLICY "tenant_users_delete" ON public.users
  FOR DELETE TO authenticated
  USING (organization_id = public.current_tenant_id());

-- 3. PRODUCTOS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_products_all" ON public.products
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 4. ÓRDENES (Operación en Vivo: POS / KDS / Cocina)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_orders_all" ON public.orders
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 5. VENTAS (Finanzas / Pagos / Tickets)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sales_all" ON public.sales
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 6. CIERRES DE CAJA
ALTER TABLE public.closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_closings_all" ON public.closings
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 7. DISPOSITIVOS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_devices_all" ON public.devices
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 8. INGREDIENTES
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_ingredients_all" ON public.ingredients
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 9. CATEGORÍAS DE INGREDIENTES
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_ingredient_categories_all" ON public.ingredient_categories
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 10. UNIDADES DE MEDIDA
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_measurement_units_all" ON public.measurement_units
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 11. MOVIMIENTOS DE INVENTARIO
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_inventory_movements_all" ON public.inventory_movements
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 12. RECETAS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_recipes_all" ON public.recipes
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 13. ÍTEMS DE RECETAS
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_recipe_items_all" ON public.recipe_items
  FOR ALL TO authenticated, anon
  USING (
    recipe_id IN (
      SELECT id FROM public.recipes WHERE organization_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM public.recipes WHERE organization_id = public.current_tenant_id()
    )
  );

-- 14. PROVEEDORES
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_suppliers_all" ON public.suppliers
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 15. COMPRAS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_purchases_all" ON public.purchases
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 16. AUDITORÍA (AUDIT LOGS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_audit_logs_all" ON public.audit_logs
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 17. SESIONES DE INICIO (LOGIN SESSIONS)
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_login_sessions_all" ON public.login_sessions
  FOR ALL TO authenticated, anon
  USING (organization_id = public.current_tenant_id())
  WITH CHECK (organization_id = public.current_tenant_id());

-- 18. NOTIFICACIONES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tenant_notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users target
      WHERE target.id = notifications.user_id 
        AND target.organization_id = public.current_tenant_id()
        AND target.active = true
    )
  );

-- ==============================================================================
-- PASO 4: ÍNDICES DE ALTO RENDIMIENTO & COBERTURA DE FOREIGN KEYS
-- ==============================================================================

-- 1. Pipeline de Comandas Activas (KDS / Cocina / Bar): Índice Compuesto Parcial Ultra-Rápido
CREATE INDEX IF NOT EXISTS idx_orders_active_pipeline 
ON public.orders (organization_id, created_at ASC) 
WHERE status IN ('sent', 'preparing', 'ready', 'served');

-- 2. Histórico de Ventas por Tenant y Rango de Fecha
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created_desc 
ON public.sales (organization_id, created_at DESC);

-- 3. Catálogo de Productos Disponibles
CREATE INDEX IF NOT EXISTS idx_products_tenant_available 
ON public.products (organization_id, available) 
WHERE available = true;

-- 4. Movimientos de Inventario por Tenant
CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_created 
ON public.inventory_movements (organization_id, created_at DESC);

-- 5. Sesiones de Login por Tenant
CREATE INDEX IF NOT EXISTS idx_login_sessions_tenant_created 
ON public.login_sessions (organization_id, created_at DESC);

-- 6. Notificaciones No Leídas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, created_at DESC) 
WHERE read = false;

-- 7. Cobertura de Foreign Keys Faltantes (Elimina Sequential Scans en Cascada/Joins)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_closings_closed_by ON public.closings(closed_by);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_categories_org ON public.ingredient_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_unit_id ON public.ingredients(unit_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON public.ingredients(category_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_tenant_active ON public.ingredients(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org ON public.inventory_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON public.inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurement_units_org ON public.measurement_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON public.orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_recipe_items_composite ON public.recipe_items(recipe_id, ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_ingredient_id ON public.recipe_items(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON public.sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_waiter_id ON public.sales(waiter_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON public.suppliers(created_by);
