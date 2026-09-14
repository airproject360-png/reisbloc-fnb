import { LOCALITO_TICKET_LOGO_BASE64 } from './ticketLogo'
import { TenantSettings } from '@/config/tenantConfig'

export interface TicketItem {
  quantity: number
  productName: string
  unitPrice: number
  notes?: string
}

export interface TicketOptions {
  title?: string
  ticketFolio: string
  locationLabel: string
  dateStr?: string
  cashierName?: string
  customNotes?: string
  items?: TicketItem[]
  subtotal?: number
  cardFee?: number
  discountAmount?: number
  adjustmentReason?: string
  finalTotal: number
  paymentMethod?: string
  cashReceived?: number
  changeAmount?: number
  tenant?: TenantSettings
}

/**
 * Renderiza el encabezado del ticket con el logo oficial centrado en alta resolución
 * y la insignia de tipo de comprobante.
 */
export function renderTicketHeader(options: {
  title: string
  tenant?: TenantSettings
}): string {
  const isLocalito = options.tenant?.isLocalito ?? true
  const logoSrc = isLocalito ? LOCALITO_TICKET_LOGO_BASE64 : (options.tenant?.logoUrl || '')

  return `
    <div style="text-align:center;margin-bottom:8px;">
      ${logoSrc ? `
        <img 
          src="${logoSrc}" 
          alt="${options.tenant?.clientName || 'LOCALITO'}" 
          style="display:block;margin:0 auto 4px auto;width:46mm;max-width:92%;height:auto;object-fit:contain;" 
        />
      ` : `
        <div style="font-weight:900;font-size:16px;letter-spacing:1px;text-transform:uppercase;">
          ${options.tenant?.clientName || 'LOCALITO'}
        </div>
        <div style="font-size:9px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">
          ${options.tenant?.clientTagline || 'GUISOS & BARRA FRÍA'}
        </div>
      `}
      <div style="display:inline-block;font-size:9.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;padding:2px 10px;border:1.5px solid #000;border-radius:4px;margin-top:4px;">
        ${options.title}
      </div>
    </div>
  `
}

/**
 * Renderiza el pie de página con agradecimiento y el banner oficial de Reisbloc AI.
 */
export function renderTicketFooter(): string {
  return `
    <!-- Footer Agradecimiento & Powered by Reisbloc -->
    <div style="margin-top:10px;text-align:center;">
      <div style="font-size:11px;font-weight:900;letter-spacing:0.5px;">¡GRACIAS POR SU PREFERENCIA!</div>
      <div style="font-size:8px;color:#333;margin-top:1px;">¡Esperamos verte pronto de nuevo!</div>

      <!-- Banner Oficial Reisbloc IA -->
      <div style="margin-top:8px;padding:6px 4px;border:1.5px solid #000;border-radius:6px;background:#ffffff;text-align:center;">
        <div style="font-size:9.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">
          ⚡ POWERED BY REISBLOC
        </div>
        <div style="font-size:8px;font-weight:600;margin-top:2px;color:#111;line-height:1.2;">
          Integra el poder de la IA en tu negocio
        </div>
        <div style="font-size:9px;font-weight:900;margin-top:3px;letter-spacing:0.5px;text-decoration:underline;">
          Visítanos & Contacto: reisbloc.com
        </div>
      </div>
    </div>
  `
}

/**
 * Genera el documento HTML completo del ticket de venta o cuenta de consumo en 58mm/80mm.
 */
