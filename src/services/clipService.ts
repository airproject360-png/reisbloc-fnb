import logger from '@/utils/logger'

export interface ClipPaymentRequest {
  amount: number
  description: string
  orderId: string
  tableNumber: number
  email?: string
}

export interface ClipPaymentResponse {
  paymentId: string
  status: 'PENDING' | 'APPROVED' | 'CANCELLED' | 'ERROR'
  reference: string
  amount: number
  paymentUrl?: string
  receiptUrl?: string
  createdAt: string
}

class ClipService {
  private apiKey: string
  private merchantId: string
  private isSandbox: boolean
  private baseUrl: string

  constructor() {
    this.apiKey = import.meta.env.VITE_CLIP_API_KEY || ''
    this.merchantId = import.meta.env.VITE_CLIP_MERCHANT_ID || ''
    this.isSandbox = import.meta.env.VITE_CLIP_SANDBOX_MODE === 'true' || !this.apiKey
    this.baseUrl = this.isSandbox
      ? 'https://api-sandbox.clip.mx/v2'
      : 'https://api.clip.mx/v2'
  }

  /**
   * Inicia una transacción para enviar cobro a la Terminal Clip
   */
  async initiateTerminalPayment(request: ClipPaymentRequest): Promise<ClipPaymentResponse> {
    const reference = `REF-${request.orderId}-${Date.now().toString().slice(-4)}`
    logger.info('clip', 'Iniciando solicitud de cobro en Terminal Clip', {
      amount: request.amount,
      reference,
      isSandbox: this.isSandbox,
    })

    // Si estamos en modo de desarrollo / sandbox sin API key real, simulamos la llamada a la terminal
    if (this.isSandbox) {
      await new Promise(resolve => setTimeout(resolve, 800))

      return {
        paymentId: `clip_tx_${Math.random().toString(36).substring(2, 10)}`,
        status: 'PENDING',
        reference,
        amount: request.amount,
        paymentUrl: `https://clip.mx/pay/${reference}`,
        createdAt: new Date().toISOString(),
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${this.apiKey}:`)}`,
          'x-clip-merchant-id': this.merchantId,
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: 'MXN',
          purchase_description: request.description,
          redirection_url_success: `${window.location.origin}/pos?status=clip_success&orderId=${request.orderId}`,
          redirection_url_failure: `${window.location.origin}/pos?status=clip_failed&orderId=${request.orderId}`,
          metadata: {
            order_id: request.orderId,
            table_number: request.tableNumber,
            client_subdomain: import.meta.env.VITE_CLIENT_SUBDOMAIN || 'localito',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Error en servidor Clip API (${response.status})`)
      }

      const data = await response.json()
      return {
        paymentId: data.id || data.payment_id,
        status: data.status === 'PAID' ? 'APPROVED' : 'PENDING',
        reference: data.reference || reference,
        amount: data.amount || request.amount,
        paymentUrl: data.payment_url,
        createdAt: new Date().toISOString(),
      }
    } catch (err: any) {
      logger.error('clip', 'Error al conectar con API de Clip', err)
      throw err
    }
  }

  /**
   * Consulta el estado actual de un cobro de Clip por su ID o referencia
   */
  async checkPaymentStatus(paymentId: string): Promise<'PENDING' | 'APPROVED' | 'CANCELLED' | 'ERROR'> {
    if (this.isSandbox) {
      // En sandbox, simulamos que el pago se aprueba tras la consulta
      return 'APPROVED'
    }

    try {
      const response = await fetch(`${this.baseUrl}/checkout/${paymentId}`, {
        headers: {
          Authorization: `Basic ${btoa(`${this.apiKey}:`)}`,
        },
      })

      if (!response.ok) return 'PENDING'

      const data = await response.json()
      if (data.status === 'PAID' || data.status === 'APPROVED') return 'APPROVED'
      if (data.status === 'CANCELLED' || data.status === 'REFUNDED') return 'CANCELLED'
      return 'PENDING'
    } catch {
      return 'PENDING'
    }
  }
}

export const clipService = new ClipService()
export default clipService
