import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getForecast, splitIntoBatches } from '../forecast-provider'
import { clearAllCache } from '../forecast-cache'
import type { ForecastRequest } from '../../config/types'

// Mock de respuesta Open-Meteo para una coordenada
function mockOpenMeteoItem(lat: number, lon: number) {
  return {
    latitude: lat,
    longitude: lon,
    elevation: 500,
    hourly: {
      time: ['2026-07-08T12:00', '2026-07-08T13:00'],
      cloud_cover: [10, 20],
      cloud_cover_low: [0, 5],
      cloud_cover_mid: [5, 10],
      cloud_cover_high: [5, 5],
      visibility: [40000, 38000],
    },
  }
}

describe('splitIntoBatches', () => {
  it('splits array into batches of given size', () => {
    const items = Array.from({ length: 120 }, (_, i) => i)
    const batches = splitIntoBatches(items, 50)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(50)
    expect(batches[1]).toHaveLength(50)
    expect(batches[2]).toHaveLength(20)
  })

  it('returns single batch if items <= batchSize', () => {
    const items = [1, 2, 3]
    const batches = splitIntoBatches(items, 50)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toEqual([1, 2, 3])
  })

  it('returns empty array for empty input', () => {
    const batches = splitIntoBatches([], 50)
    expect(batches).toHaveLength(0)
  })
})

describe('getForecast', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    clearAllCache()
    localStorage.clear()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches forecast for 1 coordinate', async () => {
    const mockItem = mockOpenMeteoItem(40.4168, -3.7038)
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockItem), { status: 200 }))

    const request: ForecastRequest = {
      coordinates: [{ lat: 40.4168, lon: -3.7038 }],
      model: 'best_match',
      forecastDays: 3,
    }

    const results = await getForecast(request)
    expect(results).toHaveLength(1)
    expect(results[0]).not.toBeNull()
    expect(results[0]!.latitude).toBe(40.4168)
    expect(results[0]!.cloudCover).toEqual([10, 20])
    expect(results[0]!.times).toHaveLength(2)
  })

  it('splits 60 coordinates into 2 batches', async () => {
    const coords = Array.from({ length: 60 }, (_, i) => ({
      lat: 40 + i * 0.01,
      lon: -3 + i * 0.01,
    }))

    // Batch 1: 50 coords → array response
    const batch1Response = coords.slice(0, 50).map(c => mockOpenMeteoItem(c.lat, c.lon))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(batch1Response), { status: 200 }))

    // Batch 2: 10 coords → array response
    const batch2Response = coords.slice(50).map(c => mockOpenMeteoItem(c.lat, c.lon))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(batch2Response), { status: 200 }))

    const request: ForecastRequest = {
      coordinates: coords,
      model: 'best_match',
      forecastDays: 3,
    }

    const results = await getForecast(request)
    expect(results).toHaveLength(60)
    expect(results.every(r => r !== null)).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('uses cache on second identical call', async () => {
    const mockItem = mockOpenMeteoItem(41.0, 2.0)
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockItem), { status: 200 }))

    const request: ForecastRequest = {
      coordinates: [{ lat: 41.0, lon: 2.0 }],
      model: 'best_match',
      forecastDays: 3,
    }

    // Primera llamada: fetch real
    const results1 = await getForecast(request)
    expect(results1[0]).not.toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Segunda llamada: cache hit, sin fetch
    const results2 = await getForecast(request)
    expect(results2[0]).not.toBeNull()
    expect(results2[0]).toEqual(results1[0])
    expect(fetchSpy).toHaveBeenCalledTimes(1) // no llamó de nuevo
  })

  it('retries once on failure then returns null', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    const request: ForecastRequest = {
      coordinates: [{ lat: 40.0, lon: -3.0 }],
      model: 'best_match',
      forecastDays: 3,
    }

    const results = await getForecast(request)
    expect(results[0]).toBeNull()
    // 1 intento + 1 retry = 2 llamadas
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  }, 10000)

  it('retries once on failure and succeeds on second attempt', async () => {
    const mockItem = mockOpenMeteoItem(40.0, -3.0)
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockItem), { status: 200 }))

    const request: ForecastRequest = {
      coordinates: [{ lat: 40.0, lon: -3.0 }],
      model: 'best_match',
      forecastDays: 3,
    }

    const results = await getForecast(request)
    expect(results[0]).not.toBeNull()
    expect(results[0]!.latitude).toBe(40.0)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  }, 10000)
})
