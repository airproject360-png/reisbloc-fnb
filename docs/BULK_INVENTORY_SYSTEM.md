# 🍃 Sistema de Inventario a Granel con Recetas

## Descripción General

Sistema de gestión de inventarios para productos a granel (lechuga, tomate, aceite, etc.) que se **descargan automáticamente según recetas al vender productos**, con **merma incluida**.

---

## 🎯 Problema Resuelto

### Antes ❌
```
POS: "Vendo 1 lechuga"
Inventario: Descuenta 1 unidad
PROBLEMA: La lechuga no se vende como unidad, se usa a granel
```

### Ahora ✅
```
POS: "Vendo 2 ensaladas Caesar + 3 hamburguesas"
Sistema: Calcula automáticamente
  - Ensalada: 2 × 200g lechuga × 1.15 (merma 15%) = 460g
  - Hamburguesa: 3 × 30g lechuga × 1.15 = 103.5g
  - Total lechuga: 563.5g descuento
  - Se descuenta automáticamente del inventario
```

---

## 📊 Conceptos Clave

### Ingredientes (A Granel)
```typescript
{
  id: "uuid",
  name: "Lechuga",           // Nombre
  unit_type: "kg",           // Unidad: kg, liter, units
  current_stock: 100,        // 100kg en stock
  waste_margin_percent: 15,  // Merma 15%
  is_active: true
}
```

### Recetas (Preexistentes - Solo UPDATE)
```typescript
{
  id: "uuid",
  name: "Ensalada Caesar",
  version: 1,                // Para histórico
  ingredients: [
    {
      name: "Lechuga",
      quantity_required: 0.200,     // 200g
      waste_margin_percent: 15,     // 15%
      quantity_with_waste: 0.230    // 200g + merma = 230g real
    },
    {
      name: "Queso Mozzarella",
      quantity_required: 0.030,     // 30g
      quantity_with_waste: 0.032    // 30g + merma = 32g real
    }
  ]
}
```

### Descuento Automático
```
Vendo 10 ensaladas Caesar:
├─ Lechuga:  10 × 0.230kg = 2.3kg  ← 200g + merma automática
├─ Queso:    10 × 0.032kg = 0.32kg ← 30g + merma automática
└─ Descuento registrado en audit trail
```

---

## 🔐 Seguridad

### ✅ Lo que SÍ permite
- **SELECT**: Leer recetas e ingredientes
- **UPDATE**: Modificar recetas existentes (cambiar cantidades, merma)
- **RPC**: Llamar función de descuento

### ❌ Lo que NO permite
- **INSERT**: Crear nuevas recetas/ingredientes desde public
- **DELETE**: Eliminar recetas/ingredientes

```sql
-- ❌ Esto FALLA (no permitido desde public)
INSERT INTO recipes (name, ...) VALUES ('Mi Receta', ...);

-- ✅ Esto FUNCIONA (solo admin puede hacer seed)
SELECT * FROM recipes WHERE is_active = TRUE;

-- ✅ Esto FUNCIONA (solo admin/supervisor)
UPDATE recipes SET name = 'Nueva Ensalada' WHERE id = '...';
```

---

## 💻 Uso desde la Aplicación

### 1. Obtener Recetas Disponibles

```typescript
import { bulkInventoryService } from '@/services/bulkInventoryService';

// Obtener todas las recetas preexistentes
const recipes = await bulkInventoryService.getRecipes();

recipes.forEach(recipe => {
  console.log(`${recipe.name}:`);
  recipe.ingredients.forEach(item => {
    console.log(`  - ${item.ingredient_name}: ${item.quantity_required}${item.unit_type}`);
  });
});
```

**Output:**
```
Ensalada Caesar:
  - Lechuga: 0.200kg
  - Queso Mozzarella: 0.030kg
  - Pan Tostado: 0.050kg
  - Vinagre: 0.020liter

Sándwich Jamón y Queso:
  - Jamón: 0.100kg
  - Queso Mozzarella: 0.050kg
  - Tomate: 0.080kg
  - Pan Tostado: 0.100kg

Hamburguesa Clásica:
  - Carne Molida: 0.150kg
  - Queso Mozzarella: 0.040kg
  - Tomate: 0.040kg
  - Lechuga: 0.030kg
```

### 2. Verificar Stock Disponible

```typescript
// Verificar si hay stock para vender 2 ensaladas
const availability = await bulkInventoryService.checkRecipeAvailability(
  recipeId = "ensalada-uuid",
  quantitySold = 2
);

if (availability.available) {
  console.log("✅ Stock disponible");
} else {
  console.log("❌ Stock insuficiente de:");
  availability.missingIngredients.forEach(item => {
    console.log(`   - ${item.name}: necesitas ${item.required}${item.unit}, tienes ${item.available}${item.unit}`);
  });
}
```

### 3. DESCONTAR INVENTARIO AL VENDER ⭐

