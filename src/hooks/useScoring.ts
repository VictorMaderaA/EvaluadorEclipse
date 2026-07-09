import { useEffect, useState, useRef } from 'react'
import type { ForecastData, HourlyForecast } from '../config/types'
import type { EclipseConfig } from '../config/eclipse-config'
import type { PointWithScore } from '../views/MapView'
import type { GridGeoJSON } from '../engines/grid-engine'
import type { TimelineDataPoint } from '../components/TimelineChart'
import { getAllPoints } from '../data/points-store'
import { saveLastScore } from '../data/last-scores-store'
import { getForecast } from '../providers/forecast-provider'
import { getElevationBatch } from '../providers/elevation-provider'
import { getSolarPosition, getCorridorPoints } from '../engines/solar-engine'
import { calculateScore } from '../engines/score-engine'
import { generateGrid, evaluateGrid, gridToGeoJSON } from '../engines/grid-engine'
import { DEFAULT_SCORING_CONFIG } from '../config/scoring-config'

const DEBOUNCE_MS = 300

/** Grid zones with variable resolution. Dense zones render on top of the global grid. */
export interface GridZone {
  name: string
  bounds: { south: number; north: number; east: number; west: number }
  cellSizeKm: number
}

export const DEFAULT_GRID_ZONES: GridZone[] = [
  { name: 'España general', bounds: { south: 39.5, north: 43.5, west: -6.0, east: 1.0 }, cellSizeKm: 30 },
  { name: 'Zona Soria-Corella', bounds: { south: 41.0, north: 42.5, west: -3.5, east: -1.0 }, cellSizeKm: 10 },
]

export interface ScoringState {
  loading: boolean
  error: string | null
  info: string | null
  points: PointWithScore[]
  gridGeoJSON: GridGeoJSON | null
  timelineData: Map<string, TimelineDataPoint[]>
  lastUpdated: Date | null
}

export function useScoring(selectedTime: Date, config: EclipseConfig, refreshKey?: number): ScoringState {
  const [state, setState] = useState<ScoringState>({
    loading: true,
    error: null,
    info: null,
    points: [],
    gridGeoJSON: null,
    timelineData: new Map(),
    lastUpdated: null,
  })

  const abortRef = useRef(false)

  useEffect(() => {
    abortRef.current = false

    const timeout = setTimeout(() => {
      void runScoring()
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timeout)
      abortRef.current = true
    }

    async function runScoring() {
      setState(prev => ({ ...prev, loading: true, error: null, info: null }))

      try {
        const points = getAllPoints()

        // Validate forecast date range (max ~7 days)
        const now = new Date()
        const diffMs = selectedTime.getTime() - now.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays > 7) {
          setState({
            loading: false,
            error: 'La fecha seleccionada está fuera del rango de previsión (máx. ~7 días). Los datos solo estarán disponibles cuando se acerque la fecha.',
            info: null,
            points: [],
            gridGeoJSON: null,
            timelineData: new Map(),
            lastUpdated: null,
          })
          return
        }

        const solar = getSolarPosition(selectedTime, 40.4, -3.7) // center of Spain for grid

        // Skip if sun is below horizon
        if (solar.altitudeDeg < 0) {
          setState({
            loading: false,
            error: null,
            info: 'Sol bajo el horizonte a la hora seleccionada. Mueve el slider a horas diurnas para evaluar.',
            points: points.map(p => ({ point: p, score: undefined })),
            gridGeoJSON: null,
            timelineData: new Map(),
            lastUpdated: null,
          })
          return
        }

        // --- Score catalog/custom points ---
        const pointResults = await scorePoints(points, selectedTime)
        if (abortRef.current) return

        // Save last scores for trend
        for (const pr of pointResults) {
          if (pr.score !== undefined) {
            saveLastScore(pr.point.id, pr.score)
          }
        }

        // --- Score grid ---
        const gridResult = await scoreGrid(selectedTime, solar.altitudeDeg)
        if (abortRef.current) return

        // --- Timeline data ---
        const timelineData = buildTimelineData(points, selectedTime)

        setState({
          loading: false,
          error: null,
          info: null,
          points: pointResults,
          gridGeoJSON: gridResult,
          timelineData,
          lastUpdated: new Date(),
        })
      } catch (err) {
        if (!abortRef.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          }))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime.getTime(), config.mode, config.eclipseDate, config.eclipseTime, refreshKey])

  return state
}

