# 🔐 Autenticación Multi-Método: PIN + Google OAuth

Este proyecto mantiene **PIN como opción principal** pero agrega **Google OAuth como alternativa moderna**.

---

## 🎯 Arquitectura de Autenticación

```
┌─────────────────────────────────────────┐
│    Pantalla de Login                    │
├─────────────────────────────────────────┤
│                                         │
│  [PIN: ____]  [Google OAuth]            │
│                                         │
│  "Usa tu PIN o conéctate con Google"   │
│                                         │
└─────────────────────────────────────────┘
         ↓                      ↓
    Pin Login              Google Login
    (existente)            (nuevo)
    ↓                      ↓
  Edge Function       Supabase Auth
  (/generate-           Redirect
   access-token)
    ↓                      ↓
  JWT Token           JWT Token
    ↓                      ↓
   └──────┬─────────────┘
          ↓
    Acceso a POS
```

---

## 1️⃣ MANTENER PIN (Ya existe)

El sistema actual ya soporta PIN:

**Archivo:** [src/components/auth/LoginPin.tsx](../../src/components/auth/LoginPin.tsx)

```typescript
// El usuario entra su PIN
const handleSubmit = async (e: React.FormEvent) => {
  const result = await login(pin); // ← Llama a Edge Function
  if (result.success) navigate('/pos');
}
```

**Cómo funciona:**
1. Usuario entra PIN (4-6 dígitos)
2. Se envía a Edge Function `generate-access-token`
3. Edge Function busca usuario por PIN en DB
4. Genera JWT y devuelve al cliente
5. Cliente guarda JWT y accede a la app

---

## 2️⃣ AGREGAR GOOGLE OAUTH

### Paso 1: Configurar Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto (o usa uno existente)
3. Habilita **Google+ API** y **Google Sign-In**
4. En **Credenciales**, crea un **OAuth 2.0 Client ID** de tipo "Web application"
5. Agrega URI autorizadas:
   - `http://localhost:5174`
   - `http://localhost:5175`
   - Tu URL de producción (ej. `https://tuapp.vercel.app`)
6. Copia el **Client ID**

### Paso 2: Configurar en Supabase

1. Abre tu proyecto en [Supabase](https://supabase.com)
2. Ve a **Authentication > Providers**
3. Habilita **Google**:
   - Pega el **Client ID** de Google Cloud
   - Pega el **Client Secret**
   - Haz click en **Save**

### Paso 3: Crear componente Login con Google

Crea un nuevo componente:

**[src/components/auth/LoginGoogle.tsx](../../src/components/auth/LoginGoogle.tsx)**

```typescript
import React from 'react';
import { supabase } from '@/config/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const LoginGoogle: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      // Supabase maneja el redirect automáticamente
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <img src="https://www.gstatic.com/firebaseapp/v8.2.10/images/google-logo.svg" alt="Google" className="w-5 h-5" />
      {loading ? 'Conectando...' : 'Ingresa con Google'}
    </button>
  );
};
```

### Paso 4: Actualizar LoginPin.tsx para dual login

Modifica [src/components/auth/LoginPin.tsx](../../src/components/auth/LoginPin.tsx):

```typescript
import { LoginGoogle } from './LoginGoogle';

export const LoginPin: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();
  const [pin, setPin] = useState('');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Sistema POS
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Elige tu método de ingreso
        </p>

        {/* TAB: PIN */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ingresa con PIN
          </label>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={pin}
              onChange={handlePinChange}
              placeholder="1234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          {authError && <p className="text-red-500 text-sm mt-2">{authError}</p>}
        </div>

        {/* DIVIDER */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-gray-500 text-sm">O</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* TAB: GOOGLE */}
        <LoginGoogle />

        <p className="text-xs text-gray-500 text-center mt-4">
          Para el desarrollo: PIN = 1234 | Admin Demo
        </p>
      </div>
    </div>
  );
};
```

### Paso 5: Crear callback para Google OAuth

Crea [src/pages/AuthCallback.tsx](../../src/pages/AuthCallback.tsx) si no existe:

```typescript
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Usuario autenticado con Google
        // Guardar sesión y redirigir
        navigate('/pos');
      }
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Completando autenticación...</p>
      </div>
    </div>
  );
};
```

---

## 🔄 Sincronizar Usuario de Google con DB

Cuando un usuario entra con Google por primera vez, necesitas crear un registro en la tabla `users`:

**Opción 1: Trigger en Supabase (Recomendado)**

En Supabase SQL Editor:

```sql
-- Crear función para sincronizar usuarios de Google
CREATE OR REPLACE FUNCTION public.sync_google_user_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear user en tabla public.users si no existe
  INSERT INTO public.users (
    organization_id,
    name,
    email,
    auth_provider,
    auth_id,
    role,
    active
  ) VALUES (
    (SELECT id FROM public.organizations LIMIT 1), -- Asignar a primera org (o mejorar lógica)
    NEW.raw_user_meta_data->>'full_name' OR NEW.email,
    NEW.email,
    'google',
    NEW.id,
    'mesero', -- Rol por defecto para Google OAuth
    true
  ) ON CONFLICT DO NOTHING; -- Si ya existe, no hacer nada

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar el trigger cuando un usuario se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_google_user_on_signup();
```

**Opción 2: Desde el frontend**

```typescript
// En LoginGoogle.tsx
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/auth/callback` }
});

