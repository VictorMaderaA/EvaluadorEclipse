export interface ObservationPoint {
  id: string
  name: string
  region: string
  coordinates: { lat: number; lon: number }
  elevation: number
  source: 'catalog' | 'custom'
  metadata?: Record<string, unknown>
  tags?: string[]
}

export interface ForecastData {
  cloudCover: number
  cloudCoverLow: number
  cloudCoverMid: number
  cloudCoverHigh: number
  visibility: number
  time: string
}

export interface ScoreResult {
  total: number
  components: {
    meteo: number
    layers: number
    corridor: number
    elevation: number
    confidence: number
  }
  penalty: number
  explanation: string
}

export interface SolarPosition {
  altitudeDeg: number
  azimuthNorthDeg: number
}

export interface GridCell {
  bounds: [[number, number], [number, number], [number, number], [number, number]]
  centroid: { lat: number; lon: number }
  score?: number
  forecastData?: ForecastData
}

/** Respuesta horaria completa de Open-Meteo para una coordenada */
export interface HourlyForecast {
  latitude: number
  longitude: number
  elevation: number
  times: string[]
  cloudCover: number[]
  cloudCoverLow: number[]
  cloudCoverMid: number[]
  cloudCoverHigh: number[]
  visibility: number[]
}

/** Opciones para consultar forecast */
export interface ForecastRequest {
  coordinates: Array<{ lat: number; lon: number }>
  model: 'best_match' | 'icon_eu'
  forecastDays?: number
  startDate?: string
  endDate?: string
}

/** Resultado de cache con metadata */
export interface CachedForecast {
  data: HourlyForecast
  fetchedAt: number
  model: string
}
