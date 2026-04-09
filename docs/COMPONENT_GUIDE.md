# 🎨 REISBLOC UI Component Guide

Guía de uso del sistema de componentes uniformes para toda la aplicación.

## 📦 Importación

```typescript
// Importar componentes
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Badge, 
  Alert, 
  Modal, 
  Table, 
  LoadingSpinner,
  Button
} from '@/components/ui';

// Importar design tokens
import { 
  designTokens, 
  tailwindClasses, 
  getButtonClass,
  classNames 
} from '@/components/ui';
```

## 🔘 Button

Botones con 4 variantes y 3 tamaños.

### Variantes
- `primary` (azul) - Acciones principales
- `secondary` (gris) - Acciones secundarias
- `danger` (rojo) - Acciones destructivas
- `success` (verde) - Acciones exitosas

### Ejemplos

```tsx
// Botón primario
<Button variant="primary" size="md">
  Guardar
</Button>

// Botón con estado de carga
<Button isLoading variant="primary">
  Guardando...
</Button>

// Botón deshabilitado
<Button disabled>
  No disponible
</Button>

// Botón de peligro
<Button variant="danger" onClick={handleDelete}>
  Eliminar
</Button>
```

### Props
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'; // default: 'primary'
  size?: 'sm' | 'md' | 'lg';                              // default: 'md'
  isLoading?: boolean;                                     // default: false
  disabled?: boolean;
  children: React.ReactNode;
  // ... todos los props estándar de HTML button
}
```

---

## 📋 Card

Componente contenedor con bordes y sombras.

### Ejemplos

```tsx
// Card simple
<Card>
  <p>Contenido de la tarjeta</p>
</Card>

// Card con título
<Card title="Mi Receta">
  <p>Detalles de la receta aquí</p>
</Card>

// Card con título y subtítulo
<Card 
  title="Hamburguesa" 
  subtitle="Producto principal"
>
  <p>Descripción...</p>
</Card>

// Card destacada
<Card highlight>
  <p>Esta tarjeta destaca especialmente</p>
</Card>

// Card sin bordes
<Card bordered={false}>
  <p>Contenido flotante</p>
</Card>
```

### Props
```typescript
interface CardProps {
  title?: string | React.ReactNode;
  subtitle?: string;
  bordered?: boolean;        // default: true
  highlight?: boolean;       // default: false
  children: React.ReactNode;
}
```

---

## 📝 Input

Campo de entrada con validación y soporte a iconos.

### Ejemplos

```tsx
// Input básico
<Input 
  placeholder="Ingrese su nombre"
  value={nombre}
  onChange={(e) => setNombre(e.target.value)}
/>

// Input con label
<Input 
  label="Nombre del producto"
  placeholder="Hamburguesa"
  type="text"
/>

// Input con error
<Input 
  label="PIN"
  type="password"
  error="PIN incorrecto"
/>

// Input con helper text
<Input 
  label="Precio"
  type="number"
  helperText="Ingrese el precio sin símbolo"
/>

// Input con ícono
<Input 
  label="Buscar"
  icon="🔍"
  placeholder="Buscar producto..."
/>
```

### Props
```typescript
interface InputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
  type?: string;            // default: 'text'
  placeholder?: string;
  disabled?: boolean;
  // ... todos los props estándar de HTML input
}
```

---

## 🎯 Select

Dropdown con opciones.

### Ejemplos

```tsx
// Select básico
<Select 
  options={[
    { value: 'admin', label: 'Administrador' },
    { value: 'mesero', label: 'Mesero' },
    { value: 'cocinero', label: 'Cocinero' }
  ]}
  value={role}
  onChange={(e) => setRole(e.target.value)}
/>

// Select con label y placeholder
<Select 
  label="Rol de usuario"
  placeholder="Seleccionar rol..."
  options={roleOptions}
/>

// Select con error
<Select 
  label="Categoría"
  options={categories}
  error="Campo requerido"
/>
```

### Props
```typescript
interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string|number, label: string }[];
  placeholder?: string;
  // ... todos los props estándar de HTML select
}
```

---

## 🏷️ Badge

Etiqueta estado con colores.

### Variantes
- `success` (verde) - Para estados positivos
- `warning` (amarillo) - Para advertencias
- `danger` (rojo) - Para errores
- `info` (azul) - Para información

### Ejemplos

```tsx
// Badge simple
<Badge>En stock</Badge>

// Badge con variante
<Badge variant="success">Disponible</Badge>

// Badge warning
<Badge variant="warning">Bajo stock</Badge>

// Badge danger
<Badge variant="danger">Agotado</Badge>

// Badge tamaño grande
<Badge variant="info" size="lg">
  Información importante
</Badge>
```

### Props
```typescript
interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info';  // default: 'info'
  size?: 'sm' | 'md' | 'lg';                            // default: 'md'
  children: React.ReactNode;
}
```

---

## ⚠️ Alert

Mensaje de alerta con 4 tipos.

### Tipos
- `success` (verde) - Operación exitosa
- `error` (rojo) - Error
- `warning` (amarillo) - Advertencia
- `info` (azul) - Información

### Ejemplos

```tsx
// Alert simple
<Alert type="success">
  ¡Guardado exitosamente!
</Alert>

// Alert con título
<Alert type="error" title="Error de validación">
  El PIN debe tener 4-6 dígitos
</Alert>

// Alert no dismissible
<Alert type="warning" dismissible={false}>
  Esta es una advertencia permanente
</Alert>

// Alert con callback
<Alert 
  type="info"
  onDismiss={() => console.log('Cerrado')}
