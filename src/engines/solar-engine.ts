import SunCalc from 'suncalc'
import type { SolarPosition } from '../config/types'
import { DEFAULT_SCORING_CONFIG } from '../config/scoring-config'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180
const EARTH_RADIUS_KM = 6371

/**
 * Obtiene la posición solar (altitud y azimut) para una coordenada e instante dados.
 *
 * @param date - Fecha/hora del cálculo
 * @param lat - Latitud en grados
 * @param lon - Longitud en grados
 * @returns Posición solar con altitud en grados y azimut medido desde norte (0-360)
 */
export function getSolarPosition(date: Date, lat: number, lon: number): SolarPosition {
  const pos = SunCalc.getPosition(date, lat, lon)
  return {
    altitudeDeg: pos.altitude * RAD_TO_DEG,
    // SunCalc mide azimut desde sur, positivo al oeste.
    // Convertir a norte geográfico: sumar 180° y normalizar a [0, 360)
    azimuthNorthDeg: (pos.azimuth * RAD_TO_DEG + 180) % 360,
  }
}

/**
 * Genera los puntos del corredor direccional en la dirección del azimut solar.
 *
 * @param lat - Latitud del observador (grados)
 * @param lon - Longitud del observador (grados)
 * @param azimuthDeg - Azimut desde norte en grados (0-360)
 * @param distancesKm - Distancias de los puntos (default: [5, 10, 20])
 * @returns Array de coordenadas { lat, lon } para cada punto del corredor
 */
export function getCorridorPoints(
  lat: number,
  lon: number,
  azimuthDeg: number,
  distancesKm: number[] = DEFAULT_SCORING_CONFIG.corridorDistancesKm,
): Array<{ lat: number; lon: number }> {
  return distancesKm.map(d => {
    const [destLat, destLon] = destinationPoint(lat, lon, d, azimuthDeg)
    return { lat: destLat, lon: destLon }
  })
}

/**
 * Calcula punto destino dado origen, distancia y bearing usando trigonometría esférica.
 * Preciso a <1m para distancias ≤50km.
 *
 * @param lat - Latitud origen (grados)
 * @param lon - Longitud origen (grados)
 * @param distKm - Distancia en kilómetros
 * @param bearingDeg - Bearing desde norte en grados (0-360)
 * @returns Tupla [latitud, longitud] del destino en grados
 */
export function destinationPoint(
  lat: number,
  lon: number,
  distKm: number,
  bearingDeg: number,
): [number, number] {
  const d = distKm / EARTH_RADIUS_KM // distancia angular
  const brng = bearingDeg * DEG_TO_RAD
  const lat1 = lat * DEG_TO_RAD
  const lon1 = lon * DEG_TO_RAD

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    )

  return [lat2 * RAD_TO_DEG, lon2 * RAD_TO_DEG]
}

/**
 * Calcula el multiplicador de penalización por altitud solar baja.
 *
 * Curva por tramos:
 * - alt < 0°     → 0.0 (sol bajo horizonte)
 * - 0° ≤ alt < 10°  → 0.5 a 0.7 (lineal)
 * - 10° ≤ alt < 30° → 0.7 a 1.0 (lineal)
 * - alt ≥ 30°    → 1.0 (sin penalización)
 *
 * @param altitudeDeg - Altitud solar en grados
 * @returns Multiplicador entre 0.0 y 1.0
 */
export function getAltitudePenalty(altitudeDeg: number): number {
  if (altitudeDeg < 0) return 0.0
  if (altitudeDeg < 10) return 0.5 + (altitudeDeg / 10) * 0.2
  if (altitudeDeg < 30) return 0.7 + ((altitudeDeg - 10) / 20) * 0.3
  return 1.0
}
