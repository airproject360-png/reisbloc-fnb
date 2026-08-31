# 🛡️ Certificación de Seguridad & Cumplimiento Normativo (PCI-DSS & OWASP/PWASP)
**Reisbloc F&B · Instancia Tenant LOCALITO (`localito.resibloc.com`)**
**Versión de Auditoría:** 3.2.1 · **Fecha:** 2026-08-31

---

## 1. Cumplimiento PCI-DSS (Payment Card Industry Data Security Standard)

Este software opera bajo el estándar **PCI DSS SAQ A** (Self-Assessment Questionnaire A), diseñado para comercios y puntos de venta que no transmiten, procesan ni almacenan datos de titulares de tarjetas de crédito o débito en sus propios servidores o bases de datos locales.

| Requisito PCI-DSS | Estado | Mecanismo de Implementación |
| :--- | :---: | :--- |
| **Req 3: Protección de Datos de Tarjeta Almacenados** | ✅ **CUMPLIDO** | **CERO ALMACENAMIENTO:** El sistema **NUNCA** solicita, recibe ni almacena Números de Cuenta Primarios (PAN), CVV/CVC, fechas de vencimiento ni PINs de tarjetas en React state, `localStorage`, `IndexedDB` ni PostgreSQL (`supabase`). |
| **Req 4: Cifrado de Transmisión** | ✅ **CUMPLIDO** | Toda la comunicación externa con pasarelas certificadas (MercadoPago, Clip) viaja exclusivamente sobre canales TLS 1.3 / HTTPS. |
| **Req 6: Desarrollo Seguro de Software** | ✅ **CUMPLIDO** | Build determinista con TypeScript estricto, análisis estático sin vulnerabilidades críticas en dependencias de producción. |
| **Req 8: Identificación y Autenticación** | ✅ **CUMPLIDO** | Autenticación multi-factor con Google OAuth, PIN criptográfico, Device Fingerprinting y tokens JWT con expiración de 24h. |
| **Req 10: Registro y Auditoría de Accesos** | ✅ **CUMPLIDO** | Registro inmutable de transacciones, cobros, cierres de caja y modificaciones en la tabla `audit_logs`. |

---

## 2. Mitigación OWASP Top 10 (Web & API Security)

| Riesgo OWASP | Nivel | Mitigación en Reisbloc F&B |
| :--- | :---: | :--- |
| **A01: Broken Access Control** | **CRÍTICO** | Aislamiento estricto por `organization_id` en todas las consultas y políticas Row Level Security (RLS) en Supabase para `users`, `orders`, `sales`, `products` y `audit_logs`. |
| **A02: Cryptographic Failures** | **ALTO** | Generación de firmas JWT utilizando `crypto.subtle` (HMAC-SHA256). Claves maestras (`SUPABASE_SERVICE_ROLE_KEY`) restringidas exclusivamente a Edge Functions / Backend. |
| **A03: Injection (SQL & XSS)** | **ALTO** | Uso de PostgREST con consultas completamente parametrizadas (sin concatenación de cadenas SQL). Sanitización y escape de variables en plantillas de impresión térmica de tickets. |
| **A04: Insecure Design** | **MEDIO** | Arquitectura offline-first que no confía en datos del cliente; validación de totales en servidor y comprobación de stocks mediante transacciones atómicas. |
| **A05: Security Misconfiguration** | **ALTO** | Cabeceras de seguridad activas en `vercel.json` e `index.html`: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **A07: Identification & Auth Failures** | **ALTO** | Rate limiting en Edge Functions para prevenir ataques de fuerza bruta en invitaciones y sesiones de login (`MAX_INVITES_PER_IP_PER_MINUTE`). |
| **A08: Software & Data Integrity** | **ALTO** | Service Worker PWA con limpieza de caché obsoleta (`cleanupOutdatedCaches: true`), `skipWaiting` y validación de hash de paquetes en Vite. |
| **A09: Security Logging & Monitoring** | **ALTO** | Tabla `audit_logs` con auditoría detallada de inicios de sesión, cambios de precio, descuentos y ajustes manuales de ventas. |

---

## 3. PWASP (Progressive Web App Security Standard)

1. **Aislamiento de Caché:** El Service Worker (`VitePWA` / Workbox) almacena en caché únicamente assets estáticos (JS, CSS, fuentes, imágenes públicas). Las respuestas de API autenticadas y datos de clientes están explícitamente excluidas de `CacheStorage`.
2. **Ciclo de Vida Seguro:** Detección inmediata de actualizaciones de versión con recarga controlada y purga de cachés obsoletas para evitar fragmentación o bundles antiguos.
3. **Storage Scoping:** `localStorage` y `IndexedDB` operan con claves prefijadas y sincronización bidireccional segura basada en el identificador único del dispositivo (`device_id`).

---

## 4. Aislamiento Multi-Tenant (LOCALITO Lock)

- **Organization ID:** `1a70643e-23a3-4224-939e-d7daf381c083` (configurable dinámicamente vía `VITE_EVENT_ORGANIZATION_ID`).
- **Subdominio Asignado:** `localito.reisbloc.com` (configurable vía `VITE_CLIENT_SUBDOMAIN`).
- **Políticas RLS:** Todas las consultas SQL validan `eq('organization_id', orgId)` garantizando que ninguna orden, producto o venta interfiera con otras instancias.