export function buildTicketHTML(options: TicketOptions): string {
  const {
    title = 'TICKET DE COMPRA',
    ticketFolio,
    locationLabel,
    dateStr = new Date().toLocaleString('es-MX'),
    cashierName = 'Personal de Servicio',
    customNotes,
    items = [],
    subtotal,
    cardFee = 0,
    discountAmount = 0,
    adjustmentReason,
    finalTotal,
    paymentMethod,
    cashReceived,
    changeAmount,
    tenant,
  } = options

  const computedSubtotal = subtotal ?? items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const isAdjusted = Boolean(adjustmentReason && adjustmentReason.trim())

  let methodLabel = ''
  if (paymentMethod) {
    const p = paymentMethod.toLowerCase()
    if (p === 'card' || p === 'tarjeta') methodLabel = 'TARJETA (TERMINAL)'
    else if (p === 'transfer' || p === 'spei' || p === 'transferencia') methodLabel = 'TRANSFERENCIA SPEI'
    else if (p === 'cash' || p === 'efectivo') methodLabel = 'EFECTIVO'
    else methodLabel = paymentMethod.toUpperCase()
  }

  return `
    <div style="width:58mm;padding:4px 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,monospace;font-size:11px;line-height:1.25;color:#000;box-sizing:border-box;">
      ${renderTicketHeader({ title, tenant })}

      <!-- Metadata del Ticket -->
      <div style="font-size:9px;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;margin:6px 0;line-height:1.35;">
        <div style="display:flex;justify-content:space-between;">
          <span><strong>Ubicación:</strong> ${locationLabel}</span>
          <span><strong>Folio:</strong> ${ticketFolio}</span>
        </div>
        <div style="margin-top:2px;">Fecha: ${dateStr}</div>
        <div>Atendido por: ${cashierName}</div>
      </div>

      ${customNotes?.trim() ? `
        <!-- Notas del Cliente / Dirección -->
        <div style="border:1px dashed #000;border-radius:4px;padding:4px;margin-bottom:6px;font-size:8.5px;background:#fcfcfc;">
          <div style="font-weight:bold;">NOTAS / DIRECCIÓN:</div>
          <div>${customNotes.trim()}</div>
        </div>
      ` : ''}

      <!-- Lista de Ítems / Consumos -->
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-weight:900;font-size:9px;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:5px;text-transform:uppercase;">
          <span>CANT &middot; DESCRIPCIÓN</span>
          <span>IMPORTE</span>
        </div>
        ${items.length > 0 ? items.map(item => `
          <div style="margin-bottom:5px;font-size:10px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;font-weight:700;">
              <span style="max-width:72%;word-break:break-word;">${item.quantity}x ${item.productName}</span>
              <span style="font-weight:900;font-family:monospace;font-size:11px;">$${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
            ${item.quantity > 1 ? `<div style="font-size:8.5px;color:#555;margin-left:8px;">P.U. $${item.unitPrice.toFixed(2)}</div>` : ''}
            ${item.notes ? `<div style="font-size:8.5px;color:#333;font-style:italic;margin-left:8px;">↳ ${item.notes}</div>` : ''}
          </div>
        `).join('') : '<div style="text-align:center;font-size:10px;padding:4px 0;">(Sin consumos registrados)</div>'}
      </div>

      <!-- Resumen de Totales -->
      <div style="border-top:1.5px dashed #000;padding-top:4px;margin-top:6px;font-size:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span>Subtotal Consumo:</span>
          <span>$${computedSubtotal.toFixed(2)} MXN</span>
        </div>

        ${cardFee > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;font-weight:bold;">
            <span>Comisión Tarjeta:</span>
            <span>+$${cardFee.toFixed(2)} MXN</span>
          </div>
        ` : ''}

        ${discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;color:#444;">
            <span>Descuento / Ajuste:</span>
            <span>-$${discountAmount.toFixed(2)} MXN</span>
          </div>
        ` : ''}

        <!-- Total Destacado -->
        <div style="border:2px solid #000;border-radius:4px;padding:5px 8px;margin:5px 0;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;font-weight:900;letter-spacing:0.5px;">TOTAL:</span>
            <span style="font-size:15px;font-weight:900;font-family:monospace;">$${finalTotal.toFixed(2)} MXN</span>
          </div>
        </div>

        ${methodLabel ? `
          <div style="display:flex;justify-content:space-between;font-size:9.5px;margin-top:3px;">
            <span>FORMA DE PAGO:</span>
            <span><strong>${methodLabel}</strong></span>
          </div>
        ` : ''}

        ${isAdjusted ? `
          <div style="font-size:8px;color:#444;margin-top:3px;font-style:italic;">
            * Ajuste autorizado: ${adjustmentReason?.trim()}
          </div>
        ` : ''}

        ${cashReceived !== undefined && cashReceived > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:9px;margin-top:2px;color:#333;">
            <span>Efectivo Recibido:</span>
            <span>$${cashReceived.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:900;margin-top:2px;border-top:1px dotted #ccc;padding-top:2px;">
            <span>CAMBIO:</span>
            <span>$${(changeAmount ?? 0).toFixed(2)}</span>
          </div>
        ` : ''}

        ${cardFee > 0 ? `
          <div style="font-size:8px;color:#444;margin-top:3px;text-align:center;font-style:italic;">
            * Incluye cargo por servicio de cobro con tarjeta.
          </div>
        ` : ''}
      </div>

      ${renderTicketFooter()}
    </div>
  `
}

/**
 * Genera el comprobante oficial de voucher de terminal Clip.
 */
export function buildTerminalVoucherHTML(options: {
  saleId: string
  authCode?: string
  cardLast4?: string
  amount: number
  dateStr?: string
  tenant?: TenantSettings
}): string {
  const {
    saleId,
    authCode = 'APROBADA',
    cardLast4 = '••••',
    amount,
    dateStr = new Date().toLocaleString('es-MX'),
    tenant,
  } = options

  return `
    <div style="width:58mm;padding:4px 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,monospace;font-size:11px;line-height:1.25;color:#000;box-sizing:border-box;">
      ${renderTicketHeader({ title: 'VOUCHER TERMINAL', tenant })}

      <!-- Metadata del Voucher -->
      <div style="font-size:9px;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;margin:6px 0;line-height:1.35;">
        <div>Fecha: ${dateStr}</div>
        <div>Folio: #${saleId.slice(-8).toUpperCase()}</div>
        <div>Auth: <strong>${authCode}</strong></div>
        <div>Tarjeta: •••• ${cardLast4} (Clip Total)</div>
      </div>

      <!-- Total Destacado -->
      <div style="border:2px solid #000;border-radius:4px;padding:6px 8px;margin:6px 0;background:#ffffff;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;font-weight:900;letter-spacing:0.5px;">TOTAL PAGADO:</span>
          <span style="font-size:15px;font-weight:900;font-family:monospace;">$${amount.toFixed(2)} MXN</span>
        </div>
      </div>

      <div style="text-align:center;font-size:9px;font-weight:bold;margin-top:4px;">
        ¡PAGO AUTORIZADO POR CLIP!
      </div>

      ${renderTicketFooter()}
    </div>
  `
}