async function scorePoints(
  points: ReturnType<typeof getAllPoints>,
  selectedTime: Date,
): Promise<PointWithScore[]> {
  const results: PointWithScore[] = []

  // Batch all coordinates: point + corridor for each
  const allCoords: Array<{ lat: number; lon: number }> = []
  const pointMeta: Array<{ pointIndex: number; type: 'point' | 'corridor'; corridorIndex?: number }> = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]!
    const solar = getSolarPosition(selectedTime, point.coordinates.lat, point.coordinates.lon)

    if (solar.altitudeDeg < 0) {
      results.push({ point, score: undefined })
      continue
    }

    // Point itself
    allCoords.push(point.coordinates)
    pointMeta.push({ pointIndex: i, type: 'point' })

    // Corridor points
    const corridor = getCorridorPoints(point.coordinates.lat, point.coordinates.lon, solar.azimuthNorthDeg)
    for (let c = 0; c < corridor.length; c++) {
      allCoords.push(corridor[c]!)
      pointMeta.push({ pointIndex: i, type: 'corridor', corridorIndex: c })
    }
  }

  if (allCoords.length === 0) {
    return points.map(p => ({ point: p, score: undefined }))
  }

  // Fetch forecasts for both models
  const [primaryForecasts, secondaryForecasts] = await Promise.all([
    getForecast({ coordinates: allCoords, model: 'best_match', forecastDays: 3 }),
    getForecast({ coordinates: allCoords, model: 'icon_eu', forecastDays: 3 }),
  ])

  // Group results by point and calculate scores
  const pointForecasts = new Map<number, { point: HourlyForecast | null; corridor: (HourlyForecast | null)[] ; primary: HourlyForecast | null; secondary: HourlyForecast | null }>()

  for (let i = 0; i < pointMeta.length; i++) {
    const meta = pointMeta[i]!
    const idx = meta.pointIndex
    if (!pointForecasts.has(idx)) {
      pointForecasts.set(idx, { point: null, corridor: [], primary: null, secondary: null })
    }
    const entry = pointForecasts.get(idx)!

    if (meta.type === 'point') {
      entry.point = primaryForecasts[i] ?? null
      entry.primary = primaryForecasts[i] ?? null
      entry.secondary = secondaryForecasts[i] ?? null
    } else {
      entry.corridor.push(primaryForecasts[i] ?? null)
    }
  }

  // Calculate score for each point
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!
    const existing = results.find(r => r.point.id === point.id)
    if (existing) continue // already added (sun below horizon)

    const data = pointForecasts.get(i)
    if (!data || !data.point) {
      results.push({ point, score: undefined })
      continue
    }

    const solar = getSolarPosition(selectedTime, point.coordinates.lat, point.coordinates.lon)
    const forecast = extractInstant(data.point, selectedTime)
    const corridorForecasts = data.corridor
      .filter((f): f is HourlyForecast => f !== null)
      .map(f => extractInstant(f, selectedTime))

    const primaryCC = forecast.cloudCover
    const secondaryCC = data.secondary ? extractInstant(data.secondary, selectedTime).cloudCover : primaryCC

    const scoreResult = calculateScore(
      forecast,
      corridorForecasts,
      point.elevation,
      primaryCC,
      secondaryCC,
      solar.altitudeDeg,
      DEFAULT_SCORING_CONFIG,
    )

    results.push({ point, score: scoreResult.total, scoreResult })
  }

  return results
}

async function scoreGrid(selectedTime: Date, solarAltitudeDeg: number): Promise<GridGeoJSON | null> {
  // Generate grids for all zones and combine into a single GeoJSON
  const allFeatures: GridGeoJSON['features'] = []

  for (const zone of DEFAULT_GRID_ZONES) {
    const cells = generateGrid(zone.bounds, zone.cellSizeKm)
    const centroids = cells.map(c => c.centroid)

    // Fetch forecasts for grid centroids
    const [primaryForecasts, secondaryForecasts] = await Promise.all([
      getForecast({ coordinates: centroids, model: 'best_match', forecastDays: 3 }),
      getForecast({ coordinates: centroids, model: 'icon_eu', forecastDays: 3 }),
    ])

    // Get elevations for grid centroids
    const elevations = await getElevationBatch(centroids)

    // Extract instant data
    const forecasts: (ForecastData | null)[] = primaryForecasts.map(f =>
      f ? extractInstant(f, selectedTime) : null,
    )
    const primaryCCs = primaryForecasts.map(f => f ? extractInstant(f, selectedTime).cloudCover : 0)
    const secondaryCCs = secondaryForecasts.map(f => f ? extractInstant(f, selectedTime).cloudCover : 0)

    const evaluated = evaluateGrid(cells, forecasts, elevations, primaryCCs, secondaryCCs, solarAltitudeDeg)
    const zoneGeoJSON = gridToGeoJSON(evaluated)
    allFeatures.push(...zoneGeoJSON.features)
  }

  return { type: 'FeatureCollection', features: allFeatures }
}

function buildTimelineData(
  points: ReturnType<typeof getAllPoints>,
  _selectedTime: Date,
): Map<string, TimelineDataPoint[]> {
  // Timeline data requires full hourly forecast per point
  // For now, return empty — will be populated when forecast data is cached
  const map = new Map<string, TimelineDataPoint[]>()
  for (const point of points) {
    map.set(point.id, [])
  }
  return map
}

/**
 * Extracts the ForecastData for the closest hour to selectedTime from an HourlyForecast.
 */
function extractInstant(hourly: HourlyForecast, selectedTime: Date): ForecastData {
  const targetMs = selectedTime.getTime()
  let closestIdx = 0
  let closestDiff = Infinity

  for (let i = 0; i < hourly.times.length; i++) {
    const diff = Math.abs(new Date(hourly.times[i]!).getTime() - targetMs)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIdx = i
    }
  }

  return {
    cloudCover: hourly.cloudCover[closestIdx] ?? 0,
    cloudCoverLow: hourly.cloudCoverLow[closestIdx] ?? 0,
    cloudCoverMid: hourly.cloudCoverMid[closestIdx] ?? 0,
    cloudCoverHigh: hourly.cloudCoverHigh[closestIdx] ?? 0,
    visibility: hourly.visibility[closestIdx] ?? 0,
    time: hourly.times[closestIdx] ?? '',
  }
}
