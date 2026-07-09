import type { HourlyForecast, CachedForecast } from '../config/types'

const MEMORY_TTL_MS = 60 * 60 * 1000       // 1 hora
// Extended TTL (2h) for field use on eclipse day — pre-loaded data survives trip to observation point
const STORAGE_TTL_MS = 2 * 60 * 60 * 1000   // 2 horas
const STORAGE_PREFIX = 'eclipse-forecast-cache-'
const MAX_STORAGE_ENTRIES = 200

const memoryCache = new Map<string, CachedForecast>()

/**
 * Genera una cache key determinista para una coordenada + modelo + días.
 * Redondea lat/lon a 4 decimales para evitar misses por precisión flotante.
 */
export function getCacheKey(lat: number, lon: number, model: string, forecastDays: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)},${model},${forecastDays}`
}

/**
 * Busca en cache: primero memoria (TTL 1h), luego localStorage (TTL 5min).
 * Si encuentra en localStorage pero no en memoria, lo promueve a memoria.
 */
export function getFromCache(key: string): HourlyForecast | null {
  const now = Date.now()

  // Nivel 1: memoria
  const memEntry = memoryCache.get(key)
  if (memEntry && (now - memEntry.fetchedAt) < MEMORY_TTL_MS) {
    return memEntry.data
  }
  if (memEntry) {
    memoryCache.delete(key)
  }

  // Nivel 2: localStorage
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key)
    if (stored) {
      const parsed: CachedForecast = JSON.parse(stored)
      if ((now - parsed.fetchedAt) < STORAGE_TTL_MS) {
        // Promover a memoria
        memoryCache.set(key, parsed)
        return parsed.data
      }
      // Expirado, limpiar
      localStorage.removeItem(STORAGE_PREFIX + key)
    }
  } catch {
    // localStorage no disponible o datos corruptos
  }

  return null
}

/**
 * Guarda en ambos niveles de cache.
 */
export function setInCache(key: string, data: HourlyForecast, model: string): void {
  const entry: CachedForecast = {
    data,
    fetchedAt: Date.now(),
    model,
  }

  // Nivel 1: memoria
  memoryCache.set(key, entry)

  // Nivel 2: localStorage
  try {
    // Cap entries to avoid filling quota
    const count = countStorageEntries()
    if (count >= MAX_STORAGE_ENTRIES) {
      clearExpiredStorage()
    }
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage lleno o no disponible — limpiar y reintentar
    clearExpiredStorage()
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
    } catch {
      // Silenciar si sigue fallando
    }
  }
}

/**
 * Limpia entradas expiradas de localStorage (solo las del prefix de forecast).
 */
export function clearExpiredStorage(): void {
  try {
    const keysToRemove: string[] = []
    const now = Date.now()

    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey && storageKey.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          try {
            const parsed: CachedForecast = JSON.parse(raw)
            if ((now - parsed.fetchedAt) >= STORAGE_TTL_MS) {
              keysToRemove.push(storageKey)
            }
          } catch {
            keysToRemove.push(storageKey)
          }
        }
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k)
    }
  } catch {
    // localStorage no disponible
  }
}

/**
 * Limpia toda la cache (memoria + localStorage de forecast).
 */
export function clearAllCache(): void {
  memoryCache.clear()

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey && storageKey.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(storageKey)
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k)
    }
  } catch {
    // localStorage no disponible
  }
}

function countStorageEntries(): number {
  try {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) count++
    }
    return count
  } catch {
    return 0
  }
}
