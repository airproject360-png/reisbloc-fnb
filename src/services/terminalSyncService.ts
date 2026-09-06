/**
 * Reisbloc POS - Terminal Sync Service
 * Sincronización en tiempo real vía Supabase Realtime Broadcast
 * Permite comunicar el iPad POS de mostrador con la terminal física Clip Total 3
 */

import { supabase } from '@/config/supabase'
import { isLocalitoTenant, LOCALITO_ORG_ID, getTenantSettings } from '@/config/tenantConfig'
import logger from '@/utils/logger'

export interface TerminalCartItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  notes?: string
}

export interface TerminalCartPayload {
  items: TerminalCartItem[]
  total: number
  tableNumber: number
  clientName?: string
  originStation?: string
}

export interface TerminalPaymentRequestPayload {
  saleId: string
  amount: number
  tableNumber: number
  items: TerminalCartItem[]
  method: 'card' | 'transfer' | 'cash'
  clientName?: string
  originStation?: string
}

export interface TerminalPaymentCompletedPayload {
  saleId: string
  status: 'approved' | 'declined'
  amount: number
  authCode?: string
  cardLast4?: string
  paymentType?: string
  timestamp: string
  originStation?: string
}

type EventCallback<T = any> = (payload: T) => void

class TerminalSyncService {
  private channel: any = null
  private channelName: string = ''
  private listeners: Map<string, Set<EventCallback>> = new Map()

  /**
   * Obtiene el identificador del canal único por organización
   */
  private getChannelName(): string {
    const tenant = getTenantSettings()
    const orgId = isLocalitoTenant() ? LOCALITO_ORG_ID : (tenant.organizationId || 'default')
    return `reisbloc-terminal-${orgId}`
  }

  /**
   * Conecta o reutiliza el canal Realtime de Supabase
   */
  public connect() {
    const desiredChannelName = this.getChannelName()

    if (this.channel && this.channelName === desiredChannelName) {
      return this.channel
    }

    if (this.channel) {
      supabase.removeChannel(this.channel)
    }

    this.channelName = desiredChannelName
    this.channel = supabase.channel(this.channelName, {
      config: {
        broadcast: {
          self: true,
          ack: false,
        },
      },
    })

    const events = ['cart_update', 'payment_request', 'payment_completed', 'payment_cancelled', 'terminal_reset']
    events.forEach(eventName => {
      this.channel.on('broadcast', { event: eventName }, ({ payload }: { payload: any }) => {
        logger.info('terminal-sync', `[Broadcast IN] ${eventName}:`, payload)
        const callbacks = this.listeners.get(eventName)
        if (callbacks) {
          callbacks.forEach(cb => {
            try {
              cb(payload)
            } catch (err) {
              logger.error('terminal-sync', `Error en listener de ${eventName}:`, err as any)
            }
          })
        }
      })
    })

    this.channel.subscribe((status: string) => {
      logger.info('terminal-sync', `Canal ${this.channelName} estado: ${status}`)
    })

    return this.channel
  }

  /**
   * Emite un evento broadcast hacia la terminal o hacia el POS
   */
  private async broadcast(event: string, payload: any) {
    if (!this.channel) {
      this.connect()
    }
    try {
      logger.info('terminal-sync', `[Broadcast OUT] ${event}:`, payload)
      await this.channel.send({
        type: 'broadcast',
        event,
        payload,
      })
    } catch (err) {
      logger.warn('terminal-sync', `Error enviando broadcast ${event}:`, err as any)
    }
  }

  /**
   * Envía la actualización de platillos en el carrito del POS a la pantalla del Clip
   */
  public async sendCartUpdate(items: any[], total: number, tableNumber: number, originStation?: string) {
    const tenant = getTenantSettings()
    const formattedItems: TerminalCartItem[] = items.map(item => ({
      id: item.id || item.productId || String(Math.random()),
      name: item.name || item.productName || 'Platillo',
      quantity: item.quantity || 1,
      unitPrice: item.price || item.unitPrice || 0,
      notes: item.notes || '',
    }))

    const payload: TerminalCartPayload = {
      items: formattedItems,
      total,
      tableNumber,
      clientName: tenant.clientName,
      originStation,
    }

    await this.broadcast('cart_update', payload)
  }

  /**
   * Solicita cobro en la terminal Clip
   */
  public async requestPayment(
    saleId: string,
    amount: number,
    tableNumber: number,
    items: any[],
    method: 'card' | 'transfer' | 'cash' = 'card',
    originStation?: string
  ) {
    const tenant = getTenantSettings()
    const formattedItems: TerminalCartItem[] = items.map(item => ({
      id: item.id || item.productId || String(Math.random()),
      name: item.name || item.productName || 'Platillo',
      quantity: item.quantity || 1,
      unitPrice: item.price || item.unitPrice || 0,
      notes: item.notes || '',
    }))

    const payload: TerminalPaymentRequestPayload = {
      saleId,
      amount,
      tableNumber,
      items: formattedItems,
      method,
      clientName: tenant.clientName,
      originStation,
    }

    await this.broadcast('payment_request', payload)
  }

  /**
   * La terminal Clip notifica que el pago fue aprobado
   */
  public async confirmPayment(payload: TerminalPaymentCompletedPayload) {
    await this.broadcast('payment_completed', payload)
  }

  /**
   * La terminal Clip o el POS cancela el intento de cobro
   */
  public async cancelPayment(saleId: string, reason?: string) {
    await this.broadcast('payment_cancelled', { saleId, reason })
  }

  /**
   * Restablece la terminal a la pantalla de reposo / bienvenida
   */
  public async resetTerminal() {
    await this.broadcast('terminal_reset', { timestamp: new Date().toISOString() })
  }

  /**
   * Suscribe un callback a un evento específico
   */
  public on(event: 'cart_update' | 'payment_request' | 'payment_completed' | 'payment_cancelled' | 'terminal_reset', callback: EventCallback): () => void {
    this.connect()

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  /**
   * Desconecta el servicio
   */
  public disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.listeners.clear()
  }
}

export const terminalSyncService = new TerminalSyncService()
export default terminalSyncService
