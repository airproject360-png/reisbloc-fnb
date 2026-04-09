# 🎨 DESIGN SYSTEM IMPLEMENTATION GUIDE

## Introducción

Se ha creado un **sistema de componentes uniforme y profesional** para toda la aplicación. Todos los componentes están centralizados y listas para usarse en cualquier página.

## ✅ Qué se ha completado

### 1. **Componentes Base Creados**
- ✅ `Button.tsx` - Botones con 4 variantes y 3 tamaños
- ✅ `FormComponents.tsx` - Card, Input, Select, Badge
- ✅ `LayoutComponents.tsx` - Alert, Modal, Table, LoadingSpinner
- ✅ `designSystem.ts` - Design tokens y clases reutilizables
- ✅ `index.tsx` - Barrel export para importación clean

### 2. **Documentación Completa**
- ✅ `COMPONENT_GUIDE.md` - Guía de uso con ejemplos
- ✅ Design tokens definidos (colores, espacios, tipografía)
- ✅ Funciones helper para clases CSS

### 3. **Páginas Ejemplo**
- ✅ `AdminRecipes.tsx` - Página completa usando design system

## 🚀 Cómo Usar

### Importación Simple
```typescript
import { 
  Button, 
  Card, 
  Input, 
  Alert,
  Modal,
  Table,
  // ... más componentes
} from '@/components/ui';
```

### Ejemplo Mínimo
```tsx
import { Button, Card } from '@/components/ui';

export function MyPage() {
  return (
    <Card title="Mi Tarjeta">
      <Button variant="primary">
        Hacer algo
      </Button>
    </Card>
  );
}
```

## 📋 Plan de Integración (Próximas Tareas)

### Fase 1: Páginas de Autenticación
**Archivos a actualizar:**
- [ ] `src/pages/Login.tsx` - Usar Card, Input, Button, Alert
- [ ] `src/pages/AuthCallback.tsx` - Usar LoadingSpinner, Alert

**Cambios sugeridos:**
```tsx
// ANTES: HTML directo
<div className="border border-gray-300 rounded p-6">
  <input className="border px-4 py-2" />
  <button className="bg-blue-600 text-white px-4 py-2">Login</button>
</div>

// DESPUÉS: Design System
<Card title="Iniciar Sesión">
  <Input label="PIN" type="password" />
  <Button variant="primary" fullWidth>
    Login
  </Button>
</Card>
```

### Fase 2: Páginas de Punto de Venta
**Archivos a actualizar:**
- [ ] `src/pages/POS.tsx` - Table para órdenes, Buttons para acciones
- [ ] `src/pages/Kitchen.tsx` - Alert para estados, Badge para prioridad
- [ ] `src/pages/Bar.tsx` - Card para bebidas, Table para gestión

### Fase 3: Páginas de Administración
**Archivos a actualizar:**
- [ ] `src/pages/Admin.tsx` - Modal para crear, Table para listar
- [ ] `src/pages/Reports.tsx` - Table para datos, Card para resumen

### Fase 4: Componentes Específicos
**Archivos a crear/actualizar:**
- [ ] `src/components/admin/RecipeForm.tsx` - Formulario con componentes
- [ ] `src/components/admin/IngredientsList.tsx` - Table de ingredientes
- [ ] `src/components/admin/SeedDataButton.tsx` - Button para seed-data

## 📝 Checklist de Conversión

Para cada página que actualices, verifica:

- [ ] Todas las Cards usan `<Card title="...">` en lugar de divs
- [ ] Todos los Inputs usan `<Input label="...">` con validación
- [ ] Todos los Selects usan `<Select options={...}>`
- [ ] Los Buttons cumplen: `<Button variant="primary">`
- [ ] Las Alertas usan `<Alert type="success">`
- [ ] Los Modales son controlados con `isOpen` state
- [ ] Las Tablas usan el componente `<Table>`
- [ ] Los colores son del `designTokens` (sin colores manuales)
- [ ] El responsive usa clases grid/flex de Tailwind

## 🎯 Próximo: Seed Data

Una vez el design system esté integrado, crearemos:

```tsx
// src/components/admin/SeedDataButton.tsx
<Modal
  isOpen={showSeedModal}
  title="Cargar Datos Demo"
  footer={
    <Button onClick={handleSeedData}>
      Cargar Ingredientes
    </Button>
  }
>
  <Alert type="info">
    Esto creará 16 ingredientes y 5 categorías demo
  </Alert>
</Modal>
```

## 🔄 Migración Paso a Paso

### Paso 1: Actualizar Login.tsx
```tsx
// src/pages/Login.tsx
import { useState } from 'react';
import { Card, Input, Button, Alert } from '@/components/ui';

export function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!pin) {
      setError('PIN requerido');
      return;
    }
    // ... login logic
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card 
        title="REISBLOC POS" 
        subtitle="Sistema de Punto de Venta"
        className="w-full max-w-md"
      >
        {error && (
          <Alert type="error" onDismiss={() => setError('')}>
            {error}
          </Alert>
        )}
        
        <Input
          label="Ingrese su PIN"
          type="password"
          placeholder="1234"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        
        <Button 
          variant="primary" 
          fullWidth 
          onClick={handleLogin}
          className="mt-4"
        >
          Ingresar
        </Button>
      </Card>
    </div>
  );
}
```