// En AuthCallback.tsx, después de que se autentique:
const { data: { session } } = await supabase.auth.getSession();
if (session?.user) {
  // Crear o verificar usuario en public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!existingUser) {
    // Crear nuevo usuario
    await supabase.from('users').insert({
      organization_id: (await getDefaultOrgId()),
      email: session.user.email,
      name: session.user.user_metadata?.full_name,
      auth_provider: 'google',
      auth_id: session.user.id,
      role: 'mesero',
      active: true
    });
  }
  
  navigate('/pos');
}
```

---

## ✅ Flujo Completo Actualizado

```
Cliente Abre App
    ↓
Elige Login
    ├─ PIN → Edge Function → JWT
    └─ Google → Supabase Auth → Callback → JWT
    ↓
JWT guardado en localStorage
    ↓
App verifica token
    ├─ Válido → Acceso a POS
    └─ Inválido → Vuelve a Login
```

---

## 🧪 Testing

### Test PIN:
```bash
curl -X POST http://localhost:5174/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","deviceInfo":{"fingerprint":"test"}}'
```

### Test Google:
1. Click en "Ingresa con Google"
2. Select tu cuenta Google
3. Deberías redirigir a `/auth/callback`
4. Luego a `/pos`

---

## 🔒 Seguridad

- ✅ PIN almacenado en texto plano (mejorarlo con bcrypt)
- ✅ Google OAuth usa Supabase Auth (seguro)
- ✅ JW tokens expiración: 24 horas
- ✅ RLS en todas las tablas por organization_id

---

## Archivos a modificar:

- [x] [src/components/auth/LoginPin.tsx](../../src/components/auth/LoginPin.tsx) - agregar LoginGoogle
- [ ] [src/components/auth/LoginGoogle.tsx](../../src/components/auth/LoginGoogle.tsx) - crear nuevo
- [ ] [src/pages/AuthCallback.tsx](../../src/pages/AuthCallback.tsx) - crear/actualizar
- [ ] [docs/setup/GOOGLE_OAUTH_SETUP.md](../../docs/setup/GOOGLE_OAUTH_SETUP.md) - instrucciones paso a paso

---

## Próximos pasos:

1. ✅ Pin + tenemos funcionando
2. ⏳ Google OAuth (implementar con este guide)
3. ⏳ Hashear PIN con bcrypt
4. ⏳ Email/Password (opcional)
