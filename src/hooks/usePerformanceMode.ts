import { useState, useEffect } from 'react'

const STORAGE_KEY = 'localito_low_perf_mode'

export function usePerformanceMode() {
  const [isLowPerf, setIsLowPerf] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      return saved === 'true'
    }
    // Detección automática para procesadores o memoria limitados (<= 4 núcleos / <= 4GB RAM)
    const cores = navigator.hardwareConcurrency || 8
    const memory = (navigator as any).deviceMemory || 8
    return cores <= 4 || memory <= 4
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isLowPerf))
    if (isLowPerf) {
      document.documentElement.classList.add('low-perf-mode')
      document.body.classList.add('low-perf-mode')
    } else {
      document.documentElement.classList.remove('low-perf-mode')
      document.body.classList.remove('low-perf-mode')
    }
  }, [isLowPerf])

  const toggleLowPerf = () => setIsLowPerf(prev => !prev)

  return { isLowPerf, toggleLowPerf }
}
