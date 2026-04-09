# 🔐 Arquitectura de Autenticación: PIN + Google OAuth 2FA

## 📋 Resumen

Tu sistema implementa una autenticación **adaptativa y segura**:

- **PIN + Token Válido** = Acceso rápido (día a día, mismo dispositivo)
- **Detección de Anomalías** = Si cambia dispositivo/IP/ubicación
- **Google OAuth 2FA** = Verificación de identidad en cambios sospechosos
- **Multi-tenant Seguro** = Aislamiento por `organization_id` con RLS

---

## 🎯 Flujo de Autenticación

```
┌─────────────────────────────────────────────────┐
│ Usuario ingresa PIN                             │
└─────────────────────┬───────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ Edge Function            │
        │ 1. Validar PIN           │
        │ 2. Buscar usuario en DB  │
        │ 3. Obtener geolocalización
        │ 4. Detectar anomalías    │
        └──────────┬────────────────┘
                   ↓
    ┌──────────────────────────────────────┐
    │ ¿Cambio de IP/Device/Ubicación?     │
    └──────────┬──────────────────┬────────┘
     NO        │                  │ SI
               ↓                  ↓
    ┌──────────────────┐  ┌─────────────────────────────┐
    │ Generar JWT      │  │ Requerir Google OAuth 2FA   │
    │ Acceso permitido │  │ Response 403 + 2FA required │
    │ (24 horas)       │  └──────────┬──────────────────┘
    └──────────────────┘             │
                                     ↓
                        ┌────────────────────────┐
                        │ Usuario loginea c/ Google
                        │ Verifica Identidad     │
                        └────────────┬───────────┘
                                     ↓
                      ┌──────────────────────────`
                      │ Generar JWT c/ Sesión
                      │ session.two_fa_verified = true
                      └──────────────────────────┘
                                     ↓
                      ┌──────────────────────────┐
                      │ Acceso Concedido a POS   │
                      └──────────────────────────┘
```

---

## 🔍 Detección de Anomalías

El sistema detecta **automáticamente**:

### 1. **Cambio de IP**
```sql
IF last_login.ip_address != new_ip THEN
  REQUIRES 2FA ← Alguien desde otra ubicación
END
```

**Escenario:** Mesero que trabaja en sucursal A intenta acceder desde sucursal B
- ✅ Si es su empresa (mismo tenant) → Puede verificar con Google
- ❌ Si es otra empresa → Acceso denegado

### 2. **Cambio de Dispositivo**
```sql
IF last_login.device_fingerprint != new_fingerprint THEN
  REQUIRES 2FA ← Nuevo dispositivo no registrado
END
```

**Escenario:** Admin usa tablet nueva
- Tablet aún no aprobada → Requiere Google OAuth

### 3. **Cambio de Ubicación**
```sql
IF last_login.country != new_location.country THEN
  REQUIRES 2FA ← Viaje a otro país
END
```

**Escenario:** Gerente viajando
- IP de México → IP de España
- ⚠️ Viaje de miles de km detectado
- Requiere verificación con Google

### 4. **Velocidad Imposible** (Futuro)
```
if distance > 900km/hour THEN
  BLOCK LOGIN ← Teleportación detectada
