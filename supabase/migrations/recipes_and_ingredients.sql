-- ============================================================
-- Reisbloc POS - Extension: Recetas e Ingredientes
-- Version: 3.2.2
-- Sistema de Inventario en Granel + Recetas
-- ============================================================

-- ============================================================
-- SECCIÓN 1: NUEVAS TABLAS PARA GESTIÓN DE RECETAS
-- ============================================================

-- CATEGORÍAS DE INGREDIENTES (Optimización para filtros)
CREATE TABLE IF NOT EXISTS public.ingredient_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- UNIDADES DE MEDIDA (Validación + Conversión)
CREATE TABLE IF NOT EXISTS public.measurement_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code character varying(10) UNIQUE NOT NULL, -- 'g', 'ml', 'ltr', 'pza', 'kg'
  name text NOT NULL,
  abbreviation character varying(5),
  conversion_base_unit text, -- Para conversiones automáticas
  created_at timestamp with time zone DEFAULT now()
);

-- INGREDIENTES (Inventario a granel)
CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.ingredient_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_id uuid NOT NULL REFERENCES public.measurement_units(id),
  current_stock numeric(12,2) DEFAULT 0,
  min_stock numeric(12,2) DEFAULT 0,
  max_stock numeric(12,2),
  cost_per_unit numeric(10,4) DEFAULT 0,
  supplier text,
  sku character varying(255) UNIQUE,
  is_active boolean DEFAULT true,
  last_restock_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RECETAS (Relación Producto - Ingredientes)
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version integer DEFAULT 1, -- Permitir versionado de recetas
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, version)
);

-- DETALLE DE RECETA (Items individuales de ingredientes)
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity_required numeric(10,4) NOT NULL, -- Cantidad exacta necesaria
  waste_margin numeric(4,2) DEFAULT 0, -- Porcentaje de pérdida por merma (ej: 0.05 = 5%)
  total_with_waste numeric(10,4) GENERATED ALWAYS AS (quantity_required * (1 + waste_margin)) STORED,
  notes text,
  UNIQUE(recipe_id, ingredient_id)
);

-- HISTORIAL DE INVENTARIO (Para auditoría + forecasting)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity numeric(12,2) NOT NULL,
  reference_type text, -- 'order_delivered', 'inventory_restock', 'manual_adjustment'
  reference_id uuid, -- order_id, sale_id, etc
  notes text,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- SECCIÓN 2: MODIFICACIONES A TABLAS EXISTENTES
-- ============================================================

-- Agregar columna de "prepare_time" a productos si no existe
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS prepare_time_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS requires_recipe boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cost_of_goods_sold numeric(10,4);

-- ============================================================
-- SECCIÓN 3: ÍNDICES PARA OPTIMIZACIÓN (Versión Gratuita)
-- ============================================================

