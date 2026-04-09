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

import { Suspense, lazy, useEffect, useState, useMemo } from 'react'
import logger from '@/utils/logger'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import DeviceVerification from '@/components/auth/DeviceVerification'
import NavBar from '@/components/layout/NavBar'
import OfflineIndicator from '@/components/common/OfflineIndicator'
import { ToastProvider } from '@/contexts/ToastContext'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, Share, PlusSquare } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { supabase } from '@/config/supabase'
import { authLogout, resolveAuthorizedAppUser } from '@/services/authService'
import { APP_CONFIG } from '@/config/constants'

const Login = lazy(() => import('@/pages/Login'))
const POS = lazy(() => import('@/pages/POS'))
const Admin = lazy(() => import('@/pages/Admin'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Reports = lazy(() => import('@/pages/Reports'))
const Purchases = lazy(() => import('@/pages/Purchases'))
const TableMonitor = lazy(() => import('@/pages/TableMonitor'))
const Closing = lazy(() => import('@/pages/Closing'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback').then(module => ({ default: module.AuthCallback })))
const NotFound = lazy(() => import('@/pages/NotFound'))

function App() {
  const { isAuthenticated, currentUser, currentDevice, setCurrentUser, setAuthenticated } = useAppStore()
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)

  // Detectar si es iOS y si NO está en modo standalone (instalada)
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), [])
  const isStandalone = useMemo(() => 
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone
  , [])

  // Hook de notificaciones (solo para prompt de permisos)
  const { permission, requestPermission } = useNotifications(currentUser?.id || null)

  const needsDeviceApproval = false;

  useEffect(() => {
    logger.info('app', 'Auth state', { isAuthenticated, device: currentDevice, needsApproval: needsDeviceApproval })
  }, [isAuthenticated, currentDevice, needsDeviceApproval])

  // Solicitar permiso de notificaciones al usuario autenticado
  useEffect(() => {
    if (isAuthenticated && permission === 'default' && !showPermissionPrompt) {
      // Mostrar prompt después de 3 segundos de estar autenticado
      const timer = setTimeout(() => {
        setShowPermissionPrompt(true)
      }, 3000)
      
      return () => clearTimeout(timer)
    }

    // Mostrar prompt de instalación iOS si aplica
    if (isAuthenticated && isIOS && !isStandalone) {
      const timer = setTimeout(() => {
        setShowIOSPrompt(true)
      }, 6000)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [isAuthenticated, permission, showPermissionPrompt])

  useEffect(() => {
    const hydrateFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && (!isAuthenticated || !currentUser?.organizationId)) {
        const authorizedUser = await resolveAuthorizedAppUser(session.user)
        if (!authorizedUser) {
          await authLogout()
          setCurrentUser(null)
          setAuthenticated(false)
          return
        }
        setCurrentUser(authorizedUser)
        setAuthenticated(true)
      }
    }

    hydrateFromSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void (async () => {
          const authorizedUser = await resolveAuthorizedAppUser(session.user)
          if (!authorizedUser) {
            await authLogout()
            setCurrentUser(null)
            setAuthenticated(false)
            return
          }
          setCurrentUser(authorizedUser)
          setAuthenticated(true)
        })()
        return
      }

      setCurrentUser(null)
      setAuthenticated(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [isAuthenticated, currentUser?.organizationId, setAuthenticated, setCurrentUser])

  const handleAcceptNotifications = async () => {
    await requestPermission()
    setShowPermissionPrompt(false)
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ToastProvider>
        {/* 🎨 FONDO BASE GLOBAL */}
        <div className="fixed inset-0 bg-slate-50 z-[-2]" />

        {/* Fondo doodle global */}
        <div 
          className="fixed inset-0 z-[-1] opacity-5 pointer-events-none bg-repeat"
          style={{
            backgroundImage: 'url("/doodle_ceviche.png")',
            backgroundSize: '300px', // Ajusta el tamaño del patrón
            filter: 'grayscale(100%)' // Opcional: para que no compita con los colores de la UI
          }}
        />

        <div className="relative min-h-screen">
          {/* Solo mostrar NavBar si está autenticado y el dispositivo está aprobado */}
          {isAuthenticated && !needsDeviceApproval && <NavBar />}

          {/* OfflineIndicator - mostrar siempre cuando está offline */}
          <OfflineIndicator />

        {/* Prompt para solicitar permiso de notificaciones */}
        {showPermissionPrompt && permission === 'default' && (
          <div className="fixed bottom-6 right-4 left-4 sm:left-auto bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-5 max-w-sm z-50 animate-slide-in ring-1 ring-black/5">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-2 rounded-xl">
                <Bell className="w-6 h-6 text-blue-400 flex-shrink-0" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">
                  Activar notificaciones
                </h4>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                  Recibe alertas de nuevas órdenes, platillos listos e inventario bajo.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptNotifications}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    Activar
                  </button>
                  <button
                    onClick={() => setShowPermissionPrompt(false)}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-bold transition-all border border-white/10"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guía de Instalación iOS */}
        {showIOSPrompt && (
          <div className="fixed bottom-20 right-4 left-4 bg-indigo-600 text-white rounded-2xl shadow-2xl p-4 z-[60] animate-bounce-subtle border border-white/20">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Share className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold">¡Úsala como App!</p>
                <p>Toca <Share className="inline w-3 h-3" /> y luego <PlusSquare className="inline w-3 h-3" /> "Añadir a inicio" para pantalla completa.</p>
              </div>
              <button onClick={() => setShowIOSPrompt(false)} className="text-white/60 hover:text-white">
                <Bell className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </div>
        )}

        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />

            {!isAuthenticated ? (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : needsDeviceApproval ? (
              <>
                <Route path="*" element={<DeviceVerification />} />
              </>
            ) : (
              <>
                                <Route path="/" element={<Navigate to="/pos" replace />} />
                                <Route path="/login" element={<Navigate to="/pos" replace />} />
                                <Route path="/pos" element={<POS />} />
                                <Route path="/tables" element={['admin', 'supervisor', 'capitan'].includes(currentUser?.role || '') ? <TableMonitor /> : <Navigate to="/pos" />} />
                                <Route path="/cuentas" element={['admin', 'supervisor', 'capitan'].includes(currentUser?.role || '') ? <TableMonitor /> : <Navigate to="/pos" />} />
                                <Route path="/mesas" element={<Navigate to="/cuentas" replace />} />
                                <Route path="/admin" element={currentUser?.role === 'admin' ? <Admin /> : <Navigate to="/pos" />} />
                                {APP_CONFIG.EVENT_FEATURES.INVENTORY && (
                                  <Route path="/inventory" element={['admin', 'supervisor'].includes(currentUser?.role || '') ? <Inventory /> : <Navigate to="/pos" />} />
                                )}
                                {APP_CONFIG.EVENT_FEATURES.PURCHASES && (
                                  <Route path="/purchases" element={['admin', 'supervisor'].includes(currentUser?.role || '') ? <Purchases /> : <Navigate to="/pos" />} />
                                )}
                                {APP_CONFIG.EVENT_FEATURES.REPORTS && <Route path="/reports" element={<Reports />} />}
                                {APP_CONFIG.EVENT_FEATURES.CLOSING && (
                                  <Route path="/closing" element={currentUser?.role === 'admin' ? <Closing /> : <Navigate to="/pos" />} />
                                )}
                                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </Suspense>
      </div>
    </ToastProvider>
    </Router>
  )
}

export default App
