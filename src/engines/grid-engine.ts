import type { ForecastData, GridCell, ScoreResult } from '../config/types'
import type { ScoringConfig } from '../config/scoring-config'
import { DEFAULT_SCORING_CONFIG } from '../config/scoring-config'
import { calculateSimplifiedScore } from './score-engine'

const KM_PER_DEG_LAT = 111

export interface GridBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface GridGeoJSON {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Polygon'; coordinates: [number, number][][] }
    properties: { score: number | null; centroid: { lat: number; lon: number } }
  }>
}

/**
 * Genera un grid de celdas rectangulares sobre un bounding box.
 *
 * @param bounds - Bounding box del área a cubrir
 * @param cellSizeKm - Tamaño de cada celda en km (default 10)
 * @returns Array de GridCell con bounds (4 esquinas) y centroide
 */
export function generateGrid(bounds: GridBounds, cellSizeKm: number = 10): GridCell[] {
  const centerLat = (bounds.north + bounds.south) / 2
  const latStep = cellSizeKm / KM_PER_DEG_LAT
  const lonStep = cellSizeKm / (KM_PER_DEG_LAT * Math.cos(centerLat * Math.PI / 180))

  const cells: GridCell[] = []

  for (let lat = bounds.south; lat < bounds.north; lat += latStep) {
    for (let lon = bounds.west; lon < bounds.east; lon += lonStep) {
      const cellSouth = lat
      const cellNorth = lat + latStep
      const cellWest = lon
      const cellEast = lon + lonStep

      cells.push({
        bounds: [
          [cellSouth, cellWest], // SW
          [cellSouth, cellEast], // SE
          [cellNorth, cellEast], // NE
          [cellNorth, cellWest], // NW
        ],
        centroid: {
          lat: (cellSouth + cellNorth) / 2,
          lon: (cellWest + cellEast) / 2,
        },
      })
    }
  }

  return cells
}

/**
 * Evalúa el score simplificado (sin corredor) para cada celda del grid.
 *
 * @param cells - Celdas generadas por generateGrid
 * @param forecasts - Forecast por celda (mismo orden), null si no disponible
 * @param elevations - Elevación por celda (metros)
 * @param primaryCloudCovers - cloud_cover del modelo primario por celda
 * @param secondaryCloudCovers - cloud_cover del modelo secundario por celda
 * @param solarAltitudeDeg - Altitud solar (uniforme para toda el área)
 * @param config - Configuración de scoring
 * @returns Celdas actualizadas con score
 */
export function evaluateGrid(
  cells: GridCell[],
  forecasts: (ForecastData | null)[],
  elevations: number[],
  primaryCloudCovers: number[],
  secondaryCloudCovers: number[],
  solarAltitudeDeg: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): GridCell[] {
  return cells.map((cell, i) => {
    const forecast = forecasts[i] ?? null
    if (!forecast) {
      return { ...cell, score: undefined }
    }

    const result: ScoreResult = calculateSimplifiedScore(
      forecast,
      elevations[i] ?? 0,
      primaryCloudCovers[i] ?? forecast.cloudCover,
      secondaryCloudCovers[i] ?? forecast.cloudCover,
      solarAltitudeDeg,
      config,
    )

    return { ...cell, score: result.total, forecastData: forecast }
  })
}

/**
 * Convierte un array de GridCell evaluadas a GeoJSON FeatureCollection.
 * GeoJSON usa [lon, lat] (inverso al formato interno).
 */
export function gridToGeoJSON(cells: GridCell[]): GridGeoJSON {
  return {
    type: 'FeatureCollection',
    features: cells.map(cell => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [cell.bounds[0][1], cell.bounds[0][0]], // SW [lon, lat]
          [cell.bounds[1][1], cell.bounds[1][0]], // SE
          [cell.bounds[2][1], cell.bounds[2][0]], // NE
          [cell.bounds[3][1], cell.bounds[3][0]], // NW
          [cell.bounds[0][1], cell.bounds[0][0]], // close ring (SW again)
        ]],
      },
      properties: {
        score: cell.score ?? null,
        centroid: cell.centroid,
      },
    })),
  }
}
