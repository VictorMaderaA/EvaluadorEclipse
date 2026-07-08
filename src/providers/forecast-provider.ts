import type { ForecastRequest, HourlyForecast } from '../config/types'
import { getCacheKey, getFromCache, setInCache, clearExpiredStorage } from './forecast-cache'

const API_BASE = 'https://api.open-meteo.com/v1/forecast'
const HOURLY_VARS = 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility'
const MAX_BATCH_SIZE = 50
const THROTTLE_MS = 200
const RETRY_DELAY_MS = 2000

/**
 * Punto de entrada principal: obtiene forecast para N coordenadas,
 * usando cache y batching automático.
 */
export async function getForecast(request: ForecastRequest): Promise<(HourlyForecast | null)[]> {
  const { coordinates, model, forecastDays = 3, startDate, endDate } = request
  const results: (HourlyForecast | null)[] = new Array(coordinates.length).fill(null)

  // Separar coords con cache hit vs miss
  const missingIndices: number[] = []

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i]!
    const key = getCacheKey(coord.lat, coord.lon, model, forecastDays)
    const cached = getFromCache(key)
    if (cached) {
      results[i] = cached
    } else {
      missingIndices.push(i)
    }
  }

  if (missingIndices.length === 0) {
    return results
  }

  // Fetch solo las coordenadas que faltan
  const missingCoords = missingIndices.map(i => coordinates[i]!)
  const batches = splitIntoBatches(missingCoords, MAX_BATCH_SIZE)

  let fetchedIndex = 0
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]!

    // Throttle entre batches (no antes del primero)
    if (batchIdx > 0) {
      await delay(THROTTLE_MS)
    }

    const batchResults = await fetchBatch(batch, model, forecastDays, startDate, endDate)

    for (let j = 0; j < batchResults.length; j++) {
      const originalIndex = missingIndices[fetchedIndex]!
      const result = batchResults[j] ?? null

      if (result) {
        // Guardar en cache
        const coord = coordinates[originalIndex]!
        const key = getCacheKey(coord.lat, coord.lon, model, forecastDays)
        setInCache(key, result, model)
      }

      results[originalIndex] = result
      fetchedIndex++
    }
  }

  // Limpieza periódica de localStorage expirado
  clearExpiredStorage()

  return results
}

/**
 * Divide un array de coordenadas en batches de tamaño máximo.
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }
  return batches
}

/**
 * Ejecuta una petición HTTP para un batch de coordenadas.
 * Parsea la respuesta y maneja la diferencia objeto/array.
 */
async function fetchBatch(
  coords: Array<{ lat: number; lon: number }>,
  model: string,
  forecastDays: number,
  startDate?: string,
  endDate?: string,
): Promise<(HourlyForecast | null)[]> {
  const latitudes = coords.map(c => c.lat.toFixed(4)).join(',')
  const longitudes = coords.map(c => c.lon.toFixed(4)).join(',')

  let url = `${API_BASE}?latitude=${latitudes}&longitude=${longitudes}&hourly=${HOURLY_VARS}&models=${model}&timezone=auto`

  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`
  } else {
    url += `&forecast_days=${forecastDays}`
  }

  try {
    const response = await fetchWithRetry(url)
    const json: unknown = await response.json()

    // Open-Meteo: 1 coord → object, >1 coords → array
    const items: unknown[] = Array.isArray(json) ? json : [json]

    return items.map(item => parseOpenMeteoResponse(item))
  } catch {
    // Si fetch falla incluso con retry, devolver nulls para todo el batch
    return coords.map(() => null)
  }
}

/**
 * Fetch con retry: 1 intento adicional tras RETRY_DELAY_MS.
 */
async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response
  } catch (error) {
    if (retries > 0) {
      await delay(RETRY_DELAY_MS)
      return fetchWithRetry(url, retries - 1)
    }
    throw error
  }
}

/**
 * Parsea un item de respuesta Open-Meteo a HourlyForecast.
 */
function parseOpenMeteoResponse(item: unknown): HourlyForecast | null {
  try {
    const obj = item as Record<string, unknown>
    const hourly = obj['hourly'] as Record<string, unknown> | undefined

    if (!hourly) return null

    return {
      latitude: obj['latitude'] as number,
      longitude: obj['longitude'] as number,
      elevation: obj['elevation'] as number,
      times: hourly['time'] as string[],
      cloudCover: hourly['cloud_cover'] as number[],
      cloudCoverLow: hourly['cloud_cover_low'] as number[],
      cloudCoverMid: hourly['cloud_cover_mid'] as number[],
      cloudCoverHigh: hourly['cloud_cover_high'] as number[],
      visibility: hourly['visibility'] as number[],
    }
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