END
```

---

## 🗄️ Tablas de Base de Datos

### `devices`
```sql
-- Información del dispositivo
id, user_id, organization_id,
device_name, fingerprint, ip_address,
geolocation (JSON: {country, city, lat, lng}),
is_trusted, requires_2fa, is_approved
```

### `login_sessions`
```sql
-- Historial de intentos de login
id, user_id, organization_id,
auth_method ('pin', 'google_oauth'),
requires_2fa, two_fa_verified,
anomalies (JSON: {ip_change, device_change, location_change}),
access_token, expires_at
```

---

## 🔐 Funciones de Base de Datos

### 1. `detect_security_anomalies()`
Detecta cambios sospechosos comparando con último login

```sql
SELECT detect_security_anomalies(
  user_id,
  org_id,
  new_ip,
  new_fingerprint,
  new_location
)
-- Retorna: {anomalies: {...}, requires_2fa: bool, is_new_device: bool}
```

### 2. `register_login_session()`
Registra cada intento de login con contexto de seguridad

```sql
SELECT register_login_session(
  user_id,
  org_id,
  device_id,
  ip_address,
  fingerprint,
  geolocation,
  auth_method,
  anomalies,
  requires_2fa
)
-- Retorna: {session_id, access_token}
```

---

## 🔑 JWT Claims

El JWT generado incluye:

```javascript
{
  sub: "user-id",                    // Subject (usuario)
  user_id: "user-uuid",
  org_id: "organization-uuid",       // Multi-tenant
  session_id: "session-uuid",        // Auditoría
  device_id: "device-uuid",
  requires_2fa: true|false,          // Si necesita 2FA
  iat: 1234567890,                   // Issued at
  exp: 1234567890 + 86400,           // Expira en 24 horas
  email: "user@email.com"
}
```

**RLS (Row Level Security) usa estos claims:**
```sql
-- En políticas RLS
WHERE organization_id = (SELECT org_id FROM jwt() WHERE sub = auth.uid())
-- Solo ve datos de su propia organización
```

---

## 📱 Flujo Completo del Usuario

### Día 1: Primer Login (Mismo dispositivo)
```
├─ Mesero abre app
├─ Entra PIN: 1234
├─ Sistema: ✅ PIN válido + IP igual + Device igual
├─ Sin anomalías detectadas
└─ JWT generado → Acceso a POS ✅
   (session.requires_2fa = false)
```

### Día 2: Viaje de Sucursal
```
├─ Mesero se viaja a otra sucursal (IP diferente)
├─ Entra mismo PIN: 1234
├─ Sistema:
│  ├─ ✅ PIN válido
│  ├─ ❌ IP DIFERENTE (Anomalía detectada)
│  └─ Requiere 2FA
├─ Response: 403 + requires_2fa: true
└─ Interfaz solicita Google OAuth
   ├─ Usuario hace click "Verifica con Google"
   ├─ Redirige a Google Login
   ├─ Google verifica identidad
   ├─ Callback a /auth/callback
   └─ JWT generado con (two_fa_verified: true) → Acceso ✅
```

### Día 3: Tablet Nueva
```
├─ Admin usa tablet nueva
├─ Entra PIN
├─ Sistema:
│  ├─ ✅ PIN válido
│  ├─ ❌ Device fingerprint nuevo
│  ├─ ✅ IP igual (sucursal principal)
│  └─ Requiere 2FA (dispositivo no registrado)
├─ Response: 403 + requires_2fa: true + anomaly: new_device
├─ Admin verifica con Google
└─ Tablet ahora "trusted" para próximos logins ✅
```

---

## 🛡️ Multi-Tenant Seguridad

**Problem:** Evitar que usuarios de Restaurante A accedan datos de Restaurante B

**Solution:** RLS + organization_id

```sql
-- Ejemplo: Tabla ORDERS
CREATE POLICY "Users see orders from their org"
ON public.orders FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);
```

**Flujo:**
```
Usuario A (org: "Taco King")
├─ Login con PIN
├─ JWT.org_id = "taco-king-uuid"
├─ Query: SELECT * FROM orders
├─ PostgreSQL: 
│  └─ WHERE organization_id = "taco-king-uuid"
└─ Solo ve órdenes de Taco King ✅

