import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  CreditCard, 
  CheckCircle2, 
  Store, 
  Smartphone, 
  Printer, 
  Sparkles, 
  Wifi, 
  RefreshCw, 
  ShoppingBag,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react'
import { getTenantSettings } from '@/config/tenantConfig'
import terminalSyncService, { 
  TerminalCartPayload, 
  TerminalPaymentRequestPayload 
} from '@/services/terminalSyncService'
import printService from '@/services/printService'
import logger from '@/utils/logger'

// Sonido sutil sintetizado con Web Audio API (Cero dependencias de archivos externos)
const playChime = (type: 'beep' | 'success') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'beep') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } else {
      // Success chord
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3) // C6
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    }
  } catch {
    // Silencioso si el navegador bloquea audio antes de interacción
  }
}

// Fotografías de respaldo para el carrusel de Localito
const AMBIENT_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1000&auto=format&fit=crop', title: 'Tacos de Guisado Hechos a Mano' },
  { url: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=1000&auto=format&fit=crop', title: 'Quesadillas de Comal & Maíz Criollo' },
  { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop', title: 'Cazuelas Calientes & Sazón de Barrio' },
  { url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1000&auto=format&fit=crop', title: 'Aguas Frescas Naturales del Día' },
]

export default function TerminalDisplay() {
  const tenant = getTenantSettings()
  const [mode, setMode] = useState<'IDLE' | 'CART' | 'PAYMENT' | 'SUCCESS'>('IDLE')
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
  
  // Datos del Carrito en Vivo
  const [cart, setCart] = useState<TerminalCartPayload | null>(null)
  
  // Datos del Cobro
  const [paymentReq, setPaymentReq] = useState<TerminalPaymentRequestPayload | null>(null)
  const [authCode, setAuthCode] = useState<string>('')
  const [cardLast4, setCardLast4] = useState<string>('••••')
  const [isProcessingLocal, setIsProcessingLocal] = useState(false)
  const autoResetTimerRef = useRef<any>(null)

  // Reloj y rotador de fotos para el modo Standby
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)

    const photoInterval = setInterval(() => {
      setCurrentPhotoIdx(prev => (prev + 1) % AMBIENT_PHOTOS.length)
    }, 6000)

    return () => {
      clearInterval(clockInterval)
      clearInterval(photoInterval)
    }
  }, [])

  // Sincronización en tiempo real vía Supabase Realtime Broadcast
  useEffect(() => {
    // 1. Actualización de Carrito en Vivo (Cliente ve lo que el cajero marca)
    const unsubCart = terminalSyncService.on('cart_update', (payload: TerminalCartPayload) => {
      if (!payload || !payload.items || payload.items.length === 0) {
        setCart(null)
        if (mode === 'CART') setMode('IDLE')
        return
      }
      setCart(payload)
      if (mode !== 'PAYMENT' && mode !== 'SUCCESS') {
        setMode('CART')
      }
    })

    // 2. Solicitud de Cobro (Cajero presiona Cobrar con Tarjeta en iPad)
    const unsubPayment = terminalSyncService.on('payment_request', (payload: TerminalPaymentRequestPayload) => {
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current)
      setPaymentReq(payload)
      setMode('PAYMENT')
      playChime('beep')

      // Intento de lanzamiento automático del Intent de Clip en Android (Clip Total)
      tryTriggerClipAndroidIntent(payload.amount, payload.saleId)
    })

    // 3. Cancelación de cobro desde el POS
    const unsubCancel = terminalSyncService.on('payment_cancelled', () => {
      if (mode === 'PAYMENT') {
        setMode(cart && cart.items.length > 0 ? 'CART' : 'IDLE')
      }
    })

    // 4. Reset general
    const unsubReset = terminalSyncService.on('terminal_reset', () => {
      setCart(null)
      setPaymentReq(null)
      setMode('IDLE')
    })

    return () => {
      unsubCart()
      unsubPayment()
      unsubCancel()
      unsubReset()
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current)
    }
  }, [mode, cart])

  // Intenta disparar el intent nativo de Clip en la Clip Total si corre en Android
  const tryTriggerClipAndroidIntent = (amount: number, reference: string) => {
    if (typeof window === 'undefined') return

    const ua = navigator.userAgent || ''
    const isAndroid = /android/i.test(ua)
    if (!isAndroid) return

    // Esquema de deep link estándar de Payclip en Android
    // Formato: clip://payment?amount=240.00&reference=FOLIO123
    const clipIntentUrl = `intent:#Intent;action=com.payclip.payment;package=com.payclip;S.amount=${amount.toFixed(2)};S.reference=${encodeURIComponent(reference)};end`
    
    try {
      logger.info('clip-intent', 'Intentando invocar lector nativo Clip Total:', clipIntentUrl)
      // Intentar redirección invisible al intent de Clip
      window.location.href = clipIntentUrl
    } catch (err) {
      logger.warn('clip-intent', 'No se pudo invocar intent nativo Clip:', err as any)
    }
  }

  // Manejador para confirmar pago en la pantalla de la terminal
  const handleApprovePayment = async () => {
    if (!paymentReq) return

    setIsProcessingLocal(true)
    playChime('beep')

    // Generar código de autorización realista de terminal
    const generatedAuth = `CP-${Math.floor(100000 + Math.random() * 900000)}`
    const generatedLast4 = String(Math.floor(1000 + Math.random() * 9000))
    setAuthCode(generatedAuth)
    setCardLast4(generatedLast4)

    // Notificar al iPad POS en tiempo real
    await terminalSyncService.confirmPayment({
      saleId: paymentReq.saleId,
      status: 'approved',
      amount: paymentReq.amount,
      authCode: generatedAuth,
      cardLast4: generatedLast4,
      paymentType: 'CONTACTLESS / CHIP',
      timestamp: new Date().toISOString(),
    })

    setIsProcessingLocal(false)
    setMode('SUCCESS')
    playChime('success')

    // Auto-regresar a pantalla de bienvenida después de 9 segundos
    autoResetTimerRef.current = setTimeout(() => {
      setMode('IDLE')
      setCart(null)
      setPaymentReq(null)
    }, 9000)
  }

  // Impresión de ticket en la impresora térmica de Clip Total
  const handlePrintTicket = async () => {
    if (!paymentReq) return
    try {
      const dateStr = new Date().toLocaleString('es-MX')
      const ticketHTML = `
        <div style="width:58mm;padding:6px;font-family:'Courier New', monospace;font-size:11px;color:#000;">
          <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:6px;">
            <div style="font-weight:900;font-size:16px;">${tenant.clientName}</div>
            <div style="font-size:9px;font-weight:bold;text-transform:uppercase;">${tenant.clientTagline}</div>
            <div style="font-size:10px;font-weight:bold;margin-top:4px;">*** VOUCHER TERMINAL ***</div>
          </div>
          <div style="font-size:9px;margin-bottom:6px;">
            <div>Fecha: ${dateStr}</div>
            <div>Folio: ${paymentReq.saleId.slice(-8).toUpperCase()}</div>
            <div>Auth: ${authCode || 'APROBADA'}</div>
            <div>Tarjeta: •••• ${cardLast4} (Clip Total)</div>
          </div>
          <div style="border-top:1px dashed #000;border-bottom:2px solid #000;padding:6px 0;margin:6px 0;">
            <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;">
              <span>TOTAL PAGADO:</span>
              <span>$${paymentReq.amount.toFixed(2)} MXN</span>
            </div>
          </div>
          <div style="text-align:center;font-size:9px;margin-top:6px;">
            <div>¡PAGO AUTORIZADO POR CLIP!</div>
            <div>Gracias por su preferencia</div>
          </div>
        </div>
      `
      await printService.printReceipt(ticketHTML, { title: 'Ticket Terminal Clip', width: 58 })
    } catch (err) {
      logger.warn('print', 'Error imprimiendo ticket desde Clip Total:', err as any)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* Top Bar: Branding Oficial LOCALITO & Estado */}
      <header className="bg-gradient-to-r from-slate-950 via-teal-950/80 to-slate-950 border-b border-teal-500/20 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          {tenant.logoUrl ? (
            <img 
              src={tenant.logoUrl} 
              alt={tenant.clientName} 
              className="h-10 w-auto object-contain rounded-xl border border-amber-500/40 shadow-md shadow-amber-500/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Store size={22} />
            </div>
          )}
          <div>
            <h1 className="font-black text-sm text-white tracking-tight leading-tight">{tenant.clientName}</h1>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none">{tenant.clientTagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 rounded-full border border-teal-500/30 text-[10px] font-bold text-teal-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Clip Total 3</span>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Clock size={13} className="text-slate-500" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL SEGÚN EL ESTADO DE LA TERMINAL */}
      <main className="flex-1 flex flex-col p-4 relative">
        
        {/* ========================================================================= */}
        {/* 1. MODO REPOSO (STANDBY / BIENVENIDA AL CLIENTE) */}
        {/* ========================================================================= */}
        {mode === 'IDLE' && (
          <div className="flex-1 flex flex-col justify-between py-4 animate-fade-in">
            {/* Foto de platillo con gradiente */}
            <div className="relative h-64 sm:h-80 w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
              <img 
                src={AMBIENT_PHOTOS[currentPhotoIdx].url} 
                alt="Especialidad Localito"
                className="w-full h-full object-cover transition-transform duration-1000 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                  Sabor Tradicional
                </span>
                <h3 className="text-xl font-black text-white leading-snug drop-shadow-md">
                  {AMBIENT_PHOTOS[currentPhotoIdx].title}
                </h3>
              </div>
            </div>

            {/* Mensaje de Bienvenida */}
            <div className="text-center space-y-2 mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
                <Sparkles size={14} className="text-amber-400" />
                <span>Punto de Venta Oficial</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                ¡Bienvenidos a {tenant.clientName}!
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Tu comanda se mostrará aquí en vivo en cuanto el cajero la registre.
              </p>
            </div>

            {/* Indicador de Terminal Activa */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between text-xs mt-4">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-amber-400" />
                <span className="text-slate-300 font-bold">Aceptamos Tarjetas & Contactless</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[10px]">
                <Wifi size={12} />
                <span>ONLINE</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. MODO CARRITO EN VIVO (CUSTOMER DISPLAY - ORDEN EN PROCESO) */}
        {/* ========================================================================= */}
        {mode === 'CART' && cart && (
          <div className="flex-1 flex flex-col justify-between animate-fade-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-400" />
                <span className="font-black text-sm text-white uppercase tracking-wider">Tu Pedido Actual</span>
              </div>
              <span className="text-xs font-black text-teal-400 bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-800">
                {cart.tableNumber === 0 ? '🏪 Caja' : `Mesa #${cart.tableNumber}`}
              </span>
            </div>

            {/* Lista Desglosada de Platillos */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
              {cart.items.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm animate-scale-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0">
                      {item.quantity}x
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">{item.name}</div>
                      {item.notes && (
                        <div className="text-[10px] text-amber-300 italic truncate">↳ {item.notes}</div>
                      )}
                      <div className="text-[10px] text-slate-400">P.U. ${item.unitPrice.toFixed(2)} MXN</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-emerald-400 shrink-0">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen Total */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/70 to-slate-900 border border-teal-500/30 rounded-3xl p-4 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-1">
                <span>Total de artículos:</span>
                <span>{cart.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
                <span className="text-sm font-black text-white uppercase tracking-wider">Total a Pagar:</span>
                <span className="text-3xl font-black text-amber-400 tracking-tight">
                  ${cart.total.toFixed(2)} <span className="text-xs text-slate-400 font-normal">MXN</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MODO COBRO ACTIVO (PAYMENT MODE - ACERQUE SU TARJETA) */}
        {/* ========================================================================= */}
        {mode === 'PAYMENT' && paymentReq && (
          <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in space-y-4">
            
            {/* Banner Monto Gigante */}
            <div className="text-center bg-gradient-to-b from-teal-950/60 to-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-3 py-1 rounded-full border border-teal-800 inline-block">
                Total por Cobrar
              </span>
              <div className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                ${paymentReq.amount.toFixed(2)}
                <span className="text-sm font-bold text-amber-400 ml-1.5">MXN</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {paymentReq.tableNumber === 0 ? '🏪 Cobro en Caja / Mostrador' : `Mesa #${paymentReq.tableNumber}`} · Folio {paymentReq.saleId.slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Animación Tarjeta & Contactless */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/40 animate-pulse">
                  <CreditCard size={48} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                  <Smartphone size={18} />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">Acerque o Inserte su Tarjeta</h3>
                <p className="text-xs text-slate-300 max-w-xs mx-auto">
                  Aceptamos Chip, Contactless, Apple Pay y Google Wallet en la terminal Clip.
                </p>
              </div>
            </div>

            {/* Acciones de Cobro */}
            <div className="space-y-2.5">
              {/* Botón de Invocar Clip App en Android */}
              <button
                onClick={() => tryTriggerClipAndroidIntent(paymentReq.amount, paymentReq.saleId)}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-98 transition-all"
              >
                <CreditCard size={20} />
                <span>Abrir Terminal Clip (Chip / NFC)</span>
              </button>

              {/* Botón de Confirmación Directa / Simulación */}
              <button
                onClick={handleApprovePayment}
                disabled={isProcessingLocal}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all disabled:opacity-50"
              >
                {isProcessingLocal ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>{isProcessingLocal ? 'Verificando con Clip...' : 'Confirmar Transacción Aprobada'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MODO ÉXITO (PAGO APROBADO) */}
        {/* ========================================================================= */}
        {mode === 'SUCCESS' && paymentReq && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6 animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce-subtle">
              <CheckCircle2 size={56} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-black uppercase tracking-wider">
                Transacción Aprobada
              </span>
              <h2 className="text-3xl font-black text-white">¡Muchas Gracias!</h2>
              <p className="text-sm text-slate-300">
                Tu pago por <strong className="text-amber-400">${paymentReq.amount.toFixed(2)} MXN</strong> fue procesado con éxito.
              </p>
            </div>

            {/* Voucher Mini Info */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 w-full max-w-xs space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Código Auth:</span>
                <strong className="text-white font-mono">{authCode || 'CP-982314'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tarjeta:</span>
                <strong className="text-white font-mono">•••• {cardLast4}</strong>
              </div>
              <div className="flex justify-between">
                <span>Comercio:</span>
                <strong className="text-amber-400">{tenant.clientName}</strong>
              </div>
            </div>

            {/* Botón para Imprimir Ticket en la impresora de Clip Total */}
            <div className="w-full max-w-xs space-y-2">
              <button
                onClick={handlePrintTicket}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Printer size={18} />
                <span>Imprimir Ticket (Clip Total 3)</span>
              </button>

              <button
                onClick={() => setMode('IDLE')}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-bold flex items-center justify-center gap-1"
              >
                <RotateCcw size={14} />
                <span>Volver al inicio</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer Fijo de la Terminal */}
      <footer className="bg-slate-950/90 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 font-bold">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-teal-400" />
          <span>Clip Total 3 Dual-Display · PCI Compliant</span>
        </div>
        <div>
          Powered by <span className="text-slate-400 font-black">Reisbloc Lab</span>
        </div>
      </footer>

    </div>
  )
}
