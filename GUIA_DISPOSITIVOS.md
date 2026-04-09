# 🎓 Guía Rápida - Interfaces Multi-Dispositivo

---

## 📱 **MESERO** (Mobile/Tablet)

**URL**: `http://192.168.1.69:4173/pos`  
**Dispositivo**: Tablet o celular

### Flujo:
1. **Seleccionar Mesa** → Números 1-N
2. **Agregar Productos** → Tap en productos
3. **Enviar a Cocina** → "Enviar a Cocina"
   - Automáticamente se divide: Comida→Cocina, Bebidas→Bar
   - Se imprime comanda en impresora de cocina/bar
4. **Ver Órdenes Listas** → Badge en header "✓ Órdenes Listas"
5. **Cobrar** → Seleccionar orden → "Pagar"
   - Elige: Efectivo | Tarjeta | Clip
   - Propina automática 15% sugerida
   - **Se imprime ticket para comensal**
   - Mesa se consolida (no queda dividida)

---

## 📺 **COCINA/BAR** (Dashboard TV)

**URL**: `http://192.168.1.69:4173/kitchen-dashboard`  
**Dispositivo**: TV u ordenador (fullscreen recomendado)

### Vistas:
- **🔥 Preparación**: Órdenes entrantes (ROJO, parpadeante)
- **✓ Listas**: Listas para servir (VERDE)
- **Completadas**: Últimas 5 servidas (GRIS)

### Acciones:
- **Tap en "Listo para Servir"** → Move a "Listas"
- **Tap en "Completada"** → Archiva orden

### Elementos en pantalla:
```
Mesa 3 | 14:32
-------
1x Tacos al pastor
2x Cerveza Negra
📝 Sin cilantro
-------
[✓ Listo para Servir]
```

---

## 🏪 **ADMIN** (Escritorio)

**URL**: `http://192.168.1.69:4173/admin`  
**Dispositivo**: PC/Laptop

### Secciones:
1. **Usuarios**: Alta/Baja, roles, aprobación dispositivos
2. **Productos**: Inventario, categorías, precios
3. **Dispositivos**: Estado de conexión, IP, rol
4. **Actividad**: Auditoría de operaciones

---

## 📊 **REPORTES** (Escritorio)

**URL**: `http://192.168.1.69:4173/reports`  
**Dispositivo**: PC/Laptop

### Reportes:
- Ventas por día/mes
- Top productos
- Ventas por mesero
- Método de pago
- Propinas recibidas

---

## 🍽️ **MESAS** (Supervisor)

**URL**: `http://192.168.1.69:4173/mesas`  
**Dispositivo**: Tablet/PC

### Panel:
- Estado de cada mesa (ocupada, libre, esperando cobro)
- Tiempo en mesa
- Total acumulado
- Últimas órdenes

---

## 💾 **CIERRE DIARIO** (Admin)

**URL**: `http://192.168.1.69:4173/closing`  
**Dispositivo**: PC (seguro)

### Proceso:
1. Resumen del día
2. Totales por método pago
3. Validación de caja
4. Generar comprobante (archivo)
5. Envío de email (opcional)

---

## 🖨️ **IMPRESIÓN**

### Ticket de Venta (Commensal)
```
         RESTAURANTE TPV
      Dirección del local
     +1 234 567 8900

Ticket: ABC123DE
Mesa: 5
Fecha: 25/01 14:32

═════════════════════════
COMIDA:
1x Tacos al pastor    $80
1x Quesadilla         $120

BEBIDAS:
2x Cerveza Negra      $60

═════════════════════════
Subtotal:              $260
Propina sugerida (15%): $39
────────────────────────
TOTAL:                 $299

Pagado: EFECTIVO
Propina: $40

════════════════════════
¡Gracias por su compra!
Vuelva pronto
```

### Comanda (Cocina/Bar)
```
      🍽️ COCINA
   COMANDA DE ORDEN

Mesa: 5
Hora: 14:32
Comanda: #123

═══════════════════════════
2x Tacos al pastor
📝 Sin cilantro

1x Quesadilla

═══════════════════════════
⏱️ URGENTE
Impreso: 25/01 14:32:15
```

---

## 🔌 **CONECTANDO DISPOSITIVOS**

### En LAN (recomendado):
```bash
# Host (servidor):
npm run preview -- --host
# Output:
#   ➜  Local:   http://localhost:4173/
#   ➜  Network: http://192.168.1.69:4173/

# En otras máquinas:
http://192.168.1.69:4173
```

### Desde internert (después de deploy):
```
https://tuapp.com
```

### Android APK (cuando esté lista):
```
Instala APK en terminal
→ Abre app
→ Mismas URLs, pero con soporte nativo para:
  - Impresora USB térmica
  - Clip payment terminal
  - Mercado Libre
```

---

## ⚡ **SHORTCUTS Teclado** (versión web)

| Tecla | Acción |
|-------|--------|
| `P` | Ir a POS |
| `K` | Ir a Cocina |
| `R` | Ir a Reportes |
| `A` | Ir a Admin |
| `Esc` | Cerrar modal |

---

## 🚨 **Problemas Comunes**

### "No se imprime nada"
- ✓ Verifica impresora conectada a USB
- ✓ En web: debe aparecer diálogo print
- ✓ En Android: requiere plugin (se instala en APK)

### "La mesa se queda dividida"
- ✓ Asegúrate que las órdenes se marcan "completed" después de pagar
- ✓ Ver: POS.tsx línea ~270

### "No puedo ver el dashboard en la TV"
- ✓ Verifica IP: `192.168.1.69` (ajusta a tu red)
- ✓ TV debe estar en misma red WiFi
- ✓ Abre: `http://192.168.1.69:4173/kitchen-dashboard`
- ✓ Fullscreen: F11 en navegador

### "Las órdenes de cocina no aparecen"
- ✓ Verifica que los emuladores Firebase están corriendo
- ✓ Recarga página (`Ctrl+R` o F5)
- ✓ Revisa console: `Ctrl+Shift+J` (Devtools)

---

## 🎯 **Próximas Fases**

**Fase 1**: PWA instalable
- Botón "Instalar en Home" en celular
- Funciona sin conexión (offline first)

**Fase 2**: APK Android nativa
- Descarga e instala en P8 AI POS
- Acceso directo a impresora USB
- Integración Clip payment

**Fase 3**: Pantalla de caja (segundo dispositivo)
- PC para cobro
- Emite recibo con folio fiscal
- Integración SAT (cuando sea requerido)

---

**Versión**: 1.0  
**Última actualización**: 25 de Enero 2026
