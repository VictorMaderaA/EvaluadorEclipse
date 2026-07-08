import { useState, useEffect } from 'react'

const STORAGE_KEY = 'eclipse-disclaimer-seen'

export function Disclaimer() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-50 border-t border-amber-200 px-4 py-3 shadow-lg">
      <div className="max-w-3xl mx-auto flex items-start gap-3">
        <span className="text-amber-600 text-lg">⚠️</span>
        <div className="flex-1">
          <p className="text-sm text-amber-900">
            Esta herramienta es orientativa. Las predicciones meteorológicas son estimaciones
            que pueden variar significativamente. Verificar condiciones reales antes de desplazarse.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium underline whitespace-nowrap"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
