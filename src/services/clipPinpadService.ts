/**
 * Reisbloc POS - Clip PinPad Cloud Terminal Service
 * Gestiona cobros directos en terminal física Clip Total 3 vía Cloud API
 */

import logger from '@/utils/logger'

export interface PinpadPaymentResponse {
  pinpad_request_id?: string
  reference?: string
  amount?: string
  serial_number_pos?: string
  code?: string
  name?: string
  message?: string
}

export interface PinpadStatusResponse {
  pinpad_request_id: string
  reference: string
  amount: string
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'DECLINED' | 'CANCELLED' | 'EXPIRED'
  create_date?: string
  detail?: {
    authorization_code?: string
    last4?: string
    brand?: string
    receipt_no?: string
  }
}

class ClipPinpadService {
  private defaultSerial = 'AA61B532642902383'

  public getSerialNumber(): string {
    return localStorage.getItem('reisbloc_clip_serial') || this.defaultSerial
  }

  public setSerialNumber(serial: string) {
    localStorage.setItem('reisbloc_clip_serial', serial.trim())
  }

  /**
   * Envía una intención de cobro a la terminal física Clip Total 3
   */
  public async createPayment(amount: number, reference?: string): Promise<PinpadPaymentResponse> {
    const serial = this.getSerialNumber()
    const ref = reference || `LOC-${Date.now().toString().slice(-6)}`

    logger.info('clip-pinpad', `Enviando cobro de $${amount} a terminal Clip ${serial}...`)

    try {
      const res = await fetch('/api/clip-pinpad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reference: ref,
          serialNumber: serial,
        }),
      })

      const data = await res.json()
      logger.info('clip-pinpad', 'Respuesta de Clip PinPad:', data)
      return data
    } catch (err: any) {
      logger.error('clip-pinpad', 'Error conectando con /api/clip-pinpad:', err)
      throw new Error(`Error de conexión con la terminal Clip: ${err.message || err}`)
    }
  }

  /**
   * Consulta el estado de una transacción por su pinpad_request_id
   */
  public async checkStatus(requestId: string): Promise<PinpadStatusResponse> {
    try {
      const res = await fetch(`/api/clip-pinpad?action=check_payment&requestId=${encodeURIComponent(requestId)}`)
      return await res.json()
    } catch (err: any) {
      logger.error('clip-pinpad', 'Error consultando estado de PinPad:', err)
      throw err
    }
  }

  /**
   * Sondea el estado del pago cada 2 segundos hasta completarse o tiempo de espera
   */
  public async pollPayment(
    requestId: string,
    onTick?: (status: string) => void,
    timeoutSeconds = 60
  ): Promise<PinpadStatusResponse> {
    const startTime = Date.now()
    const maxTime = timeoutSeconds * 1000

    while (Date.now() - startTime < maxTime) {
      try {
        const data = await this.checkStatus(requestId)
        if (onTick) onTick(data.status)

        if (data.status === 'PAID' || data.status === 'APPROVED') {
          return data
        }

        if (data.status === 'DECLINED' || data.status === 'CANCELLED' || data.status === 'EXPIRED') {
          throw new Error(`Pago no completado. Estado de terminal: ${data.status}`)
        }
      } catch (err) {
        // Continuar sondeando salvo si fue un fallo explícito
        if (err instanceof Error && err.message.includes('Pago no completado')) {
          throw err
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    throw new Error('Tiempo de espera agotado en la terminal Clip. Por favor reintenta.')
  }
}

export const clipPinpadService = new ClipPinpadService()
export default clipPinpadService