```typescript
// Cuando el cliente compra, llamar:
try {
  const results = await bulkInventoryService.discountInventoryByRecipe(
    recipeId = "ensalada-caesar-uuid",
    quantitySold = 2,
    orderId = "pedido-12345-uuid" // Para auditoría
  );

  // Resultado:
  results.forEach(item => {
    console.log(`✅ ${item.ingredient_name}:`);
    console.log(`   Descuento: ${item.quantity_discounted}kg`);
    console.log(`   Restante: ${item.remaining_stock}kg`);
  });
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  // Ej: "Stock insuficiente: Lechuga"
}
```

### 4. Ver Estado de Ingredientes

```typescript
// Ver qué ingredientes están en stock crítico
const summary = await bulkInventoryService.getStockSummary();

console.log("🔴 CRÍTICO (reordenar YA):");
summary.critical.forEach(i => console.log(`  - ${i.name}: ${i.current_stock}${i.unit_type}`));

console.log("🟠 BAJO:");
summary.low.forEach(i => console.log(`  - ${i.name}: ${i.current_stock}${i.unit_type}`));

console.log("🟢 OK:");
summary.ok.forEach(i => console.log(`  - ${i.name}: ${i.current_stock}${i.unit_type}`));
```

### 5. Ver Histórico de Movimientos

```typescript
// Ver todos los movimientos
const movements = await bulkInventoryService.getInventoryMovements();

movements.forEach(m => {
  console.log(`${m.created_at}: ${m.movement_type} - ${m.ingredient_name}`);
  console.log(`  Base: ${m.quantity_base}${m.unit_type}`);
  console.log(`  Con merma (${m.waste_margin_percent}%): ${m.quantity_with_waste}${m.unit_type}`);
  if (m.related_order_id) console.log(`  Pedido: ${m.related_order_id}`);
});

// Ver movimientos de un ingrediente específico
const lechuguaMoves = await bulkInventoryService.getInventoryMovements(
  ingredientId = "lechuga-uuid"
);
```

### 6. Actualizar Recetas (Admin Only)

```typescript
// Cambiar cantidades de una receta existente
await bulkInventoryService.updateRecipeItems(
  recipeId = "ensalada-uuid",
  items = [
    {
      ingredient_id: "lechuga-uuid",
      quantity_required: 0.250, // Aumentar de 200g a 250g
      waste_margin_percent: 15
    },
    {
      ingredient_id: "queso-uuid",
      quantity_required: 0.050,  // Aumentar de 30g a 50g
      waste_margin_percent: 8
    }
  ]
);

console.log("✅ Receta actualizada");
```

---

## 📋 Ejemplos de Uso Completo

### Ejemplo 1: Vender desde POS

```typescript
// src/pages/POS.tsx

import { bulkInventoryService } from '@/services/bulkInventoryService';

async function handleSellOrder(orderId: string, items: OrderItem[]) {
  try {
    // Agrupar por receta y cantidad
    const recipeGroups = items.reduce((acc, item) => {
      acc[item.recipe_id] = (acc[item.recipe_id] || 0) + item.quantity;
      return acc;
    }, {});

    // Procesar cada receta
    for (const [recipeId, quantity] of Object.entries(recipeGroups)) {
      // 1. Verificar stock
      const availability = await bulkInventoryService.checkRecipeAvailability(
        recipeId as string,
        quantity as number
      );

      if (!availability.available) {
        throw new Error(availability.message);
      }

      // 2. Descontar inventario
      const discounts = await bulkInventoryService.discountInventoryByRecipe(
        recipeId as string,
        quantity as number,
        orderId
      );

      console.log(`✅ Vendidas ${quantity} unidades de receta`);
      discounts.forEach(d => {
        console.log(`   ${d.ingredient_name}: -${d.quantity_discounted}kg`);
      });
    }

    // 3. Registrar venta exitosa
    await saveSaleRecord(orderId, items);
    showToast("✅ Venta registrada", "success");

  } catch (error) {
    showToast(`❌ ${error.message}`, "error");
  }
}
```

### Ejemplo 2: Dashboard de Inventario

```typescript
// src/pages/InventoryDashboard.tsx

export function InventoryDashboard() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    async function load() {
      // Cargar estado de stock
      const s = await bulkInventoryService.getStockSummary();
      setSummary(s);

      // Cargar últimos movimientos
      const m = await bulkInventoryService.getInventoryMovements(limit = 100);
      setMovements(m);
    }
    load();
  }, []);

  if (!summary) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-red-50">
          <h3>🔴 Crítico</h3>
          <p className="text-3xl font-bold">{summary.critical.length}</p>
          {summary.critical.map(i => (
            <p key={i.id} className="text-sm text-red-600">
              {i.name}: {i.current_stock}{i.unit_type}
            </p>
          ))}
        </Card>

        <Card className="bg-yellow-50">
          <h3>🟠 Bajo</h3>
          <p className="text-3xl font-bold">{summary.low.length}</p>
          {summary.low.map(i => (
            <p key={i.id} className="text-sm">
              {i.name}: {i.current_stock}{i.unit_type}
            </p>
          ))}
        </Card>

        <Card className="bg-green-50">
          <h3>🟢 OK</h3>
          <p className="text-3xl font-bold">{summary.ok.length}</p>
        </Card>
      </div>

      {/* Histórico */}
      <Table
        columns={[
          { key: 'created_at', label: 'Fecha' },
          { key: 'ingredient_name', label: 'Ingrediente' },
          { key: 'movement_type', label: 'Tipo' },
          { 
            key: 'quantity_with_waste', 
            label: 'Cantidad',
            render: (v, row) => `${v}${row.unit_type}`
          }
        ]}
        data={movements}
      />
    </div>
  );
}
```

