import { useState, useEffect, useCallback } from 'react'
import { offlineSyncService } from '@/services/offlineSyncService'
import { indexedDBService } from '@/services/indexedDBService'
import logger from '@/utils/logger'

export interface OfflineSyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingOrdersCount: number
  pendingSalesCount: number
  lastSyncTime: Date | null
  syncError: string | null
}

/**
 * Hook para sincronización offline unificado con ReisblocPOS IndexedDB
 */
export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>(() => {
    const status = offlineSyncService.getStatus()
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: status.isSyncing,
      pendingOrdersCount: Math.ceil(status.pending / 2),
      pendingSalesCount: Math.floor(status.pending / 2),
      lastSyncTime: status.lastSync ? new Date(status.lastSync) : null,
      syncError: null
    }
  })

  // Cargar contador de datos pendientes desde la cola unificada
  const loadPendingCounts = useCallback(async () => {
    try {
      await indexedDBService.init()
      const queue = await indexedDBService.getSyncQueue()
      const orders = queue.filter(q => q.collection === 'orders').length
      const sales = queue.filter(q => q.collection === 'sales').length

      setState(prev => ({
        ...prev,
        pendingOrdersCount: orders,
        pendingSalesCount: sales
      }))
    } catch (error) {
      logger.error('offline-sync', 'Error loading pending counts', error as any)
    }
  }, [])

  useEffect(() => {
    // Inicializar servicio offline
    offlineSyncService.init().catch(err => {
      logger.warn('offline-sync', 'Error inicializando servicio offline:', err)
    })

    // Limpieza de base de datos legacy 'TPVSolutions' si existe
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('TPVSolutions')
      } catch {
        // Silencioso
      }
    }

    loadPendingCounts()

    const handleOnline = () => {
      logger.info('offline-sync', '🟢 Conexión restaurada')
      setState(prev => ({ ...prev, isOnline: true, syncError: null }))
      offlineSyncService.syncQueue().then(loadPendingCounts)
    }

    const handleOffline = () => {
      logger.warn('offline-sync', '🔴 Modo sin conexión activo')
      setState(prev => ({ ...prev, isOnline: false }))
      loadPendingCounts()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Suscribirse a cambios de estado del servicio
    const unsubscribe = offlineSyncService.onStatusChange((status) => {
      setState(prev => ({
        ...prev,
        isSyncing: status.isSyncing,
        lastSyncTime: status.lastSync ? new Date(status.lastSync) : prev.lastSyncTime
      }))
      loadPendingCounts()
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [loadPendingCounts])

  /**
   * Sincronizar datos pendientes
   */
  const syncPendingData = useCallback(async () => {
    if (state.isSyncing || !state.isOnline) return

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      await offlineSyncService.syncQueue()
      await loadPendingCounts()
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        syncError: null
      }))
      logger.info('offline-sync', 'Sincronización manual completada')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error en sincronización'
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMsg
      }))
      logger.error('offline-sync', 'Sync error', error as any)
    }
  }, [state.isSyncing, state.isOnline, loadPendingCounts])

  /**
   * Guardar orden offline
   */
  const saveOrderOffline = useCallback(async (order: any) => {
    try {
      await offlineSyncService.addOrderOffline(order)
      await loadPendingCounts()
      logger.info('offline-sync', 'Orden guardada en cola local')
    } catch (error) {
      logger.error('offline-sync', 'Error saving order offline', error as any)
      throw error
    }
  }, [loadPendingCounts])

  /**
   * Guardar venta offline
   */
  const saveSaleOffline = useCallback(async (sale: any) => {
    try {
      await offlineSyncService.addSaleOffline(sale)
      await loadPendingCounts()
      logger.info('offline-sync', 'Venta guardada en cola local')
    } catch (error) {
      logger.error('offline-sync', 'Error saving sale offline', error as any)
      throw error
    }
  }, [loadPendingCounts])

  return {
    ...state,
    syncPendingData,
    saveOrderOffline,
    saveSaleOffline,
    loadPendingCounts
  }
}
