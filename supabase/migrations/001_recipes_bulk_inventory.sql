/**
 * ============================================================
 * RECETAS Y DESCUENTO DE INVENTARIO A GRANEL
 * ============================================================
 * 
 * Sistema de gestión de bultos/a granel donde los ingredientes
 * se descargan automáticamente según recetas al vender productos.
 * 
 * EJEMPLO:
 * - Lechuga: 100kg en inventario
 * - Receta Ensalada: 200g de lechuga + merma 15% = 230g real
 * - Receta Baguette: 50g de lechuga + merma 15% = 57.5g real
 * - Vendo 10 ensaladas + 5 baguettes
 * - Descuento: (10*230) + (5*57.5) = 2,287.5g = 2.29kg
 * - Lechuga restante: 100kg - 2.29kg = 97.71kg
 */

-- ============================================================
-- 1. CREAR TABLAS DE RECETAS (si no existen)
-- ============================================================

-- Ingredientes (a granel, en kg o unidades base)
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_type TEXT NOT NULL, -- 'kg', 'liter', 'units'
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
    waste_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 10, -- Merma en porcentaje
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ingredient_stock_positive CHECK (current_stock >= 0)
);

-- Recetas (productos que llevan ingredientes)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1, -- Para histórico
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Detalle de recetas (ingredientes + cantidades)
CREATE TABLE IF NOT EXISTS public.recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10, 3) NOT NULL, -- Cantidad en unidad base (kg, litro, etc)
    waste_margin_percent DECIMAL(5, 2), -- Override de merma si es diferente
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT quantity_positive CHECK (quantity_required > 0)
);

-- Registro de movimientos de inventario (auditoría)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'waste'
    quantity_base DECIMAL(10, 3) NOT NULL, -- Cantidad base sin merma
    quantity_with_waste DECIMAL(10, 3) NOT NULL, -- Cantidad con merma
    waste_margin_percent DECIMAL(5, 2) NOT NULL,
    related_order_id UUID REFERENCES public.orders(id),
    related_recipe_id UUID REFERENCES public.recipes(id),
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================

CREATE INDEX idx_ingredients_org_active ON public.ingredients(organization_id, is_active);
CREATE INDEX idx_recipes_org_active ON public.recipes(organization_id, is_active);
CREATE INDEX idx_recipe_items_recipe ON public.recipe_items(recipe_id);
CREATE INDEX idx_recipe_items_ingredient ON public.recipe_items(ingredient_id);
CREATE INDEX idx_inventory_movements_org ON public.inventory_movements(organization_id, created_at DESC);
CREATE INDEX idx_inventory_movements_ingredient ON public.inventory_movements(ingredient_id);

-- ============================================================
-- 3. VISTAS ÚTILES
-- ============================================================

-- Vista: Recetas con detalles completos
CREATE OR REPLACE VIEW public.vw_recipes_detail AS
SELECT 
    r.id,
    r.organization_id,
    r.name,
    r.description,
    r.is_active,
    r.version,
    r.created_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'ingredient_id', ri.ingredient_id,
                'ingredient_name', i.name,
                'quantity_required', ri.quantity_required,
                'unit_type', i.unit_type,
                'waste_margin_percent', COALESCE(ri.waste_margin_percent, i.waste_margin_percent),
                'quantity_with_waste', ri.quantity_required * (1 + COALESCE(ri.waste_margin_percent, i.waste_margin_percent) / 100),
                'current_stock', i.current_stock,
                'is_available', i.current_stock >= (ri.quantity_required * (1 + COALESCE(ri.waste_margin_percent, i.waste_margin_percent) / 100))
            ) ORDER BY ri.sort_order
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::JSON
    ) AS ingredients
FROM public.recipes r
LEFT JOIN public.recipe_items ri ON r.id = ri.recipe_id
LEFT JOIN public.ingredients i ON ri.ingredient_id = i.id
GROUP BY r.id, r.organization_id, r.name, r.description, r.is_active, r.version, r.created_at;

