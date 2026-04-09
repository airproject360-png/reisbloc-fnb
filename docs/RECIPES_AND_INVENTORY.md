# Reisbloc POS - Recetas e Ingredientes

## 📋 Arquitectura

### Tabla de Contenidos
1. [Estructura de Tablas](#estructura-de-tablas)
2. [Optimización para Versión Gratuita](#optimización-para-versión-gratuita)
3. [Control de Acceso (RBAC)](#control-de-acceso-rbac)
4. [Flujo de Descuento de Inventario](#flujo-de-descuento-de-inventario)
5. [API Segura (Edge Functions)](#api-segura-edge-functions)

---

## Estructura de Tablas

### 1. **ingredients** (Inventario en granel)
```sql
- id (UUID)
- organization_id (FK) -- Multi-tenant
- category_id (FK) -- Agrupa por tipo (proteínas, vegetales, etc)
- name (TEXT)
- unit_id (FK) -- Referencia a measurement_units
- current_stock (NUMERIC) -- Stock actual
- min_stock (NUMERIC) -- Alerta si baja de esto
- cost_per_unit (NUMERIC) -- Para calcular COGS
- is_active (BOOLEAN)
```

### 2. **measurement_units** (Unidades estandarizadas)
```sql
- id (UUID)
- organization_id (FK)
- code (VARCHAR) -- 'g', 'ml', 'kg', 'pza', 'ltr'
- name (TEXT)
- abbreviation (VARCHAR)
```

### 3. **recipes** (Plantillas de productos)
```sql
- id (UUID)
- organization_id (FK)
- product_id (FK) -- Referencia a tabla products
- version (INTEGER) -- Permite versionado
- is_active (BOOLEAN)
```

### 4. **recipe_items** (Detalles de cada receta)
```sql
- id (UUID)
- recipe_id (FK)
- ingredient_id (FK)
- quantity_required (NUMERIC) -- Cantidad exacta
- waste_margin (NUMERIC) -- % merma (ej: 0.05 = 5%)
- total_with_waste (GENERATED) -- Cantidad final con merma calculada
```

### 5. **inventory_movements** (Auditoría)
```sql
- id (UUID)
- ingredient_id (FK)
- movement_type ('in', 'out', 'adjustment')
- quantity (NUMERIC)
- reference_type ('order_ready', 'restock', 'manual')
- reference_id (UUID) -- Vinculado a orden, restock, etc
- created_at (TIMESTAMP)
```

---

## Optimización para Versión Gratuita

### ✅ Estrategias Para No Exceder Cuota

#### 1. **Vistas Materializadas (No queries N+1)**
```sql
vw_ingredient_stock -- Evita JOINs repetidos
vw_recipe_details -- Pre-calcula con JSONB
```

**Por qué:** Una sola query a la vista reemplaza 5-10 queries individuales.

#### 2. **Índices Estratégicos**
```sql
idx_ingredients_org_active -- Búsqueda rápida
idx_recipes_org_active      -- Filter común
idx_inventory_movements_ingredient -- Para reportes
```

#### 3. **Funciones SECURITY DEFINER**
Corren con permisos administrativos → No requieren verificar RLS multi-veces

#### 4. **Evitar Triggers en Cada Cambio**
En lugar de actualizar stock en TIME.TRIGGER, lo hacemos al cambiar status a "ready":
- ✅ Una actualización por orden
- ❌ Una por cada order_item

#### 5. **Datos Denormalizados (Controlado)**
```sql
-- En recipe_items, guardamos total_with_waste GENERADO
-- Evita calcular merma cada vez
total_with_waste GENERATED ALWAYS AS (
  quantity_required * (1 + waste_margin)
) STORED
```

### 📊 Comparativa de Queries

**SIN Optimizar (100+ queries/día):**
```typescript
// Leer receta
const recipe = await getRecipe(productId); // 1 query
const ingredients = await getIngredients(recipe.items); // N queries
const stock = await getStock(ingredients); // N queries
```

**CON Optimizar (5-10 queries/día):**
```typescript
// Una sola query a vista pre-calculada
const recipe = await client.from('vw_recipe_details').select('*');
// Incluye ingredientes Y stock en una sola respuesta JSONB
```

---

## Control de Acceso (RBAC)

### Roles y Permisos

| Rol | Ver Recetas | Crear Recetas | Descontar Inventario | Ver Reportes |
|-----|-------------|---------------|----------------------|--------------|
| admin | ✅ | ✅ | ✅ | ✅ |
| supervisor | ✅ | ✅ | ✅ | ✅ |
| cocinero | ✅ | ❌ | ❌ | ❌ |
| mesero | ❌ | ❌ | ❌ | ❌ |
| bar | ✅ | ❌ | ❌ | ❌ |

### Implementación Actual (RLS + Roles)

```sql
-- Política: Solo admin/supervisor pueden crear recetas
CREATE POLICY "Admin can manage recipes"
ON public.recipes FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'supervisor')
  )
);
```

### ⚠️ Problema Inicial: INSERT desde PUBLIC

**Lo que querías eliminar:**
```typescript
// ❌ Esto es inseguro (sin autenticación)
await supabase
  .from('recipes')
  .insert({ ...data });
```

**Solución: Edge Functions + Service Role**
```typescript
// ✅ Esto es seguro (verificado por función)
await fetch('/functions/v1/seed-data', {
  method: 'POST',
  body: JSON.stringify({
    action: 'create-recipe',
    data: { ... }
  })
});
```

La Edge Function:
1. Valida el `auth.uid()` del usuario
2. Verifica que sea admin/supervisor
3. Usa SERVICE_ROLE para insertar (con seguridad)
4. Registra en `audit_logs`

---

## Flujo de Descuento de Inventario

### Paso a Paso

```
1. Cliente pide: "Huevos Rancheros"
   ↓
2. Se crea order_item (status='ordered')
   ↓
3. Cocinero ve en KitchenDashboard
   ↓
4. Cocinero marca: "Listo" (status='ready')
   ↓
5. SE EJECUTA: discount_inventory_on_order_ready()
   ├── Verifica stock disponible
   ├── Si hay suficiente:
   │   ├── Decrementa ingredientes
   │   ├── Registra en inventory_movements (auditoría)
   │   └── Retorna "ok"
   └── Si hay insuficiencia:
       └── Retorna error (usuario ve: "⚠️ No hay cilantro")
```

### Función Segura

```sql
CREATE OR REPLACE FUNCTION discount_inventory_on_order_ready(
  p_order_id uuid,
  p_org_id uuid
) RETURNS json AS $$
-- Verifica stock PRIMERO
-- Evita race conditions con BEGIN TRANSACTION
-- Registra TODO en inventory_movements (auditoría legal)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## API Segura (Edge Functions)

### Función: `seed-data`

**Endpoint:** `POST /functions/v1/seed-data`

**Body:**
```json
{
  "action": "seed-demo-recipes",
  "data": {
    "org_id": "org-uuid-123"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "summary": {
    "categories": 5,
    "ingredients": 16,
    "recipes": 4
  }
}
```

### Seguridad

✅ **CORS protegido** - Solo HTTPS
✅ **Auth requerido** - Valida `auth.uid()`
✅ **RLS forzado** - Función ve solo datos del usuario
✅ **Auditoría** - Todo se registra en `inventory_movements`
✅ **Rate limiting** - Supabase lo controla automáticamente

---

## Ejemplo de Uso Frontend

### Crear Receta (Admin)

```typescript
// services/recipeService.ts

export async function createRecipe(
  productId: string,
  ingredients: Array<{ingredient_id: string; quantity: number}>
) {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      organization_id: user.org_id,
      product_id: productId,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  // Insertar items
  const items = ingredients.map(({ingredient_id, quantity}) => ({
    recipe_id: data.id,
    ingredient_id,
    quantity_required: quantity,
    waste_margin: 0.05 // 5% merma estándar
  }));

  const { error: itemError } = await supabase
    .from('recipe_items')
    .insert(items);

  if (itemError) throw itemError;

  return data;
}
```

### Ver Stock de Ingredientes

```typescript
// Usa la vista (optimizada)
export async function getIngredientStock() {
  const { data } = await supabase
    .from('vw_ingredient_stock')
    .select('*');
  
  return data; // Includes stock_status ('critical', 'low', 'ok')
}
```

### Marcar Orden Como Lista (Cocinero)

```typescript
export async function markOrderReady(orderId: string) {
  // 1. Actualizar status
  const { error } = await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('order_id', orderId);

  if (error) throw error;

  // 2. Descontar inventario (función segura)
  const { data: result } = await supabase.rpc(
    'discount_inventory_on_order_ready',
    {
      p_order_id: orderId,
      p_org_id: user.org_id
    }
  );

  if (result?.status === 'error') {
    throw new Error(result.message); // "No hay cilantro"
  }

  return result;
}
```

---

## Reportes (Planes Futuros)

### Free Tier
- ✅ Stock actual
- ✅ Alertas de inventario bajo
- ❌ Proyecciones (requiere muchos datos)

### Paid Tier
- ✅ COGS (Costo de Bienes Vendidos)
- ✅ Margen de ganancia por platillo
- ✅ Proyecciones de duración de stock
- ✅ Óptimo de pedidos automático

---

## Checklist de Implementación

- [ ] Ejecutar migración `recipes_and_ingredients.sql`
- [ ] Deploy Edge Function `seed-data`
- [ ] Crear UI para gestión de recetas (Admin)
- [ ] Actualizar KitchenDashboard para ver estado de inventario
- [ ] Agregar alertas visuales si ingredientes son insuficientes
- [ ] Crear vista de inventario bajo (threshold)
- [ ] Documentar para usuarios (guía de recetas)

