import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapView } from './views/MapView'
import { Sidebar } from './views/Sidebar'
import { RankingList } from './components/RankingList'
import { PointDetail } from './components/PointDetail'
import { ModeSelector } from './components/ModeSelector'
import { TimeSlider } from './components/TimeSlider'
import type { PointWithScore } from './views/MapView'
import { generateGrid, gridToGeoJSON, evaluateGrid } from './engines/grid-engine'
import { getAllPoints, addCustomPoint } from './data/points-store'
import { loadEclipseConfig, saveEclipseConfig } from './config/eclipse-config'
import type { EclipseConfig } from './config/eclipse-config'
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
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [config, setConfig] = useState<EclipseConfig>(loadEclipseConfig)
  const [selectedTime, setSelectedTime] = useState<Date>(new Date())

  // Persist config changes
  useEffect(() => {
    saveEclipseConfig(config)
  }, [config])

  // Generate mock grid data
  const gridGeoJSON = useMemo(() => {
    const cells = generateGrid(
      { south: 38.5, north: 42.5, west: -6.0, east: 1.0 },
      30,
    )

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

  // Find selected point data
  const selectedPoint = useMemo(() => {
    if (!selectedPointId) return null
    return points.find(p => p.point.id === selectedPointId) ?? null
  }, [selectedPointId, points])

  // Mock score result for selected point
  const selectedScoreResult: ScoreResult | undefined = useMemo(() => {
    if (!selectedPoint) return undefined
    return {
      total: selectedPoint.score ?? 70,
      components: { meteo: 0.8, layers: 0.7, corridor: 0.6, elevation: 0.5, confidence: 0.9 },
      penalty: 1.0,
      explanation: 'Condiciones moderadas previstas para la observación. Alta concordancia entre modelos meteorológicos.',
    }
  }, [selectedPoint])

  // Mock evaluate function
  const handleEvaluatePoint = useCallback(async (): Promise<ScoreResult> => {
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
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 z-20 shrink-0">
        <ModeSelector config={config} onConfigChange={setConfig} />
      </header>

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar>
          {selectedPoint ? (
            <PointDetail
              point={selectedPoint.point}
              score={selectedScoreResult}
              solarPosition={{ altitudeDeg: 45, azimuthNorthDeg: 180 }}
              forecast={mockForecast}
              onBack={() => setSelectedPointId(null)}
            />
          ) : (
            <RankingList
              points={points}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
            />
          )}
        </Sidebar>

        <div className="flex-1 lg:ml-[350px] relative">
          <MapView
            gridGeoJSON={gridGeoJSON}
            points={points}
            onPointSelect={setSelectedPointId}
            onEvaluatePoint={handleEvaluatePoint}
            onSavePoint={handleSavePoint}
          />

          {/* Time slider overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <TimeSlider
              config={config}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
