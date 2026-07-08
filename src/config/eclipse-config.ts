export interface EclipseConfig {
  mode: '72h' | 'eclipse'
  eclipseDate: string
  eclipseTime: string
  windowBefore: number
  windowAfter: number
}

export const DEFAULT_ECLIPSE_CONFIG: EclipseConfig = {
  mode: '72h',
  eclipseDate: '',
  eclipseTime: '',
  windowBefore: 60,
  windowAfter: 15,
}

const STORAGE_KEY = 'eclipse-config'

/**
 * Carga la configuración con prioridad: URL params > localStorage > defaults.
 */
export function loadEclipseConfig(): EclipseConfig {
  // 1. URL params (máxima prioridad)
  try {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    if (mode === 'eclipse' || mode === '72h') {
      return {
        mode,
        eclipseDate: params.get('date') ?? '',
        eclipseTime: params.get('time') ?? '',
        windowBefore: Number(params.get('before')) || DEFAULT_ECLIPSE_CONFIG.windowBefore,
        windowAfter: Number(params.get('after')) || DEFAULT_ECLIPSE_CONFIG.windowAfter,
      }
    }
  } catch {
    // window.location no disponible (SSR/test sin DOM)
  }

  // 2. localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<EclipseConfig>
      return { ...DEFAULT_ECLIPSE_CONFIG, ...parsed }
    }
  } catch {
    // localStorage no disponible o datos corruptos
  }

  // 3. Defaults
  return { ...DEFAULT_ECLIPSE_CONFIG }
}

/**
 * Guarda la configuración en localStorage.
 */
export function saveEclipseConfig(config: EclipseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage no disponible
  }
}

/**
 * Genera URL params compartibles desde la configuración.
 */
export function configToUrlParams(config: EclipseConfig): string {
  const params = new URLSearchParams()
  params.set('mode', config.mode)
  if (config.mode === 'eclipse') {
    if (config.eclipseDate) params.set('date', config.eclipseDate)
    if (config.eclipseTime) params.set('time', config.eclipseTime)
    if (config.windowBefore !== DEFAULT_ECLIPSE_CONFIG.windowBefore) {
      params.set('before', String(config.windowBefore))
    }
    if (config.windowAfter !== DEFAULT_ECLIPSE_CONFIG.windowAfter) {
      params.set('after', String(config.windowAfter))
    }
  }
  return `?${params.toString()}`
}

/**
 * Calcula el Date del instante central del eclipse desde la config.
 * Devuelve null si faltan date o time.
 */
export function getSelectedDateTime(config: EclipseConfig): Date | null {
  if (!config.eclipseDate || !config.eclipseTime) return null
  const dateTime = new Date(`${config.eclipseDate}T${config.eclipseTime}`)
  return isNaN(dateTime.getTime()) ? null : dateTime
}