-- Vista: Estado de ingredientes
CREATE OR REPLACE VIEW public.vw_ingredient_stock AS
SELECT 
    i.id,
    i.organization_id,
    i.name,
    i.unit_type,
    i.current_stock,
    i.reorder_level,
    CASE 
        WHEN i.current_stock <= i.reorder_level THEN 'CRITICAL'
        WHEN i.current_stock <= (i.reorder_level * 1.5) THEN 'LOW'
        ELSE 'OK'
    END AS stock_status,
    i.waste_margin_percent,
    i.is_active,
    i.created_at
FROM public.ingredients i;

-- ============================================================
-- 4. FUNCIÓN: Descontar Inventario por Receta
-- ============================================================

CREATE OR REPLACE FUNCTION public.discount_inventory_by_recipe(
    p_recipe_id UUID,
    p_quantity_sold INT DEFAULT 1,
    p_created_by UUID DEFAULT NULL,
    p_order_id UUID DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    ingredient_id UUID,
    ingredient_name TEXT,
    quantity_discounted DECIMAL,
    remaining_stock DECIMAL
) AS $$
DECLARE
    v_org_id UUID;
    v_recipe_row RECORD;
    v_ingredient_row RECORD;
    v_quantity_with_waste DECIMAL;
BEGIN
    -- Validar receta existe
    SELECT r.organization_id, r.id INTO v_org_id, v_recipe_row
    FROM public.recipes r
    WHERE r.id = p_recipe_id AND r.is_active = TRUE;
    
    IF v_org_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Receta no encontrada o inactiva'::TEXT, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    -- Iterar sobre ingredientes de la receta
    FOR v_ingredient_row IN 
        SELECT 
            ri.ingredient_id,
            i.name,
            ri.quantity_required,
            COALESCE(ri.waste_margin_percent, i.waste_margin_percent) AS waste_margin,
            i.current_stock
        FROM public.recipe_items ri
        JOIN public.ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = p_recipe_id
    LOOP
        -- Calcular cantidad a descontar (con merma)
        v_quantity_with_waste := v_ingredient_row.quantity_required * (1 + v_ingredient_row.waste_margin / 100) * p_quantity_sold;

        -- Validar stock disponible
        IF v_ingredient_row.current_stock < v_quantity_with_waste THEN
            RETURN QUERY SELECT 
                FALSE, 
                'Stock insuficiente: ' || v_ingredient_row.name,
                v_ingredient_row.ingredient_id,
                v_ingredient_row.name,
                v_quantity_with_waste,
                v_ingredient_row.current_stock;
            RETURN;
        END IF;
    END LOOP;

    -- Si todo validó, realizar descuentos
    FOR v_ingredient_row IN 
        SELECT 
            ri.ingredient_id,
            i.name,
            ri.quantity_required,
            COALESCE(ri.waste_margin_percent, i.waste_margin_percent) AS waste_margin,
            i.current_stock
        FROM public.recipe_items ri
        JOIN public.ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = p_recipe_id
    LOOP
        v_quantity_with_waste := v_ingredient_row.quantity_required * (1 + v_ingredient_row.waste_margin / 100) * p_quantity_sold;

        -- Actualizar stock
        UPDATE public.ingredients 
        SET current_stock = current_stock - v_quantity_with_waste
        WHERE id = v_ingredient_row.ingredient_id;

        -- Registrar movimiento
        INSERT INTO public.inventory_movements (
            organization_id,
            ingredient_id,
            movement_type,
            quantity_base,
            quantity_with_waste,
            waste_margin_percent,
            related_order_id,
            related_recipe_id,
            created_by
        ) VALUES (
            v_org_id,
            v_ingredient_row.ingredient_id,
            'sale',
            v_ingredient_row.quantity_required * p_quantity_sold,
            v_quantity_with_waste,
            v_ingredient_row.waste_margin,
            p_order_id,
            p_recipe_id,
            p_created_by
        );

        RETURN QUERY SELECT 
            TRUE,
            'Descuento exitoso'::TEXT,
            v_ingredient_row.ingredient_id,
            v_ingredient_row.name,
            v_quantity_with_waste,
            v_ingredient_row.current_stock - v_quantity_with_waste;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RLS - Row Level Security (Seguridad)
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas
DROP POLICY IF EXISTS ingredients_org_isolation ON public.ingredients;
DROP POLICY IF EXISTS ingredients_select ON public.ingredients;
DROP POLICY IF EXISTS ingredients_update ON public.ingredients;
DROP POLICY IF EXISTS recipes_org_isolation ON public.recipes;
DROP POLICY IF EXISTS recipes_select ON public.recipes;
DROP POLICY IF EXISTS recipes_update ON public.recipes;
DROP POLICY IF EXISTS recipe_items_read ON public.recipe_items;
DROP POLICY IF EXISTS inventory_movements_read ON public.inventory_movements;

