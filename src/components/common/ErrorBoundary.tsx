import React from 'react'
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary'
import logger from '@/utils/logger'

// Contador de errores para detectar errores recurrentes
let errorCount = 0

interface ErrorFallbackProps extends FallbackProps {
  errorCount: number
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const isRecurring = errorCount > 2

  const handleReload = () => {
    logger.info('error-boundary', 'Recargando aplicación completa')
    errorCount = 0 // Reset counter
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="max-w-lg w-full bg-white shadow-xl rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600 font-bold text-xl">
            !
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Se ha producido un error</h2>
            {errorCount > 1 && (
              <p className="text-xs text-gray-500">Error recurrente ({errorCount} veces)</p>
            )}
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-semibold mb-1">✓ Tu orden y sesión están guardadas</p>
          <p className="text-xs text-blue-600">
            El estado crítico (órdenes, usuario, mesa) está protegido en Zustand y NO se perderá.
          </p>
        </div>

        <p className="text-sm text-gray-700 mb-3">
          Puedes intentar continuar o recargar la aplicación si el problema persiste.
        </p>
        
        {Boolean(error) && (
          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 mb-2">
              Ver detalles técnicos
            </summary>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-32 text-gray-600">
              {(error as any)?.message || String(error)}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2">
          {!isRecurring && (
            <button 
              onClick={resetErrorBoundary}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Reintentar
            </button>
          )}
          
          <button 
            onClick={handleReload}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            Recargar Página
          </button>
        </div>

        {isRecurring && (
          <p className="text-xs text-red-600 mt-3 text-center">
            ⚠️ El error persiste. Te recomendamos recargar la página completamente.
          </p>
        )}
      </div>
    </div>
  )
}

// Función para registrar errores
function onError(error: unknown, info: any) {
  errorCount++
  
  if (errorCount > 3) {
    logger.warn('error-boundary', `Error recurrente detectado (${errorCount} veces), sugiriendo recarga`)
  }

  // Detectar error de carga de módulos (común tras un nuevo deploy en Vercel)
  const errorStr = (error as any)?.message || String(error);
  if (
    errorStr.includes('Failed to fetch dynamically imported module') || 
    errorStr.includes('Load chunk') ||
    errorStr.includes('Importing a module script failed')
  ) {
    logger.warn('error-boundary', 'Detectado error de despliegue (chunk mismatch). Recargando app...');
    // Pequeño delay para asegurar que el log se envíe antes de recargar
    setTimeout(() => window.location.reload(), 100);
    return
  }

  logger.error('error-boundary', 'Error capturado por ErrorBoundary', { 
    error: (error as any)?.message || String(error), 
    componentStack: info?.componentStack,
    errorCount 
  })
}

// Función para reset del error boundary
function onReset() {
  logger.info('error-boundary', 'Usuario reinició componente visual')
}

// Componente wrapper que usa react-error-boundary
interface ErrorBoundaryProps {
  children: React.ReactNode
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary 
      FallbackComponent={(props) => <ErrorFallback {...props} errorCount={errorCount} />}
      onError={onError}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  )
}
