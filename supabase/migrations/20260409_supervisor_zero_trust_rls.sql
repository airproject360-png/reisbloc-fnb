-- ============================================================
-- Supervisor Zero-Trust RLS hardening
-- Date: 2026-04-09
-- Goal: supervisor can only read, never mutate operational data
-- ============================================================

-- PRODUCTS: only admin can mutate
DROP POLICY IF EXISTS "Admins can manage products in their organization" ON public.products;
CREATE POLICY "Admins can manage products in their organization"
ON public.products
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

-- SUPPLIERS: only admin can mutate
DROP POLICY IF EXISTS "Admins can manage suppliers in their organization" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers in their organization"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

-- PURCHASES: only admin can mutate
DROP POLICY IF EXISTS "Admins can manage purchases in their organization" ON public.purchases;
CREATE POLICY "Admins can manage purchases in their organization"
ON public.purchases
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

-- CLOSINGS: only admin can mutate
DROP POLICY IF EXISTS "Admins can manage closings in their organization" ON public.closings;
CREATE POLICY "Admins can manage closings in their organization"
ON public.closings
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

-- ORDERS: operational roles can mutate, supervisor excluded
DROP POLICY IF EXISTS "Staff can create and update orders in their organization" ON public.orders;
CREATE POLICY "Staff can create and update orders in their organization"
ON public.orders
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = ANY (ARRAY['admin', 'capitan', 'mesero', 'cocina', 'bar'])
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = ANY (ARRAY['admin', 'capitan', 'mesero', 'cocina', 'bar'])
);

-- SALES: allow only cashier roles to insert, supervisor excluded
DROP POLICY IF EXISTS "Staff can create sales in their organization" ON public.sales;
CREATE POLICY "Staff can create sales in their organization"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = ANY (ARRAY['admin', 'capitan', 'mesero', 'bar'])
);

-- DEVICES: users can only mutate own devices if not supervisor
DROP POLICY IF EXISTS "Users can manage their own devices" ON public.devices;
CREATE POLICY "Users can manage their own devices"
ON public.devices
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND public.current_user_role() <> 'supervisor'
)
WITH CHECK (
  user_id = auth.uid()
  AND public.current_user_role() <> 'supervisor'
);

-- RECIPES: only admin can mutate
DROP POLICY IF EXISTS "Admin can manage recipes" ON public.recipes;
CREATE POLICY "Admin can manage recipes"
ON public.recipes
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

-- INGREDIENTS: only admin can mutate
DROP POLICY IF EXISTS "Admin can modify ingredients" ON public.ingredients;
CREATE POLICY "Admin can modify ingredients"
ON public.ingredients
FOR ALL
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);
