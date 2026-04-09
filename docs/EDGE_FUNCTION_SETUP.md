# 🔧 Configuración Actualizada - Edge Function y Schema

## ✅ Lo que se actualizó:

### 1. **Edge Function `generate-access-token`** 
- ✅ Arreglado error CORS
- ✅ Simplificado y funcional
- ✅ Genera JWT válido
- ✅ Procesa dispositivos automáticamente
- ✅ NO requiere librerías externas complicadas

**Ubicación:** [supabase/functions/generate-access-token/index.ts](../supabase/functions/generate-access-token/index.ts)

### 2. **Schema SQL Actualizado**
- ✅ Campos de OAuth agregados (`auth_provider`, `auth_id`, `email`)
- ✅ Campo `pin_hash` preparado para security (bcrypt en el futuro)
- ✅ Usuario admin inicial: PIN `1234`
- ✅ Productos de demo

**Ubicación:** [supabase/schema.sql](../supabase/schema.sql)

---

## 📝 Pasos para actualizar en Supabase:

### 1. Deletear el schema anterior (PRECAUCIÓN: Esto borra datos)
En Supabase **SQL Editor**, ejecuta primero una limpieza:

```sql
-- Solo si ya ejecutaste el schema anterior y quieres limpiar
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.closings CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
```

### 2. Ejecutar el schema nuevo
- Abre [supabase/schema.sql](../supabase/schema.sql)
- Copia TODO el contenido
- Ve a tu Supabase > **SQL Editor**
- Pega y ejecuta (**Run** o Ctrl+Enter)

---

## 🔐 Credenciales de Prueba:

**Login por PIN:**
- PIN: `1234`
- Usuario: Admin Demo

**Login por Google OAuth:** (próximamente)
- Configurar en [docs/setup/GOOGLE_OAUTH_SETUP.md](../../docs/setup/GOOGLE_OAUTH_SETUP.md)

---

## 🧪 Prueba rápida:

1. Inicia el servidor: `npm run dev`
2. Abre [http://localhost:5174](http://localhost:5174)
3. Intenta login con PIN: `1234`
4. Deberías ver la pantalla de POS

---

## 🔄 Próximos pasos:

1. **Google OAuth** - Crear component de login alternativa
2. **PIN Hash** - Implementar bcrypt en backend
3. **Email/Password** - Opción adicional de autenticación

---

## 🐛 Si hay errores:

### Error: "PIN inválido"
- Verifica que el usuario tiene `active = true`
- Comprueba que el PIN es exactamente `1234`

### Error: "CORS"
- La Edge Function ya debe estar corregida
- Reinicia el dev server: `npm run dev`

### Error: "Organization not found"
- Ejecuta nuevamente el schema completo
- Verifica que la org se creó en la DB

---

## 📚 Referencias:

- [jwtService.ts](../../src/services/jwtService.ts) - Llamada a Edge Function
- [authService.ts](../../src/services/authService.ts) - Lógica de autenticación
- [LoginPin.tsx](../../src/components/auth/LoginPin.tsx) - UI de login
