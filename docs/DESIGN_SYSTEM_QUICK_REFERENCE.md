# 🚀 DESIGN SYSTEM - QUICK REFERENCE

> Guía rápida para usar componentes. Para más detalles, ver [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)

## 📥 Importar

```typescript
import { 
  Button, Card, Input, Select, Badge, Alert, Modal, Table, LoadingSpinner,
  designTokens, tailwindClasses 
} from '@/components/ui';
```

---

## 🔘 Button

```tsx
// Básico
<Button>Click</Button>

// Variantes
<Button variant="primary">Primary</Button>      // Azul
<Button variant="secondary">Secondary</Button>  // Gris
<Button variant="danger">Delete</Button>        // Rojo
<Button variant="success">Save</Button>         // Verde

// Tamaños
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Estados
<Button disabled>Disabled</Button>
<Button isLoading>Loading...</Button>
<Button onClick={handleClick}>Action</Button>
```

---

## 📦 Card

```tsx
// Básico
<Card>Content</Card>

// Con título
<Card title="My Card">Content</Card>

// Con título y subtítulo
<Card title="Title" subtitle="Subtitle">Content</Card>

// Estilos
<Card highlight>Highlighted card</Card>
<Card bordered={false}>No border card</Card>
```

---

## 📝 Input

```tsx
// Básico
<Input placeholder="Type here" />

// Con label
<Input label="Email" type="email" />

// Con error
<Input error="Invalid email" />

// Con helper text
<Input helperText="Min 8 characters" />

// Con icono
<Input icon="🔍" placeholder="Search" />

// Completo
<Input 
  label="PIN"
  type="password"
  placeholder="1234"
  error={hasError ? "Invalid PIN" : undefined}
  helperText="4-6 digits"
/>
```

---

## 🎯 Select

```tsx
// Básico
<Select 
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' }
  ]}
/>

// Con placeholder
<Select 
  placeholder="Select role..."
  options={roleOptions}
/>

// Con label y error
<Select 
  label="Category"
  options={categories}
  error="Required field"
/>
```

---

## 🏷️ Badge

```tsx
// Básico
<Badge>Default</Badge>

// Variantes
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="info">Info</Badge>

// Tamaños
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

---

## ⚠️ Alert

```tsx
// Básico
<Alert type="success">Success message</Alert>

// Tipos
<Alert type="success">✓ Éxito</Alert>
<Alert type="error">✕ Error</Alert>
<Alert type="warning">! Advertencia</Alert>
<Alert type="info">ℹ Información</Alert>

// Con título
<Alert type="error" title="Error">
  Something went wrong
</Alert>

// No dismissible
<Alert type="warning" dismissible={false}>
  Permanent alert
</Alert>

// Con callback
<Alert onDismiss={() => console.log('closed')}>
  Message
</Alert>
```

---

## 🪟 Modal

```tsx
const [isOpen, setIsOpen] = useState(false);

// Básico
<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="My Modal"
>
  Content
</Modal>

// Con footer
<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save
      </Button>
    </>
  }
>
  Are you sure?
</Modal>

// Tamaños
<Modal size="sm">Small</Modal>   // 384px
<Modal size="md">Medium</Modal>  // 448px
<Modal size="lg">Large</Modal>   // 512px
```

---

## 📊 Table

```tsx
interface Item {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  color: string;
}

const data: Item[] = [
  { id: 1, name: 'Item 1', status: 'active', color: 'blue' },
  { id: 2, name: 'Item 2', status: 'inactive', color: 'red' }
];

// Básico
<Table 
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' }
  ]}
  data={data}
/>

// Con render personalizado
<Table 
  columns={[
    { key: 'name', label: 'Name' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'active' ? 'success' : 'warning'}>
          {value}
        </Badge>
      )
    }
  ]}
  data={data}
/>

// Con row click
<Table 
  columns={columns}
  data={data}
  onRowClick={(row) => console.log('clicked', row)}
/>

// Con loading
<Table 
  columns={columns}
  data={data}
  isLoading={true}
/>

// Con mensaje vacío
<Table 
  columns={columns}
  data={data}
  emptyMessage="No items found"
/>
```

---

## ⏳ LoadingSpinner

```tsx
// Básico
<LoadingSpinner />

// Con mensaje
<LoadingSpinner message="Cargando..." />

// Tamaños
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />

// Completo
<LoadingSpinner 
  size="lg" 
  message="Por favor espere..."
/>
```

---

## 💾 SeedDataButton

```tsx
import { SeedDataButton } from '@/components/admin';

// Básico
<SeedDataButton token={jwtToken} />

// Con callbacks
<SeedDataButton
  token={jwtToken}
  onSuccess={() => loadRecipes()}
  onError={(err) => showToast(err)}
