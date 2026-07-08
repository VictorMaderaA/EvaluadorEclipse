import type { EclipseConfig } from '../config/eclipse-config'
import { configToUrlParams } from '../config/eclipse-config'

interface ModeSelectorProps {
  config: EclipseConfig
  onConfigChange: (config: EclipseConfig) => void
}

export function ModeSelector({ config, onConfigChange }: ModeSelectorProps) {
  const setMode = (mode: '72h' | 'eclipse') => {
    onConfigChange({ ...config, mode })
  }

  const handleShare = () => {
    const url = window.location.origin + window.location.pathname + configToUrlParams(config)
    navigator.clipboard.writeText(url).catch(() => {
      prompt('Copiar URL:', url)
    })
  }

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setMode('72h')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            config.mode === '72h'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          72h
        </button>
        <button
          onClick={() => setMode('eclipse')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            config.mode === 'eclipse'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Eclipse
        </button>
      </div>

      {/* Eclipse config panel */}
      {config.mode === 'eclipse' && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={config.eclipseDate}
            onChange={(e) => onConfigChange({ ...config, eclipseDate: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            type="time"
            value={config.eclipseTime}
            onChange={(e) => onConfigChange({ ...config, eclipseTime: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-400 text-xs">
            -{config.windowBefore}/+{config.windowAfter}min
          </span>
          <button
            onClick={handleShare}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Compartir
          </button>
        </div>
      )}
    </div>
  )
}
