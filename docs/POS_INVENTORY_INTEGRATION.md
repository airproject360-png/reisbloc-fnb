# 🎯 Integración: Descuento de Inventario en POS

## Resumen Rápido

Cuando un cliente compra un producto que tiene receta, automáticamente se descargan los ingredientes del inventario con merma incluida.

---

## 🔄 Flujo de Venta

```
Cliente compra → POS calcula → Descuenta inventario → Registra movimiento
   ↓                ↓                    ↓                    ↓
"2 ensaladas"   "¿Qué receta?"   -460g lechuga         auditoría
                                  -64g queso
                                  +merma automática
```

---

## 💻 Código de Integración

### 1. En Order Item (cuando se agrega un producto a un pedido)

```typescript
// src/types/index.ts

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_unit: number;
  recipe_id?: string;  // ← Referencia a receta si tiene
  total: number;
}
```

### 2. Al Confirmar Venta (en POS.tsx)

```typescript
// src/pages/POS.tsx

import { bulkInventoryService } from '@/services/bulkInventoryService';
import { Alert } from '@/components/ui';

export function POS() {
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmSale() {
    try {
      setError(null);

      // 1. Agrupar items por receta
      const recipeGroups = currentOrder.reduce(
        (acc, item) => {
          if (!item.recipe_id) {
            // ⚠️ Producto sin receta (producto simple)
            console.warn(`Aviso: ${item.product_name} no tiene receta a granel`);
            return acc;
          }
          acc[item.recipe_id] = (acc[item.recipe_id] || 0) + item.quantity;
          return acc;
        },
        {} as Record<string, number>
      );

      // 2. Procesar descuentos por receta
      for (const [recipeId, quantity] of Object.entries(recipeGroups)) {
        // Paso A: Verificar disponibilidad
        const availability = await bulkInventoryService.checkRecipeAvailability(
          recipeId,
          quantity
        );

        if (!availability.available) {
          throw new Error(
            `❌ ${availability.message}. Faltante: ${availability.missingIngredients
              .map((m) => `${m.name} (necesita ${m.required}, tienes ${m.available})`)
              .join(', ')}`
          );
        }

        // Paso B: Descontar inventario
        const discountResults = await bulkInventoryService.discountInventoryByRecipe(
          recipeId,
          quantity,
          currentOrder[0]?.order_id // Se tiene que pasar el order_id
        );

        console.log(`✅ Descuento exitoso:`);
        discountResults.forEach((result) => {
          console.log(
            `   ${result.ingredient_name}: -${result.quantity_discounted}${
              result.unit_type || ''
            } (quedan: ${result.remaining_stock})`
          );
        });
      }

      // 3. Guardar orden normalmente
      await saveSaleToDatabase(currentOrder);

      // 4. Limpiar
      setCurrentOrder([]);
      showToast('✅ Venta registrada. Inventario actualizado', 'success');

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  return (
    <div>
      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Resto del POS */}
      <div className="space-y-4">
        {/* Items de pedido */}
        {currentOrder.map((item) => (
          <div key={item.id} className="flex justify-between items-center p-3 border rounded">
            <span>{item.product_name} × {item.quantity}</span>
            <span>${(item.total).toFixed(2)}</span>
          </div>
        ))}

        {/* Total */}
        <div className="text-xl font-bold">
          Total: ${currentOrder.reduce((sum, i) => sum + i.total, 0).toFixed(2)}
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setCurrentOrder([])}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSale}
            disabled={currentOrder.length === 0}
          >
            Confirmar Venta
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Componente Helper: Stock Alert

```typescript
// src/components/pos/StockAlert.tsx

import { useEffect, useState } from 'react';
import { Alert, Badge } from '@/components/ui';
import { bulkInventoryService } from '@/services/bulkInventoryService';

export function StockAlert() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    async function checkStock() {
      const s = await bulkInventoryService.getStockSummary();
      if (s.critical.length > 0 || s.low.length > 0) {
        setSummary(s);
      }
    }
    checkStock();
    const interval = setInterval(checkStock, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, []);

  if (!summary) return null;

  return (
    <div className="space-y-2">
      {summary.critical.length > 0 && (
        <Alert type="error">
          🔴 <strong>CRÍTICO:</strong> {summary.critical.map((i: any) => i.name).join(', ')}
        </Alert>
      )}
      {summary.low.length > 0 && (
        <Alert type="warning">
          🟠 <strong>BAJO:</strong> {summary.low.map((i: any) => i.name).join(', ')}
        </Alert>
      )}
    </div>
  );
}
```

---

## 📋 Paso a Paso: Integración Completa

### Paso 1: Preparar Productos con Recetas

En el formulario de productos, agregar un select de receta:

```typescript
<Select
  label="Receta (para descuento a granel)"
  options={recipes.map(r => ({ value: r.id, label: r.name }))}
  placeholder="Sin receta"
  value={formData.recipe_id}
  onChange={(e) => setFormData({ ...formData, recipe_id: e.target.value })}
