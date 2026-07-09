import { useState } from 'react'
import type { ObservationPoint, ScoreResult, SolarPosition, ForecastData } from '../config/types'
import { scoreToColor, azimuthToCardinal } from './utils'
import { TimelineChart } from './TimelineChart'
import type { TimelineDataPoint } from './TimelineChart'
import { TrendIndicator } from './TrendIndicator'

interface PointDetailProps {
  point: ObservationPoint
  score?: ScoreResult
  solarPosition?: SolarPosition
  forecast?: ForecastData
  timelineData?: TimelineDataPoint[]
  onBack: () => void
  onDelete?: () => void
}

export function PointDetail({ point, score, solarPosition, forecast, timelineData, onBack, onDelete }: PointDetailProps) {
  const [showRawData, setShowRawData] = useState(false)

  return (
    <div className="p-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:text-blue-800 mb-3 flex items-center gap-1"
      >
        ← Volver al ranking
      </button>

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{point.name}</h2>
        <p className="text-sm text-gray-500">{point.region}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{point.elevation}m</span>
          <span className={`text-xs px-2 py-0.5 rounded ${point.source === 'catalog' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {point.source === 'catalog' ? 'Catálogo' : 'Custom'}
          </span>
        </div>
      </div>

      {/* Score total */}
      {score && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-bold"
              style={{ color: scoreToColor(score.total) }}
            >
              {score.total}
            </span>
            <span className="text-gray-400 text-lg">/100</span>
            <TrendIndicator currentScore={score.total} pointId={point.id} />
          </div>
          {score.penalty < 1.0 && (
            <p className="text-xs text-red-600 mt-1">
              Penalización activa: ×{score.penalty.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Component breakdown */}
      {score && (
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Desglose</h3>
          <ComponentBar label="Nubosidad total" value={score.components.meteo} />
          <ComponentBar label="Capas de nubes (baja/media/alta)" value={score.components.layers} />
          <ComponentBar label="Dirección al Sol despejada" value={score.components.corridor} />
          <ComponentBar label="Altitud del terreno" value={score.components.elevation} />
          <ComponentBar label="Fiabilidad de la predicción" value={score.components.confidence} />
        </div>
      )}

      {/* Solar data */}
      {solarPosition && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Posición solar</h3>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Alt: {solarPosition.altitudeDeg.toFixed(1)}°</span>
            <span>
              Az: {solarPosition.azimuthNorthDeg.toFixed(1)}° ({azimuthToCardinal(solarPosition.azimuthNorthDeg)})
            </span>
          </div>
        </div>
      )}

      {/* Explanation */}
      {score && score.explanation && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">{score.explanation}</p>
        </div>
      )}

      {/* Timeline chart */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Evolución temporal</h3>
        <TimelineChart data={timelineData ?? []} />
      </div>

      {/* Raw data expandible */}
      <div className="mb-4">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {showRawData ? 'Ocultar datos brutos' : 'Ver datos brutos'}
        </button>
        {showRawData && forecast && (
          <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono space-y-1">
            <p>cloud_cover: {forecast.cloudCover}%</p>
            <p>cloud_cover_low: {forecast.cloudCoverLow}%</p>
            <p>cloud_cover_mid: {forecast.cloudCoverMid}%</p>
            <p>cloud_cover_high: {forecast.cloudCoverHigh}%</p>
            <p>visibility: {forecast.visibility}m</p>
            <p>time: {forecast.time}</p>
            {solarPosition && (
              <>
                <p>solar_altitude: {solarPosition.altitudeDeg.toFixed(2)}°</p>
                <p>solar_azimuth: {solarPosition.azimuthNorthDeg.toFixed(2)}°</p>
              </>
            )}
          </div>
        )}
        {showRawData && !forecast && (
          <p className="mt-2 text-xs text-gray-400">Sin datos de forecast disponibles</p>
        )}
      </div>

      {/* Metadata */}
      {point.metadata && Object.keys(point.metadata).length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Metadata</h3>
          <div className="text-xs text-gray-600 space-y-0.5">
            {Object.entries(point.metadata).map(([key, value]) => (
              <p key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Delete custom point */}
      {point.source === 'custom' && onDelete && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <button
            onClick={onDelete}
            className="w-full text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Eliminar punto
          </button>
        </div>
      )}
    </div>
  )
}

function ComponentBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded mt-0.5">
        <div
          className="h-2 rounded transition-all"
          style={{
            width: `${value * 100}%`,
            backgroundColor: scoreToColor(Math.round(value * 100)),
          }}
        />
      </div>
    </div>
  )
}
