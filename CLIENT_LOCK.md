# 🛑 INSTANCIA DE CLIENTE: REISBLOC F&B

> **⚠️ ADVERTENCIA DE SEGURIDAD Y DESPLIEGUE**

Esta carpeta contiene el código fuente **específico y productivo** para el cliente **Reisbloc F&B**.

## 🔒 REGLAS DE ORO

1.  **NO MEZCLAR CON EL CORE:** Este no es el repositorio del SaaS principal. Es un "fork" estabilizado para este cliente.
2.  **SOLO PARCHES DE SEGURIDAD:** No agregar features experimentales del SaaS aquí a menos que estén 100% probadas.
3.  **BASE DE DATOS:** Este proyecto apunta a la organización `Reisbloc POS` (Proyecto: `nmovxyaibnixvxtepbod`). **NO CAMBIAR LAS CREDENCIALES** a la base de datos de desarrollo del SaaS.
4.  **MULTI-TENANT:** Aunque el código soporta `organization_id`, este frontend está configurado para operar como si fuera único.

## 🚀 ESTADO ACTUAL (v3.2.1 Multi-Tenant)

- **Organization ID:** `4eb9c537-8d82-4243-896a-c1b4f6440ddd` (Reisbloc F&B)
- **Backend:** Supabase (Edge Functions activas).
- **Auth:** PIN + Device Fingerprint.
- **Sync:** Offline-First con IndexedDB.

---

**Si estás buscando el código principal para desarrollar nuevas features globales, SAL DE ESTA CARPETA.**