### Paso 2: Actualizar POS.tsx
```tsx
// Agregar Table para pedidos
<Table
  columns={[
    { key: 'orderNumber', label: 'Pedido' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Estado', render: (v) => <Badge>{v}</Badge> }
  ]}
  data={orders}
  onRowClick={selectOrder}
/>
```

### Paso 3: Actualizar Kitchen.tsx
```tsx
// Usar Alert para estados
<Alert type="warning">
  3 órdenes pendientes de preparar
</Alert>

// Usar Badge para prioridad
<Badge variant="danger">URGENTE</Badge>
```

## 🎨 Ejemplos Completos por Página

### Login Page
```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
  <Card title="REISBLOC POS" className="w-96">
    <div className="space-y-4">
      <Input label="PIN" type="password" placeholder="Ingresa tu PIN" />
      <Button variant="primary" fullWidth>Ingresar</Button>
      <Alert type="info">Se requieren 4-6 dígitos</Alert>
    </div>
  </Card>
</div>
```

### Admin Orders
```tsx
<div className="space-y-6">
  <div className="flex justify-between items-center">
    <h1 className="text-3xl font-bold">Pedidos</h1>
    <Button onClick={() => setShowNew(true)}>+ Nuevo</Button>
  </div>
  
  <Table columns={ordersColumns} data={orders} onRowClick={edit} />
  
  <Modal isOpen={showNew} title="Nuevo Pedido">
    {/* Form inside */}
  </Modal>
</div>
```

### Kitchen Dashboard
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {orders.map(order => (
    <Card 
      key={order.id}
      title={`Pedido #${order.id}`}
      highlight={order.priority === 'high'}
    >
      <div className="space-y-2">
        <p>Items: {order.items.join(', ')}</p>
        <Badge variant={order.priority}>
          {order.priority.toUpperCase()}
        </Badge>
        <Button fullWidth onClick={() => markReady(order.id)}>
          Listo
        </Button>
      </div>
    </Card>
  ))}
</div>
```

## 🔧 Utilidades Disponibles

```tsx
import { 
  designTokens,
  tailwindClasses,
  getButtonClass,
  classNames,
  icons
} from '@/components/ui';

// Usar design tokens directamente
const primaryColor = designTokens.colors.primary[500];
const padding = designTokens.spacing[4];

// Clases reutilizables
const containerClass = tailwindClasses.container;
const cardClass = tailwindClasses.card;

// Funciones helper
const btnClass = getButtonClass('primary');
const merged = classNames('flex', true && 'flex-col', false && 'hidden');

// Iconos
{icons.check}  // ✓
{icons.danger} // ⚠️
{icons.loading} // ⏳
```

## 📚 Arquitectura de Carpetas

```
src/
├── components/
│   └── ui/                    ← Componentes centralizados
│       ├── Button.tsx
│       ├── FormComponents.tsx
│       ├── LayoutComponents.tsx
│       └── index.tsx           ← Barrel export
├── styles/
│   └── designSystem.ts         ← Tokens y utilidades
└── pages/
    ├── Login.tsx              ← Usa componentes
    ├── POS.tsx
    ├── Admin.tsx
    └── AdminRecipes.tsx        ← Ejemplo completo
```

## 🚨 Reglas Importantes

1. **NO** uses HTML directo para inputs/buttons
2. **SIEMPRE** importa de `@/components/ui`
3. **NUNCA** hardcodes colores - usa `designTokens`
4. **SIEMPRE** usa TypeScript para props
5. **NUNCA** repitas estilos - usa clases Tailwind o design tokens

## ✨ Beneficios

- ✅ Consistencia visual en toda la app
- ✅ Mantenimiento más fácil
- ✅ Cambios de estilo globales sin tocar cada página
- ✅ Componentes reutilizables
- ✅ TypeScript para seguridad
- ✅ Responsive design automático
- ✅ Accesibilidad mejorada

## 📞 Soporte

Para preguntas sobre uso de componentes:
1. Revisa [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)
2. Mira el ejemplo completo en `AdminRecipes.tsx`
3. Consulta los tipos TypeScript en cada componente

---

## Próximos Pasos

1. ✅ Design System creado
2. ⏳ Integrar en Login.tsx
3. ⏳ Integrar en POS.tsx
4. ⏳ Integrar en Kitchen.tsx
5. ⏳ Integrar en Admin.tsx
6. ⏳ Crear componentes específicos (RecipeForm, IngredientsList)
7. ⏳ Crear AdminRecipes completa con API real

¡Vamos a crear la UI más profesional! 🚀