/>
```

---

## 🎨 Design Tokens

```typescript
import { designTokens } from '@/components/ui';

// Colores
designTokens.colors.primary[500]    // #3B82F6
designTokens.colors.success         // #10B981
designTokens.colors.danger          // #EF4444
designTokens.colors.neutral[900]    // #111827

// Espacios
designTokens.spacing[2]             // 0.5rem (8px)
designTokens.spacing[4]             // 1rem   (16px)
designTokens.spacing[6]             // 1.5rem (24px)

// Border radius
designTokens.borderRadius.md        // 0.75rem (12px)
designTokens.borderRadius.lg        // 1rem    (16px)

// Tipografía
designTokens.typography.heading1
// { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }

designTokens.typography.body
// { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 }

// Sombras
designTokens.shadows.md
// CSS shadow string
```

---

## 🛠️ Clases Tailwind Reutilizables

```typescript
import { tailwindClasses } from '@/components/ui';

tailwindClasses.container        // Max width + padding
tailwindClasses.card             // Card base
tailwindClasses.cardPadding      // Internal padding
tailwindClasses.buttonPrimary    // Button primary
tailwindClasses.input            // Input base
tailwindClasses.label            // Label text
tailwindClasses.badgeSuccess     // Success badge
```

---

## 🔧 Utilidades

```typescript
import { 
  getButtonClass, 
  getColorClass, 
  classNames,
  icons 
} from '@/components/ui';

// Button classes
getButtonClass('primary')        // Retorna clases para botón

// Color classes
getColorClass('success')         // Retorna clases para color

// Merge clases
classNames('flex', true && 'flex-col', false && 'hidden')
// "flex flex-col"

// Iconos
<span>{icons.check}</span>       // ✓
<span>{icons.danger}</span>      // ⚠️
<span>{icons.loading}</span>     // ⏳
```

---

## 📋 Ejemplo Completo

```tsx
import { useState } from 'react';
import { Button, Card, Input, Alert, Modal } from '@/components/ui';

export function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = () => {
    setMessage('¡Guardado!');
    setShowModal(false);
  };

  return (
    <div className="p-6">
      {message && (
        <Alert type="success" onDismiss={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Card title="Form">
        <div className="space-y-4">
          <Input label="Name" placeholder="Enter name" />
          <Button onClick={() => setShowModal(true)}>
            Open Dialog
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save
            </Button>
          </>
        }
      >
        Are you sure?
      </Modal>
    </div>
  );
}
```

---

## 🎯 Variantes y Props Comunes

### Button Props
```typescript
variant?: 'primary' | 'secondary' | 'danger' | 'success'
size?: 'sm' | 'md' | 'lg'
isLoading?: boolean
disabled?: boolean
onClick?: () => void
```

### Input Props
```typescript
label?: string
error?: string
icon?: React.ReactNode
helperText?: string
type?: string
placeholder?: string
disabled?: boolean
value?: string
onChange?: (e) => void
```

### Select Props
```typescript
label?: string
error?: string
options: { value: string|number, label: string }[]
placeholder?: string
disabled?: boolean
value?: string
onChange?: (e) => void
```

### Badge Props
```typescript
variant?: 'success' | 'warning' | 'danger' | 'info'
size?: 'sm' | 'md' | 'lg'
```

### Alert Props
```typescript
type?: 'success' | 'error' | 'warning' | 'info'
title?: string
dismissible?: boolean
onDismiss?: () => void
```

### Modal Props
```typescript
isOpen: boolean
onClose: () => void
title: string
size?: 'sm' | 'md' | 'lg'
footer?: React.ReactNode
```

### Table Props
```typescript
columns: TableColumn<T>[]
data: T[]
onRowClick?: (row: T) => void
isLoading?: boolean
emptyMessage?: string
```

---

## 🚀 Tips & Tricks

1. **Composición** - Combina componentes para UI complejas
2. **Estado** - Usa useState para modales y alerts
3. **Callbacks** - Pasa onSuccess/onError a componentes
4. **Responsive** - Usa grid/flex de Tailwind
5. **TypeScript** - Todos los props están tipados

---

## 📌 Archivo Rápido

| Archivo | Propósito |
|---------|-----------|
| `src/components/ui/Button.tsx` | Componente Button |
| `src/components/ui/FormComponents.tsx` | Card, Input, Select, Badge |
| `src/components/ui/LayoutComponents.tsx` | Alert, Modal, Table, Spinner |
| `src/styles/designSystem.ts` | Tokens y utilidades |
| `src/components/ui/index.tsx` | Barrel export |
| `docs/COMPONENT_GUIDE.md` | Guía completa |
| `docs/DESIGN_SYSTEM_SUMMARY.md` | Resumen técnico |

---

¡Listo para usar! 🎉
