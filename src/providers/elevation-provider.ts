const API_URL = 'https://api.open-meteo.com/v1/elevation'
const RETRY_DELAY_MS = 2000

/**
 * Obtiene la elevación para una sola coordenada.
 */
export async function getElevation(lat: number, lon: number): Promise<number> {
  const results = await getElevationBatch([{ lat, lon }])
  return results[0] ?? 0
}

/**
 * Obtiene la elevación para múltiples coordenadas en una sola llamada.
 * Devuelve 0 para coordenadas que fallen (fallback seguro).
 */
export async function getElevationBatch(
  coords: Array<{ lat: number; lon: number }>,
): Promise<number[]> {
  if (coords.length === 0) return []

  const latitudes = coords.map(c => c.lat.toFixed(4)).join(',')
  const longitudes = coords.map(c => c.lon.toFixed(4)).join(',')
  const url = `${API_URL}?latitude=${latitudes}&longitude=${longitudes}`

  try {
    const response = await fetchWithRetry(url)
    const json = (await response.json()) as { elevation: number[] }
    return json.elevation
  } catch {
    // Si falla incluso con retry, devolver 0 para todas las coordenadas
    return coords.map(() => 0)
  }
}

/**
 * Calcula el score de elevación (0.3 a 1.0).
 *
 * Curva lineal:
 * - 0m → 0.3
 * - 1500m → 1.0
 * - >1500m → 1.0 (techo)
 * - <0m → 0.3 (mínimo)
 */
export function elevationScore(elevationM: number): number {
  if (elevationM >= 1500) return 1.0
  if (elevationM <= 0) return 0.3
  return 0.3 + (elevationM / 1500) * 0.7
}

/**
 * Fetch con 1 retry tras delay.
 */
async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
      return fetchWithRetry(url, retries - 1)
    }
    throw error
  }
}
