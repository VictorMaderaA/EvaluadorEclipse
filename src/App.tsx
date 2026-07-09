import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapView } from './views/MapView'
import { Sidebar } from './views/Sidebar'
import { RankingList } from './components/RankingList'
import { PointDetail } from './components/PointDetail'
import { ModeSelector } from './components/ModeSelector'
import { TimeSlider } from './components/TimeSlider'
import { LoadingOverlay } from './components/LoadingOverlay'
import { Disclaimer } from './components/Disclaimer'
import { useScoring } from './hooks/useScoring'
import { addCustomPoint } from './data/points-store'
import { getForecast } from './providers/forecast-provider'
import { getElevation } from './providers/elevation-provider'
import { getSolarPosition, getCorridorPoints } from './engines/solar-engine'
import { calculateScore } from './engines/score-engine'
import { loadEclipseConfig, saveEclipseConfig } from './config/eclipse-config'
import { clearExpiredStorage } from './providers/forecast-cache'
import type { EclipseConfig } from './config/eclipse-config'
import type { ScoreResult } from './config/types'
import { DEFAULT_SCORING_CONFIG } from './config/scoring-config'

function App() {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [config, setConfig] = useState<EclipseConfig>(loadEclipseConfig)
  const [selectedTime, setSelectedTime] = useState<Date>(new Date())

  // Persist config changes
  useEffect(() => {
    saveEclipseConfig(config)
  }, [config])

  // Cleanup expired cache on startup
  useEffect(() => {
    clearExpiredStorage()
  }, [])

  // Real scoring orchestration
  const scoring = useScoring(selectedTime, config)

  // Find selected point data
  const selectedPoint = useMemo(() => {
    if (!selectedPointId) return null
    return scoring.points.find(p => p.point.id === selectedPointId) ?? null
  }, [selectedPointId, scoring.points])

  // Memoize solar position for selected point
  const selectedSolarPosition = useMemo(() => {
    if (!selectedPoint) return undefined
    return getSolarPosition(selectedTime, selectedPoint.point.coordinates.lat, selectedPoint.point.coordinates.lon)
  }, [selectedTime, selectedPoint])

  // Evaluate point on click (real APIs)
  const handleEvaluatePoint = useCallback(async (lat: number, lon: number): Promise<ScoreResult | null> => {
    try {
      const solar = getSolarPosition(selectedTime, lat, lon)
      if (solar.altitudeDeg < 0) return null

      const elevation = await getElevation(lat, lon)
      const corridorCoords = getCorridorPoints(lat, lon, solar.azimuthNorthDeg)
      const allCoords = [{ lat, lon }, ...corridorCoords]

      const [primary, secondary] = await Promise.all([
        getForecast({ coordinates: allCoords, model: 'best_match', forecastDays: 1 }),
        getForecast({ coordinates: allCoords, model: 'icon_eu', forecastDays: 1 }),
      ])

      const pointForecast = primary[0]
      if (!pointForecast) return null

      // Find closest hour
      const targetMs = selectedTime.getTime()
      let idx = 0
      let minDiff = Infinity
      for (let i = 0; i < pointForecast.times.length; i++) {
        const diff = Math.abs(new Date(pointForecast.times[i]!).getTime() - targetMs)
        if (diff < minDiff) { minDiff = diff; idx = i }
      }

      const forecast = {
        cloudCover: pointForecast.cloudCover[idx] ?? 0,
        cloudCoverLow: pointForecast.cloudCoverLow[idx] ?? 0,
        cloudCoverMid: pointForecast.cloudCoverMid[idx] ?? 0,
        cloudCoverHigh: pointForecast.cloudCoverHigh[idx] ?? 0,
        visibility: pointForecast.visibility[idx] ?? 0,
        time: pointForecast.times[idx] ?? '',
      }

      const corridorForecasts = primary.slice(1).map(f => {
        if (!f) return forecast
        return {
          cloudCover: f.cloudCover[idx] ?? 0,
          cloudCoverLow: f.cloudCoverLow[idx] ?? 0,
          cloudCoverMid: f.cloudCoverMid[idx] ?? 0,
          cloudCoverHigh: f.cloudCoverHigh[idx] ?? 0,
          visibility: f.visibility[idx] ?? 0,
          time: f.times[idx] ?? '',
        }
      })

      const secondaryCC = secondary[0]?.cloudCover[idx] ?? forecast.cloudCover

      return calculateScore(
        forecast,
        corridorForecasts,
        elevation,
        forecast.cloudCover,
        secondaryCC,
        solar.altitudeDeg,
        DEFAULT_SCORING_CONFIG,
      )
    } catch {
      return null
    }
  }, [selectedTime])

  // Save point handler
  const handleSavePoint = useCallback(async (lat: number, lon: number, name: string) => {
    let elevation = 0
    try {
      elevation = await getElevation(lat, lon)
    } catch {
      // fallback to 0
    }
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
              score={selectedPoint.scoreResult}
              solarPosition={selectedSolarPosition}
              timelineData={scoring.timelineData.get(selectedPoint.point.id)}
              onBack={() => setSelectedPointId(null)}
            />
          ) : (
            <RankingList
              points={scoring.points}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
            />
          )}
        </Sidebar>

        <div className="flex-1 lg:ml-[350px] relative">
          {scoring.loading && <LoadingOverlay />}

          {scoring.error && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {scoring.error}
            </div>
          )}

          <MapView
            gridGeoJSON={scoring.gridGeoJSON}
            points={scoring.points}
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

      <Disclaimer />
    </div>
  )
}

export default App
