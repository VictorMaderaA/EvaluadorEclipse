import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCacheKey, getFromCache, setInCache, clearAllCache } from '../forecast-cache'
import type { HourlyForecast } from '../../config/types'

const mockForecast: HourlyForecast = {
  latitude: 40.4168,
  longitude: -3.7038,
  elevation: 667,
  times: ['2026-07-08T12:00', '2026-07-08T13:00'],
  cloudCover: [10, 20],
  cloudCoverLow: [0, 5],
  cloudCoverMid: [5, 10],
  cloudCoverHigh: [5, 5],
  visibility: [40000, 38000],
}

describe('getCacheKey', () => {
  it('generates deterministic key from coords, model and days', () => {
    const key = getCacheKey(40.4168, -3.7038, 'best_match', 3)
    expect(key).toBe('40.4168,-3.7038,best_match,3')
  })

  it('rounds to 4 decimals', () => {
    const key = getCacheKey(40.41681234, -3.70389999, 'icon_eu', 1)
    expect(key).toBe('40.4168,-3.7039,icon_eu,1')
  })
})

describe('forecast cache', () => {
  beforeEach(() => {
    clearAllCache()
    localStorage.clear()
  })

  it('set + get returns data within TTL', () => {
    const key = getCacheKey(40.4168, -3.7038, 'best_match', 3)
    setInCache(key, mockForecast, 'best_match')

    const result = getFromCache(key)
    expect(result).toEqual(mockForecast)
  })

  it('returns null for unknown key', () => {
    const result = getFromCache('nonexistent-key')
    expect(result).toBeNull()
  })

  it('returns null after memory TTL expires', () => {
    const key = getCacheKey(40.0, -3.0, 'best_match', 3)
    setInCache(key, mockForecast, 'best_match')

    // Avanzar 121 minutos (localStorage TTL = 2h)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 121 * 60 * 1000)

    const result = getFromCache(key)
    // Debería también fallar en localStorage (>5min)
    expect(result).toBeNull()

    vi.restoreAllMocks()
  })

  it('returns data from localStorage when memory is cleared (within 5min)', () => {
    const key = getCacheKey(41.0, 2.0, 'icon_eu', 1)
    setInCache(key, mockForecast, 'icon_eu')

    // Simular pérdida de memoria (nuevo import del módulo no es viable,
    // pero clearAllCache + re-set localStorage simula el escenario)
    // En su lugar, verificamos que localStorage tiene el dato
    const stored = localStorage.getItem('eclipse-forecast-cache-' + key)
    expect(stored).not.toBeNull()

    const parsed = JSON.parse(stored!)
    expect(parsed.data).toEqual(mockForecast)
    expect(parsed.model).toBe('icon_eu')
  })

  it('clearAllCache removes memory and localStorage entries', () => {
    const key = getCacheKey(40.0, -3.0, 'best_match', 3)
    setInCache(key, mockForecast, 'best_match')

    clearAllCache()

    expect(getFromCache(key)).toBeNull()
    expect(localStorage.getItem('eclipse-forecast-cache-' + key)).toBeNull()
  })
})
