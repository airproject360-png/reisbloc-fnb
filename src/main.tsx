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

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/common/ErrorBoundary'
import './styles/globals.css'

// Recuperación automática ante chunks obsoletos tras nuevos despliegues
window.addEventListener('vite:preloadError', () => {
  console.warn('🔄 Chunk obsoleto detectado por Vite. Limpiando y recargando...')
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  }
  window.location.reload()
})

window.addEventListener('error', (e) => {
  const msg = String(e?.message || '').toLowerCase()
  if (msg.includes('dynamically imported module') || msg.includes('failed to fetch dynamically')) {
    console.warn('🔄 Error de importación dinámica. Limpiando y recargando...')
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
    }
    window.location.reload()
  }
})

// Registrar Service Worker para PWA y fuerza de actualización inmediata
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('✅ Service Worker registrado exitosamente')
      
      // Forzar verificación de nueva versión en cada carga
      registration.update().catch(() => {})

      // Escuchar actualizaciones y forzar reemplazo de caché inmediatamente
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nueva versión detectada. Actualizando caché...')
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          })
        }
      })
    }).catch((error) => {
      console.warn('⚠️ Error registrando Service Worker:', error)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