---

## 📊 Cálculo de Merma

### Fórmula
```
Cantidad Real = Cantidad Requerida × (1 + Merma% / 100)
```

### Ejemplos

**Lechuga con merma 15%:**
```
Receta pide: 200g
Merma: 200g × 15% = 30g
Total real descuento: 200g + 30g = 230g
```

**Carne con merma 10%:**
```
Receta pide: 150g
Merma: 150g × 10% = 15g
Total real descuento: 150g + 15g = 165g
```

**Venta de 5 hamburguesas:**
```
Total carne: 5 × 165g = 825g
Total queso: 5 × (40g × 1.08) = 216g
Total lechuga: 5 × (30g × 1.15) = 172.5g
```

---

## 🔒 Seguridad y RLS

### Políticas Implementadas

```sql
-- ❌ Prevenir INSERT desde public
CREATE POLICY ingredients_no_public_insert ON ingredients
    FOR INSERT WITH CHECK (FALSE);

CREATE POLICY recipes_no_public_insert ON recipes
    FOR INSERT WITH CHECK (FALSE);

-- ✅ Permitir SELECT para empleados
CREATE POLICY recipes_select ON recipes
    FOR SELECT USING (
        has_organization_access(organization_id)
    );

-- ✅ Permitir UPDATE solo para admin/supervisor
CREATE POLICY recipes_update_admin ON recipes
    FOR UPDATE USING (
        user.role IN ('admin', 'supervisor')
    );
```

### Resultado
- ✅ Cualquiera puede **leer** recetas (necesario para vender)
- ✅ Solo admin/supervisor pueden **modificar** recetas
- ❌ Nadie puede **crear nuevas** recetas/ingredientes desde app
- ❌ Nadie puede **eliminar** recetas/ingredientes

---

## 🚀 Flujo Completo Recomendado

```
1. SETUP (Inicial - Una sola vez)
   └─ Crear recetas preexistentes (via Supabase UI o Edge Function)
   └─ Crear ingredientes con stock inicial
   └─ Definir merma para cada ingrediente

2. OPERACIÓN DIARIA (Repetido)
   └─ POS vende productos
   └─ Para cada venta: discount_inventory_by_recipe()
   └─ Inventario se descuenta automáticamente
   └─ Merma se incluye automáticamente

3. AUDITORÍA
   └─ Ver histórico en inventory_movements
   └─ Ver stock actual por ingrediente
   └─ Alertas de stock crítico

4. ACTUALIZACIÓN (Según sea necesario)
   └─ Admin actualiza recetas si cambian
   └─ Admin ajusta mermas si varían
   └─ Admin registra ajustes manuales
```

---

## ⚡ Ventajas

✅ **Automático** - No hay que contar nada manualmente
✅ **Preciso** - Incluye merma automáticamente
✅ **Auditable** - Cada movimiento registrado
✅ **Seguro** - RLS previene inserts desde public
✅ **Flexible** - Las recetas se pueden actualizar sin afectar órdenes antiguas
✅ **Libre tier ready** - Usa vistas (bajo número de queries)
✅ **Escalable** - Soporta múltiples organizaciones

---

## 🐛 Troubleshooting

### Error: "Stock insuficiente"
```
Solución: Cargar más stock del ingrediente
bulkInventoryService.adjustInventory(
  ingredientId = "lechuga-uuid",
  quantityChange = 50, // Agregar 50kg
  notes = "Compra a proveedor"
)
```

### Receta no aparece
```
Verificar:
1. is_active = true en recipes
2. Ingredientes asociados en recipe_items
3. Permisos de lectura (RLS)
```

### Descuento incorrecto
```
Verificar:
1. waste_margin_percent correcto
2. quantity_required en kg (no en gramos)
3. unit_type coincide con ingredientes
```

---

## 📞 Referencia de API

| Función | Parámetros | Retorna |
|---------|-----------|---------|
| `getRecipes()` | - | `Recipe[]` |
| `getRecipe(id)` | recipeId: string | `Recipe \| null` |
| `updateRecipe(id, updates)` | recipeId, name?, description?, is_active? | `Recipe` |
| `getIngredients()` | - | `Ingredient[]` |
| `discountInventoryByRecipe(id, qty, orderId)` | recipeId, quantitySold, orderId? | `DiscountResult[]` |
| `checkRecipeAvailability(id, qty)` | recipeId, quantitySold | `{available, message, missing}` |
| `getInventoryMovements(ingredientId?, limit)` | ingredientId?, limit? | `InventoryMovement[]` |
| `getStockSummary()` | - | `{critical, low, ok}` |
| `adjustInventory(id, change, notes)` | ingredientId, quantityChange, notes? | `void` |

---

¡Sistema de inventario a granel completamente funcional! 🚀