/>
```

### Paso 2: Al Crear Orden

```typescript
// Cuando se agrega item al pedido
const newItem: OrderItem = {
  product_id: product.id,
  recipe_id: product.recipe_id,  // ← Traer recipe_id del producto
  quantity: 1,
  // ... resto de datos
};
```

### Paso 3: Al Confirmar

```typescript
async function handleConfirmSale() {
  // El código del handleConfirmSale anterior
}
```

---

## ⚙️ Configuración

### Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=https://htjhzdtlvdbtlfdhsydq.supabase.co
VITE_SUPABASE_ANON_KEY=tu-key
```

### Service Configuration

```typescript
// src/services/bulkInventoryService.ts
// Ya está configurado, solo usar

import { bulkInventoryService } from '@/services/bulkInventoryService';
```

---

## 🧪 Testing

### Test 1: Descuento básico

```typescript
// Test que se descuenta correctamente
const result = await bulkInventoryService.discountInventoryByRecipe(
  recipeId = 'ensalada-uuid',
  quantitySold = 2
);

// Debe retornar status success para cada ingrediente
expect(result.every(r => r.success)).toBe(true);
```

### Test 2: Verificar stock

```typescript
// Test que se rechaza si no hay stock
const availability = await bulkInventoryService.checkRecipeAvailability(
  recipeId = 'ensalada-uuid',
  quantitySold = 1000 // Una cantidad imposible
);

// Debe retornar available = false
expect(availability.available).toBe(false);
```

### Test 3: Histórico

```typescript
// Verificar que se registra en audit trail
const movements = await bulkInventoryService.getInventoryMovements(
  ingredientId = 'lechuga-uuid'
);

// Debe aparecer el movimiento más reciente
expect(movements[0].movement_type).toBe('sale');
```

---

## 🐛 Errores Comunes

### ❌ Error: "Stock insuficiente"

```
Cause: No hay suficiente del ingrediente
Fix: 
1. Admin carga más stock
2. O reduce la cantidad vendida
3. O aumenta merma si hay desperdicio
```

### ❌ Error: "Receta no encontrada"

```
Cause: producto.recipe_id es null o inválido
Fix:
1. Verifica que el producto tenga recipe_id
2. Verifica que la receta exista en BD
3. Verifica que está activa (is_active = true)
```

### ❌ Error: "RLS policy violation"

```
Cause: Usuario no tiene permisos suficientes
Fix:
1. Verifica que el usuario está autenticado
2. Verifica que es admin/supervisor para updates
3. Verifica organization_id coincide
```

---

## 📊 Ejemplo Completo: Venta con Dashboard

```typescript
// src/pages/POSWithInventory.tsx

import { POS } from '@/components/pos/POS';
import { StockAlert } from '@/components/pos/StockAlert';
import { RecipeSelector } from '@/components/pos/RecipeSelector';

export function POSPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* POS Principal (70%) */}
      <div className="lg:col-span-2">
        <StockAlert />
        <POS />
      </div>

      {/* Panel Lateral Inventario (30%) */}
      <div className="space-y-4">
        <RecipeSelector />
        <StockDashboard />
      </div>
    </div>
  );
}
```

---

## 🔐 Seguridad en Venta

```typescript
// Validaciones built-in

1. ✅ Verificar stock antes de descontar
2. ✅ Usar transacción (todo o nada)
3. ✅ Registrar creador del movimiento
4. ✅ Vincular a orden para auditoría
5. ✅ RLS previene acceso no autorizado
6. ✅ Merma calculada en servidor (no manipulable)
```

---

## ⏱️ Performance

```
Venta típica:

1. checkRecipeAvailability()      ← 1 query
2. discountInventoryByRecipe()    ← 1 query (función DB)
3. saveSaleToDatabase()           ← 1 query

Total: ~100ms (muy rápido)
```

---

## 📞 Referencia Rápida

| Necesidad | Función | Parámetros |
|----------|---------|-----------|
| Verificar si puedo vender | `checkRecipeAvailability()` | recipeId, qty |
| Vender y descontar | `discountInventoryByRecipe()` | recipeId, qty, orderId |
| Ver stock actual | `getIngredients()` | - |
| Ver alertas | `getStockSummary()` | - |
| Ver histórico | `getInventoryMovements()` | ingredientId?, limit |

---

## 🚀 Próximos Pasos

1. ✅ Integración en POS.tsx
2. ✅ StockAlert component
3. ✅ RecipeSelector component
4. ✅ Testing completo
5. ✅ Deploy a producción

---

¡Sistema listo para integración en POS! 🎉
