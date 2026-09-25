import logger from '@/utils/logger'

/**
 * PrintService: Maneja impresión web y nativa (Capacitor)
 * - Web: window.print() para impresora de red/USB
 * - Android: Plugin USB para impresora térmica
 */

interface PrintOptions {
  title?: string
  silent?: boolean // Para Android: imprimir sin diálogo
  width?: number // Para térmica: 58 o 80mm
}

class PrintService {
  /**
   * Imprimir desde HTML (web)
   * Compatible con Windows (POS-58 térmico), macOS y iOS Safari (iPad/iPhone)
   */
  async printHTML(
    htmlContent: string,
    options: PrintOptions = {}
  ): Promise<void> {
    try {
      const { title = 'Ticket', width = 58 } = options

      // 1. Preparar contenedor aislado #thermal-print-area en el DOM principal
      // Gracias al CSS @media print { body > *:not(#thermal-print-area) { display: none !important; } }
      // en caso de que el navegador imprima la ventana raíz, SÓLO se imprimirá el ticket de 58mm,
      // NUNCA la interfaz completa del POS (soluciona el bug en iOS Safari).
      let printContainer = document.getElementById('thermal-print-area')
      if (!printContainer) {
        printContainer = document.createElement('div')
        printContainer.id = 'thermal-print-area'
        document.body.appendChild(printContainer)
      }
      printContainer.innerHTML = htmlContent

      // Detección de iOS (iPad / iPhone / iPod / iPadOS con Safari)
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      if (isIOS) {
        // En iOS Safari, los iframes ocultos rompen el renderizado y causan que Safari
        // imprima toda la página. Usando #thermal-print-area aislado y window.print(),
        // iOS Safari imprime con precisión únicamente el ticket de 58mm.
        logger.info('print', 'Imprimiendo en iOS Safari con aislamiento térmico', { title })
        window.print()
        setTimeout(() => {
          if (printContainer) printContainer.innerHTML = ''
        }, 1500)
        return
      }

      // 2. En navegadores de escritorio (Chrome, Edge, Firefox), usar iframe off-screen
      // NOTA: NUNCA usar `display: none` porque algunos motores excluyen el frame del layout.
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = `${width}mm`
      iframe.style.height = '100px'
      iframe.style.opacity = '0.01'
      iframe.style.pointerEvents = 'none'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) throw new Error('No se pudo acceder al documento del iframe')

      // HTML con estilos para térmica
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
              font-size: 11px;
              width: ${width}mm;
              padding: 2mm;
              color: #000;
              background: #fff;
            }
            @media print {
              body { width: ${width}mm; margin: 0; padding: 0; }
              @page { size: ${width}mm auto; margin: 0mm; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `

      doc.open()
      doc.write(printHTML)
      doc.close()

      // Esperar a que cargue y luego imprimir
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (printErr) {
          logger.warn('print', 'Fallback a impresión directa', printErr as any)
          window.print()
        } finally {
          // Eliminar iframe después de 1.5 segundos
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
            if (printContainer) printContainer.innerHTML = ''
          }, 1500)
        }
      }, 300)

      logger.info('print', 'Impresión iniciada (web)', { title })
    } catch (error) {
      logger.error('print', 'Error en impresión web', error as any)
      throw error
    }
  }

  /**
   * Imprimir a impresora térmica USB (Android vía Capacitor)
   * Requiere plugin: npx cap plugin add https://github.com/...
   */
  async printToUSBThermal(
    htmlContent: string,
    options: PrintOptions = {}
  ): Promise<void> {
    try {
      // Intenta usar Capacitor si está disponible
      if (typeof (window as any).CapacitorUSBPrinter === 'undefined') {
        logger.warn('print', 'Plugin USB no disponible, usando web print', {})
        return this.printHTML(htmlContent, options)
      }

      const plugin = (window as any).CapacitorUSBPrinter
      const { title = 'Ticket', width = 58 } = options

      // Llamar plugin personalizado
      const result = await plugin.print({
        content: htmlContent,
        title,
        width,
        encoding: 'UTF-8',
      })

      logger.info('print', 'Impresión a térmica completada', result)
    } catch (error) {
      logger.error('print', 'Error en impresión térmica', error as any)
      // Fallback a web print
      return this.printHTML(htmlContent, options)
    }
  }

  /**
   * Imprimir comprobante de venta (ticket comensal)
   */
  async printReceipt(
    receiptHTML: string,
    options: PrintOptions = {}
  ): Promise<void> {
    logger.info('print', 'Preparando impresión de ticket', {})
    return this.printHTML(receiptHTML, {
      title: 'Ticket de Venta',
      width: 58,
      ...options,
    })
  }

  /**
   * Imprimir comanda de cocina/bar
   */
  async printKitchenTicket(
    ticketHTML: string,
    options: PrintOptions = {}
  ): Promise<void> {
    logger.info('print', 'Preparando impresión de comanda', {})
    return this.printHTML(ticketHTML, {
      title: 'Comanda',
      width: 58,
      ...options,
    })
  }

  /**
   * Detectar si estamos en Android nativo (Capacitor)
   */
  isNative(): boolean {
    return typeof (window as any).Capacitor !== 'undefined'
  }

  /**
   * Detectar si hay impresora térmica disponible (Android)
   */
  async checkUSBPrinterAvailable(): Promise<boolean> {
    try {
      if (!this.isNative()) return false
      const plugin = (window as any).CapacitorUSBPrinter
      if (!plugin) return false
      const result = await plugin.checkPrinter()
      return result.available || false
    } catch (error) {
      logger.warn('print', 'Error verificando impresora USB', error as any)
      return false
    }
  }
}

export default new PrintService()