-- Políticas para INGREDIENTES
CREATE POLICY ingredients_select ON public.ingredients
    FOR SELECT USING (
        organization_id = auth.uid() OR
        has_organization_access(organization_id)
    );

CREATE POLICY ingredients_update_admin_only ON public.ingredients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.organization_id = ingredients.organization_id
            AND u.role IN ('admin', 'supervisor')
        )
    );

-- NO permitir INSERT desde public (solo admin puede)
CREATE POLICY ingredients_no_public_insert ON public.ingredients
    FOR INSERT WITH CHECK (FALSE);

-- Políticas para RECETAS
CREATE POLICY recipes_select ON public.recipes
    FOR SELECT USING (
        organization_id = auth.uid() OR
        has_organization_access(organization_id)
    );

-- UPDATE solo de recetas existentes (no nuevas)
CREATE POLICY recipes_update_admin ON public.recipes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.organization_id = recipes.organization_id
            AND u.role IN ('admin', 'supervisor')
        )
    );

-- NO permitir INSERT desde public
CREATE POLICY recipes_no_public_insert ON public.recipes
    FOR INSERT WITH CHECK (FALSE);

-- Políticas para RECIPE_ITEMS
CREATE POLICY recipe_items_select ON public.recipe_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recipes r
            JOIN public.users u ON r.organization_id = u.organization_id
            WHERE r.id = recipe_items.recipe_id
            AND u.id = auth.uid()
        )
    );

-- NO permitir INSERT desde public
CREATE POLICY recipe_items_no_public_insert ON public.recipe_items
    FOR INSERT WITH CHECK (FALSE);

-- Políticas para INVENTORY_MOVEMENTS (solo lectura)
CREATE POLICY inventory_movements_select ON public.inventory_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.organization_id = inventory_movements.organization_id
        )
    );

CREATE POLICY inventory_movements_no_public_insert ON public.inventory_movements
    FOR INSERT WITH CHECK (FALSE);

-- ============================================================
-- 6. SEED DATA - Recetas Preexistentes
-- ============================================================

-- Nota: Este seed se ejecuta solo una vez via Edge Function con permisos ADMIN
-- No se permite INSERT desde public

INSERT INTO public.ingredients (organization_id, name, category, unit_type, current_stock, reorder_level, waste_margin_percent, is_active)
VALUES 
    -- Proteínas
    (1, 'Lechuga', 'Verduras', 'kg', 50.00, 10.00, 15, TRUE),
    (1, 'Tomate', 'Verduras', 'kg', 40.00, 8.00, 12, TRUE),
    (1, 'Carne Molida', 'Proteínas', 'kg', 30.00, 5.00, 10, TRUE),
    (1, 'Queso Mozzarella', 'Lácteos', 'kg', 20.00, 3.00, 8, TRUE),
    (1, 'Jamón', 'Proteínas', 'kg', 15.00, 3.00, 5, TRUE),
    (1, 'Aceite de Oliva', 'Condimentos', 'liter', 10.00, 2.00, 5, TRUE),
    (1, 'Vinagre', 'Condimentos', 'liter', 5.00, 1.00, 5, TRUE),
    (1, 'Pan Tostado', 'Base', 'unidades', 200, 50, 3, TRUE)
ON CONFLICT DO NOTHING;

