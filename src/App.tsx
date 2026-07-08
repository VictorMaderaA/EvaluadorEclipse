import { useCallback, useMemo } from 'react'
import { MapView } from './views/MapView'
import type { PointWithScore } from './views/MapView'
import { generateGrid, gridToGeoJSON, evaluateGrid } from './engines/grid-engine'
import { getAllPoints } from './data/points-store'
import { addCustomPoint } from './data/points-store'
import type { ForecastData, ScoreResult } from './config/types'

// Mock forecast for demo purposes
const mockForecast: ForecastData = {
  cloudCover: 25,
  cloudCoverLow: 5,
  cloudCoverMid: 10,
  cloudCoverHigh: 10,
  visibility: 40000,
  time: '2026-07-08T12:00',
}

function App() {
  // Generate mock grid data
  const gridGeoJSON = useMemo(() => {
    const cells = generateGrid(
      { south: 38.5, north: 42.5, west: -6.0, east: 1.0 },
      30, // larger cells for demo
    )

    // Mock forecasts with varying cloud cover
    const forecasts = cells.map(() => ({
      ...mockForecast,
      cloudCover: Math.round(Math.random() * 80),
      cloudCoverLow: Math.round(Math.random() * 30),
      cloudCoverMid: Math.round(Math.random() * 40),
      cloudCoverHigh: Math.round(Math.random() * 20),
    }))
    const elevations = cells.map(() => 600 + Math.round(Math.random() * 1200))
    const primary = forecasts.map(f => f.cloudCover)
    const secondary = forecasts.map(f => f.cloudCover + Math.round((Math.random() - 0.5) * 20))

    const evaluated = evaluateGrid(cells, forecasts, elevations, primary, secondary, 45)
    return gridToGeoJSON(evaluated)
  }, [])

  // Points with mock scores
  const points: PointWithScore[] = useMemo(() => {
    return getAllPoints().map(point => ({
      point,
      score: 50 + Math.round(Math.random() * 40),
    }))
  }, [])

  // Mock evaluate function
  const handleEvaluatePoint = useCallback(async (_lat: number, _lon: number): Promise<ScoreResult> => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 500))
    return {
      total: 60 + Math.round(Math.random() * 30),
      components: { meteo: 0.8, layers: 0.7, corridor: 0.6, elevation: 0.5, confidence: 0.9 },
      penalty: 1.0,
      explanation: 'Condiciones moderadas previstas para la observación.',
    }
  }, [])

  // Save point handler
  const handleSavePoint = useCallback((lat: number, lon: number, name: string, elevation: number) => {
    addCustomPoint({
      name,
      region: 'Custom',
      coordinates: { lat, lon },
      elevation,
    })
    // In a real app, would trigger re-render of points
    console.log(`Punto guardado: ${name} (${lat.toFixed(4)}, ${lon.toFixed(4)})`)
  }, [])

  return (
    <div className="h-screen w-screen">
      <MapView
        gridGeoJSON={gridGeoJSON}
        points={points}
        onPointSelect={(id) => console.log('Selected point:', id)}
        onEvaluatePoint={handleEvaluatePoint}
        onSavePoint={handleSavePoint}
      />
    </div>
  )
}

export default App
