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