Usuario B (org: "Sushi Bar")
├─ Intenta hackear query
├─ Query: SELECT * FROM orders WHERE org_id != "sushi-bar"
├─ PostgreSQL RLS:
│  └─ Fuerza: WHERE organization_id = "sushi-bar-uuid"
└─ No puede acceder a otras orgs ❌
```

---

## 📊 Auditoría Completa

Cada login registra:

```javascript
{
  user_id: "...",
  organization_id: "...",
  device_id: "...",
  ip_address: "203.0.113.45",
  geolocation: {
    country: "MX",
    city: "Playa del Carmen",
    latitude: 20.6296,
    longitude: -87.0739,
    timestamp: "2026-02-24T10:30:00Z"
  },
  auth_method: "pin",
  anomalies: {
    ip_change: true,
    device_change: false,
    location_change: true
  },
  requires_2fa: true,
  two_fa_verified: true,
  access_token: "...",
  expires_at: "2026-02-25T10:30:00Z"
}
```

**Casos de Uso:**
- ✅ Rastrear accesos por ubicación
- ✅ Detectar logins sospechosos
- ✅ Cuenta-tiempo: cuántos lo intentaron
- ✅ Cumplimiento: GDPR, auditoría

---

## 🚀 Implementación Frontend

### 1. Detectar Cambio de Resultado (3FA requerida)

**[src/services/jwtService.ts](../../src/services/jwtService.ts)**

```typescript
export async function loginWithStrictSecurity(pin: string): Promise<LoginResult> {
  const deviceInfo = await getDeviceFingerprint();
  const response = await supabase.functions.invoke('generate-access-token', {
    body: { pin, deviceInfo }
  });

  // ⭠ CRÍTICO: Respuesta 403 = Requiere 2FA
  if (response.status === 403 && response.data.requires_2fa) {
    console.log('🔐 2FA detectada, necesaria');
    return {
      success: false,
      requires_2fa: true,
      anomalies: response.data.anomalies,
      message: response.data.message
    };
  }

  // ✅ Acceso permitido
  return { success: true, token: response.data.access_token, ... };
}
```

### 2. UI de Login Mejorada

**[src/components/auth/LoginPin.tsx](../../src/components/auth/LoginPin.tsx)**

```typescript
const [requires2FA, setRequires2FA] = useState(false);
const [anomalies, setAnomalies] = useState<any>(null);

const handleLogin = async (pin: string) => {
  const result = await loginWithStrictSecurity(pin);

  if (result.requires_2fa) {
    // Mostrar alerta
    setAnomalies(result.anomalies);
    setRequires2FA(true);
    
    return (
      <div className="alert alert-warning">
        <h3>⚠️ Verificación Requerida</h3>
        <p>{result.message}</p>
        {result.anomalies.ip_change && <p>📍 Ubicación diferente detectada</p>}
        {result.anomalies.device_change && <p>📱 Dispositivo nuevo</p>}
        {result.anomalies.location_change && <p>🌍 Viaje a otro país</p>}
        <button onClick={() => handleGoogleOAuth()}>
          Verifica con Google
        </button>
      </div>
    );
  }

  // Acceso normal
  navigate('/pos');
};
```

### 3. Google OAuth como 2FA

```typescript
const handleGoogleOAuth = async () => {
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' }
  });
  // Redirige a Google
};

// En /auth/callback:
const session = await supabase.auth.getSession();
if (session?.user) {
  // Ahora marcar session.two_fa_verified = true
  // y generar nuevo JWT con permisos completos
  navigate('/pos');
}
```

---

## ✅ Beneficios

| Característica | Beneficio |
|---|---|
| **PIN rápido** | Acceso instantáneo en horas pico |
| **Anomalía detectada** | Sólo 2FA cuando es sospechoso |
| **Google OAuth** | Verifica identidad sin contraseña |
| **Geolocalización** | Sabe dónde está el usuario |
| **Multi-tenant RLS** | Usuarios no ven datos de otros restaurantes |
| **Auditoría completa** | Cada login registrado con contexto |
| **Escalable** | Funciona para 1 o 1000 restaurantes |

---

## 🔄 Próximos Pasos

1. ✅ Schema actualizado con `login_sessions`, geolocation
2. ✅ Edge Function detecta anomalías
3. ⏳ Frontend muestra 2FA cuando es necesario
4. ⏳ Google OAuth integration
5. ⏳ Admin dashboard con login audit

---

## 📚 Referencias

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