-- Crear RECETAS preexistentes
INSERT INTO public.recipes (organization_id, name, description, is_active, version)
VALUES 
    (1, 'Ensalada Caesar', 'Ensalada con lechuga, pan tostado, queso y vinagreta', TRUE, 1),
    (1, 'Sándwich Jamón y Queso', 'Pan con jamón, queso mozzarella y tomate', TRUE, 1),
    (1, 'Hamburguesa Clásica', 'Hamburguesa con carne, queso y tomate', TRUE, 1)
ON CONFLICT DO NOTHING;

-- Asociar ingredientes a recetas
INSERT INTO public.recipe_items (recipe_id, ingredient_id, quantity_required, waste_margin_percent)
SELECT 
    r.id,
    i.id,
    CASE 
        WHEN r.name = 'Ensalada Caesar' AND i.name = 'Lechuga' THEN 0.200 -- 200g
        WHEN r.name = 'Ensalada Caesar' AND i.name = 'Pan Tostado' THEN 0.050 -- 50g
        WHEN r.name = 'Ensalada Caesar' AND i.name = 'Queso Mozzarella' THEN 0.030 -- 30g
        WHEN r.name = 'Ensalada Caesar' AND i.name = 'Vinagre' THEN 0.020 -- 20ml
        
        WHEN r.name = 'Sándwich Jamón y Queso' AND i.name = 'Jamón' THEN 0.100 -- 100g
        WHEN r.name = 'Sándwich Jamón y Queso' AND i.name = 'Queso Mozzarella' THEN 0.050 -- 50g
        WHEN r.name = 'Sándwich Jamón y Queso' AND i.name = 'Tomate' THEN 0.080 -- 80g
        WHEN r.name = 'Sándwich Jamón y Queso' AND i.name = 'Pan Tostado' THEN 0.100 -- 100g
        
        WHEN r.name = 'Hamburguesa Clásica' AND i.name = 'Carne Molida' THEN 0.150 -- 150g
        WHEN r.name = 'Hamburguesa Clásica' AND i.name = 'Queso Mozzarella' THEN 0.040 -- 40g
        WHEN r.name = 'Hamburguesa Clásica' AND i.name = 'Tomate' THEN 0.040 -- 40g
        WHEN r.name = 'Hamburguesa Clásica' AND i.name = 'Lechuga' THEN 0.030 -- 30g
    END,
    NULL -- Usa waste_margin del ingrediente
FROM public.recipes r
CROSS JOIN public.ingredients i
WHERE r.organization_id = 1
AND i.organization_id = 1
AND (
    (r.name = 'Ensalada Caesar' AND i.name IN ('Lechuga', 'Pan Tostado', 'Queso Mozzarella', 'Vinagre'))
    OR (r.name = 'Sándwich Jamón y Queso' AND i.name IN ('Jamón', 'Queso Mozzarella', 'Tomate', 'Pan Tostado'))
    OR (r.name = 'Hamburguesa Clásica' AND i.name IN ('Carne Molida', 'Queso Mozzarella', 'Tomate', 'Lechuga'))
)
AND NOT EXISTS (
    SELECT 1 FROM public.recipe_items ri
    WHERE ri.recipe_id = r.id AND ri.ingredient_id = i.id
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- EJEMPLO DE USO EN APPLICATION
-- ============================================================

/*
-- DESDE LA APLICACIÓN:

-- 1. Obtener recetas disponibles
SELECT * FROM vw_recipes_detail WHERE organization_id = auth.uid();

-- 2. Verificar stock de ingredientes
SELECT * FROM vw_ingredient_stock WHERE organization_id = auth.uid();

-- 3. DESCONTAR INVENTARIO AL VENDER
SELECT * FROM public.discount_inventory_by_recipe(
    p_recipe_id => 'recipe-uuid-aqui'::UUID,
    p_quantity_sold => 2,
    p_created_by => auth.uid(),
    p_order_id => 'order-uuid-aqui'::UUID
);

-- Resultado: Automáticamente descuenta ingredientes con merma incluida

-- 4. Ver histórico de movimientos
SELECT * FROM public.inventory_movements 
WHERE organization_id = auth.uid()
ORDER BY created_at DESC;
*/