-- Índices para búsqueda rápida sin sobrecargar queries
CREATE INDEX IF NOT EXISTS idx_ingredients_org_active ON public.ingredients(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_sku ON public.ingredients(sku);
CREATE INDEX IF NOT EXISTS idx_recipes_org_active ON public.recipes(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ingredient ON public.inventory_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);

-- ============================================================
-- SECCIÓN 4: VISTAS OPTIMIZADAS (Reducen queries innecesarias)
-- ============================================================

-- Vista: Stock actual con unidades de medida (evita JOIN repetidos)
CREATE OR REPLACE VIEW vw_ingredient_stock AS
SELECT 
  i.id,
  i.organization_id,
  i.name,
  i.current_stock,
  mu.code as unit_code,
  mu.abbreviation,
  i.min_stock,
  i.max_stock,
  CASE 
    WHEN i.current_stock <= i.min_stock THEN 'critical'
    WHEN i.current_stock <= (i.min_stock * 1.5) THEN 'low'
    ELSE 'ok'
  END as stock_status,
  i.is_active
FROM public.ingredients i
LEFT JOIN public.measurement_units mu ON i.unit_id = mu.id
WHERE i.is_active = true;

-- Vista: Recetas con detalles completos (Lectura optimizada)
CREATE OR REPLACE VIEW vw_recipe_details AS
SELECT 
  r.id as recipe_id,
  r.organization_id,
  p.id as product_id,
  p.name as product_name,
  p.category,
  r.version,
  jsonb_agg(
    jsonb_build_object(
      'ingredient_id', ri.ingredient_id,
      'ingredient_name', i.name,
      'unit', mu.code,
      'quantity_required', ri.quantity_required,
      'waste_margin', ri.waste_margin,
      'total_with_waste', ri.total_with_waste,
      'current_stock', i.current_stock
    ) ORDER BY i.name
  ) as ingredients,
  r.is_active
FROM public.recipes r
JOIN public.products p ON r.product_id = p.id
JOIN public.recipe_items ri ON r.id = ri.recipe_id
JOIN public.ingredients i ON ri.ingredient_id = i.id
LEFT JOIN public.measurement_units mu ON i.unit_id = mu.id
GROUP BY r.id, r.organization_id, p.id, p.name, p.category, r.version, r.is_active;

-- ============================================================
-- SECCIÓN 5: FUNCIONES PARA ACCESO CONTROLADO
-- ============================================================

-- Función: Crear receta (Solo admin/supervisor)
CREATE OR REPLACE FUNCTION create_recipe_safe(
  p_org_id uuid,
  p_product_id uuid,
  p_ingredients jsonb,
  p_waste_margin numeric DEFAULT 0
) RETURNS json AS $$
DECLARE
  v_recipe_id uuid;
  v_ingredient jsonb;
BEGIN
  -- Crear receta
  INSERT INTO public.recipes (organization_id, product_id, is_active)
  VALUES (p_org_id, p_product_id, true)
  RETURNING id INTO v_recipe_id;

  -- Insertar items de receta
  FOR v_ingredient IN SELECT jsonb_array_elements(p_ingredients) LOOP
    INSERT INTO public.recipe_items (
      recipe_id,
      ingredient_id,
      quantity_required,
      waste_margin
    )
    VALUES (
      v_recipe_id,
      (v_ingredient->>'ingredient_id')::uuid,
      (v_ingredient->>'quantity')::numeric,
      p_waste_margin
    )
    ON CONFLICT (recipe_id, ingredient_id) DO UPDATE
    SET quantity_required = EXCLUDED.quantity_required,
        waste_margin = EXCLUDED.waste_margin;
  END LOOP;

  RETURN json_build_object(
    'recipe_id', v_recipe_id,
    'status', 'created',
    'ingredient_count', jsonb_array_length(p_ingredients)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Descontar inventario cuando orden está lista
CREATE OR REPLACE FUNCTION discount_inventory_on_order_ready(
  p_order_id uuid,
  p_org_id uuid
) RETURNS json AS $$
DECLARE
  v_recipe RECORD;
  v_movement_count integer := 0;
  v_insufficient_stock text;
BEGIN
  -- Verificar stock disponible ANTES de descontar
  SELECT STRING_AGG(DISTINCT i.name, ', ')
  INTO v_insufficient_stock
  FROM public.order_items oi
  JOIN public.recipes r ON oi.product_id = r.product_id
  JOIN public.recipe_items ri ON r.id = ri.recipe_id
  JOIN public.ingredients i ON ri.ingredient_id = i.id
  WHERE oi.order_id = p_order_id
  AND i.current_stock < ri.total_with_waste;

  IF v_insufficient_stock IS NOT NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'message', 'Inventario insuficiente: ' || v_insufficient_stock,
      'insufficient_items', v_insufficient_stock
    );
  END IF;

  -- Descontar inventario
  FOR v_recipe IN 
    SELECT 
      oi.product_id,
      ri.ingredient_id,
      ri.total_with_waste,
      oi.id as order_item_id
    FROM public.order_items oi
    JOIN public.recipes r ON oi.product_id = r.product_id AND r.is_active = true
    JOIN public.recipe_items ri ON r.id = ri.recipe_id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Actualizar stock
    UPDATE public.ingredients
    SET current_stock = current_stock - v_recipe.total_with_waste,
        updated_at = NOW()
    WHERE id = v_recipe.ingredient_id;

    -- Registrar movimiento
    INSERT INTO public.inventory_movements (
      organization_id,
      ingredient_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      user_id
    )
    VALUES (
      p_org_id,
      v_recipe.ingredient_id,
      'out',
      v_recipe.total_with_waste,
      'order_ready',
      p_order_id,
      auth.uid()
    );

    v_movement_count := v_movement_count + 1;
  END LOOP;

  RETURN json_build_object(
    'status', 'success',
    'message', 'Inventario descontado',
    'items_updated', v_movement_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECCIÓN 6: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Política: Solo ver ingredientes de su organización
CREATE POLICY "Users can view ingredients in their organization"
ON public.ingredients FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Política: Admin/Supervisor pueden modificar ingredientes
CREATE POLICY "Admin can modify ingredients"
ON public.ingredients FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Política: Ver recetas
CREATE POLICY "Users can view recipes in their organization"
ON public.recipes FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Política: Admin/Supervisor pueden crear/modificar recetas
CREATE POLICY "Admin can manage recipes"
ON public.recipes FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Política: Ver movimientos de inventario (Audit)
CREATE POLICY "Users can view inventory movements in their organization"
ON public.inventory_movements FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- ============================================================
-- SECCIÓN 7: DATOS INICIALES - UNIDADES DE MEDIDA
-- ============================================================

-- Insertar unidades de medida estándar (para todas las orgs)
INSERT INTO public.measurement_units (organization_id, code, name, abbreviation)
SELECT 
  org.id,
  unit.code,
  unit.name,
  unit.abbr
FROM public.organizations org
CROSS JOIN (
  VALUES
    ('g', 'Gramos', 'g'),
    ('kg', 'Kilogramos', 'kg'),
    ('ml', 'Mililitros', 'ml'),
    ('ltr', 'Litros', 'L'),
    ('pza', 'Pieza', 'pza'),
    ('docena', 'Docena', 'dz')
) AS unit(code, name, abbr)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DE LA EXTENSIÓN
-- ============================================================
