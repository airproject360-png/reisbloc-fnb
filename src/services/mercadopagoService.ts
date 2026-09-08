/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc POS
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import logger from '@/utils/logger'

export interface MercadoPagoPayment {
  id: string
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  status_detail: string
  transaction_amount: number
  payment_method_id: string
  payment_type_id: string
  date_created: string
  date_approved?: string
  description?: string
  external_reference?: string
}

export interface CreatePaymentRequest {
  amount: number
  description: string
  orderId: string
  email?: string
  paymentMethodId?: string
}

export interface PaymentPreference {
  id: string
  init_point: string
  sandbox_init_point: string
}

class MercadoPagoService {
  private apiUrl: string
  private accessToken: string

  constructor() {
    this.accessToken = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || ''
    this.apiUrl = 'https://api.mercadopago.com'
  }

  /**
   * Crea una preferencia de pago para MercadoPago
   */
  async createPaymentPreference(data: CreatePaymentRequest): Promise<PaymentPreference> {
    try {
      const res = await fetch(`${this.apiUrl}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: data.description,
              quantity: 1,
              currency_id: 'MXN',
              unit_price: data.amount,
            },
          ],
          external_reference: data.orderId,
          notification_url: `${import.meta.env.VITE_APP_URL}/api/mercadopago/webhook`,
          payer: {
            email: data.email || 'customer@email.com',
          },
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.message || `HTTP ${res.status}`)
      }

      return await res.json()
    } catch (error: any) {
      logger.error('mercadopago', 'Error creating MercadoPago preference', error?.message)
      throw new Error(error?.message || 'Error al crear preferencia de pago')
    }
  }

  /**
   * Procesa un pago directo (POS integration)
   */
  async processDirectPayment(data: CreatePaymentRequest): Promise<MercadoPagoPayment> {
    const method = data.paymentMethodId || 'card'
    logger.info('mercadopago', `💳 Registrando pago manual (${method})`, data)
    
    await new Promise(resolve => setTimeout(resolve, 800))

    return {
      id: `${method}_${Date.now()}`,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: data.amount,
      payment_method_id: method,
      payment_type_id: method === 'transfer' ? 'bank_transfer' : 'credit_card',
      date_created: new Date().toISOString(),
      description: data.description
    }
  }

  /**
   * Obtiene el estado de un pago
   */
  async getPaymentStatus(paymentId: string): Promise<MercadoPagoPayment> {
    try {
      const res = await fetch(`${this.apiUrl}/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.message || `HTTP ${res.status}`)
      }

      return await res.json()
    } catch (error: any) {
      logger.error('mercadopago', 'Error getting payment status', error?.message)
      throw new Error(error?.message || 'Error al obtener estado del pago')
    }
  }

  /**
   * Cancela un pago pendiente
   */
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/v1/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      })

      return res.ok
    } catch (error: any) {
      logger.error('mercadopago', 'Error cancelling payment', error?.message)
      return false
    }
  }

  /**
   * Valida la configuración del servicio
   */
  isConfigured(): boolean {
    return !!this.accessToken && this.accessToken.length > 0
  }
}

export default new MercadoPagoService()