>
  Este es un mensaje informativo
</Alert>
```

### Props
```typescript
interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';  // default: 'info'
  title?: string;
  dismissible?: boolean;        // default: true
  onDismiss?: () => void;
  children: React.ReactNode;
}
```

---

## 🪟 Modal

Cuadro de diálogo modal.

### Ejemplos

```tsx
// Modal simple
const [isOpen, setIsOpen] = useState(false);

<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmar acción"
>
  <p>¿Está seguro de que desea continuar?</p>
</Modal>

// Modal con footer (botones)
<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Crear receta"
  size="lg"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleCreate}>
        Crear
      </Button>
    </>
  }
>
  <Input label="Nombre" />
  <Select label="Categoría" options={categories} />
</Modal>

// Modal personalizado
<Modal 
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  title="Configuración"
  size="md"
>
  <Card>
    <p>Contenido personalizado aquí</p>
  </Card>
</Modal>
```

### Props
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';   // default: 'md'
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

---

## 📊 Table

Tabla con datos tabulares.

### Ejemplos

```tsx
// Interface para datos
interface Recipe {
  id: number;
  name: string;
  category: string;
  cost: number;
  status: 'active' | 'inactive';
}

const recipes: Recipe[] = [
  { id: 1, name: 'Hamburguesa', category: 'Main', cost: 5.99, status: 'active' },
  { id: 2, name: 'Papas', category: 'Side', cost: 2.50, status: 'active' }
];

// Tabla básica
<Table
  columns={[
    { key: 'name', label: 'Nombre' },
    { key: 'category', label: 'Categoría' },
    { key: 'cost', label: 'Costo' }
  ]}
  data={recipes}
/>

// Tabla con render personalizado y click
<Table
  columns={[
    { key: 'name', label: 'Nombre', width: '300px' },
    { 
      key: 'status', 
      label: 'Estado',
      render: (value) => (
        <Badge variant={value === 'active' ? 'success' : 'warning'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'cost',
      label: 'Costo',
      render: (value) => `$${value.toFixed(2)}`
    }
  ]}
  data={recipes}
  onRowClick={(recipe) => handleEdit(recipe)}
/>

// Tabla con loading
<Table
  columns={columns}
  data={recipes}
  isLoading={isLoading}
/>

// Tabla vacía
<Table
  columns={columns}
  data={[]}
  emptyMessage="No hay recetas disponibles"
/>
```

### Props
```typescript
interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;        // default: false
  emptyMessage?: string;      // default: 'No data available'
}

interface TableColumn<T> {
  key: keyof T;
  label: string;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}
```

---

## ⏳ LoadingSpinner

Indicador de carga.

### Ejemplos

```tsx
// Spinner simple
<LoadingSpinner />

// Spinner con mensaje
<LoadingSpinner message="Cargando recetas..." />

// Spinner tamaño pequeño
<LoadingSpinner size="sm" />

// Spinner tamaño grande
<LoadingSpinner size="lg" message="Por favor espere..." />
```

### Props
```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';  // default: 'md'
  message?: string;
}
```

---

## 🎨 Design Tokens

Acceda a los tokens de diseño directamente:

```tsx
import { designTokens, tailwindClasses } from '@/components/ui';

// Colores
const primaryColor = designTokens.colors.primary[500];  // #3B82F6

// Espacios
const padding = designTokens.spacing[4];  // 1rem

// Tipografía
const heading1 = designTokens.typography.heading1;

// Clases Tailwind reutilizables
<div className={tailwindClasses.container}>
  <div className={tailwindClasses.card}>
    Contenido
  </div>
</div>
```

---

## 📝 Ejemplo Completo

```tsx
import { useState } from 'react';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Table, 
  Alert,
  Modal,
  Badge
} from '@/components/ui';

export function RecipeManagement() {
  const [recipes, setRecipes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '' });
  const [message, setMessage] = useState('');

  const handleCreate = () => {
    // Validar
    if (!formData.name) {
      setMessage('El nombre es requerido');
      return;
    }
    // Crear
    setRecipes([...recipes, formData]);
    setFormData({ name: '', category: '' });
    setShowModal(false);
    setMessage('¡Receta creada exitosamente!');
  };

  return (
    <div className="p-6 space-y-6">
      <Card title="Gestión de Recetas">
        <div className="space-y-4">
          {message && (
            <Alert type="success" onDismiss={() => setMessage('')}>
              {message}
            </Alert>
          )}

          <Button onClick={() => setShowModal(true)}>
            Crear Receta
          </Button>

          <Table
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'category', label: 'Categoría' }
            ]}
            data={recipes}
            emptyMessage="No hay recetas creadas"
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva Receta"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Nombre de la receta"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Select
            label="Categoría"
            options={[
              { value: 'main', label: 'Principal' },
              { value: 'side', label: 'Acompañamiento' }
            ]}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
```

---

## 🚀 Mejores Prácticas

1. **Usa los componentes para mantener consistencia** - No uses HTML directo
2. **Aprovecha los design tokens** - Para mantener colores y espacios uniformes
3. **Usa TypeScript** - Los componentes son totalmente tipados
4. **Responsive design** - Los componentes son mobile-first
5. **Accesibilidad** - Todos los componentes soportan a11y

---

## 📱 Responsive

Los componentes son totalmente responsive usando Tailwind CSS:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card title="Card 1">...</Card>
  <Card title="Card 2">...</Card>
  <Card title="Card 3">...</Card>
</div>
```

---

¡Felicidades! Ahora tienes un sistema de componentes profesional y uniforme. 🎉
