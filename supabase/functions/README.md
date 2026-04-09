# Supabase Edge Functions

## Configuración Requerida

### 1. Environment Variables en Supabase

En **Project Settings > Edge Functions > Environment variables**, configura:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=copy-from-supabase-settings
JWT_SECRET=your-super-secret-key-for-production
```

### 2. Deployment

#### Opción A: Usando Supabase CLI (Recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy
supabase functions deploy generate-access-token --project-id <tu-project-id>
```

#### Opción B: Usando GitHub Actions

Supabase despliega automáticamente desde Git pushes si has configurado el repositorio.

### 3. Verificar Deployment

```bash
# Listar funciones
supabase functions list --project-id <tu-project-id>

# Ver logs
supabase functions logs generate-access-token --project-id <tu-project-id>
```

## Funciones Incluidas

### `generate-access-token`

**Endpoint:** `POST /functions/v1/generate-access-token`

**Request:**
```json
{
  "pin": "1234",
  "deviceInfo": {
    "fingerprint": "device-fingerprint-hash",
    "browser": "Chrome",
    "os": "Windows",
    "deviceName": "Desktop Office"
  }
}
```

**Responses:**

**Success (200):**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "user-uuid",
    "name": "Admin Demo",
    "role": "admin",
    "org_id": "org-uuid"
  },
  "session": {
    "id": "session-uuid",
    "requires_2fa": false
  }
}
```

**2FA Required (403):**
```json
{
  "requires_2fa": true,
  "message": "Security anomaly detected. Please verify with Google OAuth.",
  "anomalies": {
    "ip_change": true,
    "device_change": false,
    "location_change": false
  }
}
```

**Invalid PIN (401):**
```json
{
  "error": "Invalid PIN"
}
```

## Anomaly Detection Rules

La función detecta cambios de seguridad basados en:

1. **IP Address Change** - IP diferente de la última sesión
2. **Device Fingerprint Change** - Dispositivo diferente
3. **Location Change** - País diferente
4. **Velocity Check** - Cambio de ubicación imposible (>900 km/h)

Cuando se detecta CUALQUIER anomalía → Requiere Google OAuth (2FA)

## Logs y Debugging

Los logs aparecen en:
- **Local Development:** `vite` terminal
- **Production:** Supabase Dashboard > Functions > Logs

Formato de logs:
```
📥 Auth request: PIN=***
✅ User found: user-uuid Role: admin  
📍 Geolocation: México MX
🔒 Running anomaly detection...
✅ Anomaly check complete: {"requires_2fa":false,"anomalies":{}}
📝 Registering login session...
✅ Session registered: session-uuid
🔑 Generating JWT...
✅ Auth successful
```
