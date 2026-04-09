# Reisbloc F&B - Sistema POS & Gestión

![Estado](https://img.shields.io/badge/Estado-Producción_Activa-success)
![Engine](https://img.shields.io/badge/Powered_by-Reisbloc_POS_🚀-indigo)
![Tech](https://img.shields.io/badge/Stack-React_|_Supabase_|_Vite-blue)
![Ubicación](https://img.shields.io/badge/Ubicación-Playa_del_Carmen_🌊-teal)

**Sistema de Punto de Venta (POS) personalizado para Reisbloc F&B.**  
Impulsado por la arquitectura Multi-Tenant de **Reisbloc POS**.

Este repositorio contiene el código fuente de la aplicación de gestión operativa del restaurante. Diseñado para operar en un entorno de alto flujo frente al mar, gestionando desde la toma de comandas de mariscos hasta la operación nocturna de bar y sports bar.

---

## 🍹 Contexto del Proyecto

**Reisbloc F&B** es una operación de alto flujo y el sistema está diseñado para adaptarse a sus dos facetas:

1.  **Modo Día (Restaurante):** Enfoque en cocina fría/caliente (ceviches, aguachiles, pescados) con alta rotación de mesas.
2.  **Modo Noche (Bar & Sports Bar):** Enfoque en coctelería rápida, cervezas y gestión de cuentas abiertas para eventos deportivos.

### Arquitectura "Offline-First"
Dado que la conectividad en la costa puede ser intermitente, el sistema implementa una arquitectura **Offline-First** (PWA) que permite seguir operando localmente y sincronizar con la nube cuando la conexión se restablece.

---

## 🛠️ Stack Tecnológico

Para futuros desarrolladores, el proyecto utiliza tecnologías modernas y estandarizadas:

*   **Frontend:** React 18 + TypeScript + Vite (Velocidad y tipado estático).
*   **Estilos:** Tailwind CSS (Diseño responsivo y adaptable).
*   **Backend / Base de Datos:** Supabase (PostgreSQL) con Row Level Security (RLS).
*   **Estado Global:** Zustand (Gestión ligera del carrito y sesión).
*   **Móvil:** Capacitor (Para generar APKs nativos en Android/iOS).
*   **Pagos:** Registro manual de pagos (Tarjeta y Transferencia).

---

## 🚀 Guía de Inicio para Desarrolladores

Si necesitas levantar el proyecto localmente para mantenimiento o nuevas características:

### 1. Prerrequisitos
*   Node.js (v18 o superior)
*   Cuenta de acceso al proyecto en Supabase (solicitar al administrador).

### 2. Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>

# Instalar dependencias
npm install
```

### 3. Variables de Entorno
El proyecto requiere un archivo `.env` en la raíz (no incluido en el repo por seguridad). Solicita las credenciales o crea uno con la siguiente estructura:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

### 4. Ejecución

```bash
# Modo Desarrollo (con Hot Reload)
npm run dev

# Construir para Producción
npm run build
```

---

## 📱 Módulos del Sistema

1.  **POS (Meseros):** Interfaz táctil para toma de órdenes rápida. Separación automática de bebidas (Barra) y alimentos (Cocina).
2.  **Kitchen Display System (KDS):** Pantalla en cocina que recibe comandas en tiempo real con alertas sonoras.
3.  **Bar Display:** Pantalla específica para barra/coctelería.
4.  **Admin Dashboard:** Reportes de ventas, gestión de inventario, cierre de caja y control de usuarios.

---

## 🔒 Seguridad y Despliegue

*   **Acceso:** El sistema utiliza autenticación por PIN y huella de dispositivo. Solo dispositivos autorizados por el administrador pueden acceder al sistema.
*   **Base de Datos:** Los datos están protegidos por RLS en Supabase.
*   **Deploy:** Actualmente desplegado en Vercel / Netlify (verificar configuración de DNS).

---

## 📂 Estructura de Carpetas

```
reisbloc-pos/
├── src/                    # Código fuente
│   ├── components/         # Componentes React
│   ├── pages/              # Páginas principales
│   ├── services/           # Servicios (Supabase, Pagos)
│   ├── hooks/              # Hooks personalizados
│   ├── store/              # Estado global (Zustand)
│   ├── types/              # Tipos TypeScript
│   └── styles/             # Estilos globales
├── supabase/               # Supabase config & functions
├── docs/                   # 📚 Documentación completa
│   ├── VISION.md           # Filosofía y roadmap
│   ├── ARCHITECTURE.md     # Arquitectura técnica
│   ├── SECURITY.md         # Seguridad y dispositivos
│   ├── QUICK_START.md      # Guía de inicio rápido
│   ├── CONTRIBUTING.md     # Guía de contribución
│   └── setup/              # Guías de configuración
├── scripts/                # 🛠️ Scripts útiles
│   ├── start-production.sh # Iniciar sistema completo
│   └── README.md           # Guía de scripts
├── public/                 # Assets estáticos
├── LICENSE                 # AGPL-3.0
└── package.json            # Dependencias
```

---

## 🚀 Quick Start

### Instalación Rápida (5 minutos)

```bash
# 1. Clonar el repositorio
git clone https://github.com/reisbloc-lab/reisbloc-pos.git
cd reisbloc-pos

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Iniciar desarrollo
npm run dev
```

---

## Dedicatorias y Agradecimientos 🙏


Quiero dedicar esto:

*   **A mi madre, Socorro**, por ser mi ejemplo de resiliencia y equilibrio; y **a mi padre, Ricardo**, a quien admiro por enseñarme a ser fuerte y a mirar siempre más allá.
*   **A mis hermanos, Oscar, Naty, Pau y Manuel:** por todo lo que hemos vivido y lo que he aprendido a su lado. Espero que sigamos compartiendo experiencias increíbles y creciendo juntos.
*   **A mis abuelitas,** que aunque ya no están, me dejaron la enseñanza de vivir al máximo: **¡YOLO!**
*   **A mis hijos, Luna, Hunab y Daniel:** ustedes son **mi motor.** Me siento bendecido por tenerlos y por lo que me enseñan cada día sobre evolucionar. Espero que esta herramienta sea un impulso para que se desarrollen en sus caminos con mayor fluidez y sencillez.
*   **A Lupita,** quien siempre ha estado apoyándome incondicionalmente en cada paso. Gracias por caminar conmigo.
*   **A mis amigos:** a los que están cerca, a los que no, y a los que ya se fueron. Ustedes saben quiénes son. Les agradezco por su compañía, por las experiencias y, sobre todo, **por el respaldo y su lealtad.**

--

> Esto es para todos, porque creo firmemente que podemos mejorar como seres humanos a través de la comunidad. Espero genuinamente que esta herramienta les sea útil y facilite su trabajo o negocio, **porque trabajamos para vivir y no al revés.**
>
> Al final, somos como un mismo organismo: cuando nuestras raíces se entrelazan y nos apoyamos, crecemos con más fuerza. **No soy solo yo, somos todos,** y lo agradezco profundamente.

---

**Versión:** 3.2.1 (Reisbloc Engine)
**Última actualización:** Febrero 2026  
**Estado:** ✅ Producción activa

**Hecho con ❤️ en México**

---

> *"La mejor tecnología es la que funciona cuando más la necesitas. Sin excepciones, sin pretextos."*  
> — Reisbloc Lab
