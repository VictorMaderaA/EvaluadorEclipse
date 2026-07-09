import { useCallback, useState } from 'react'
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GridGeoJSON } from '../engines/grid-engine'
import type { ObservationPoint, ScoreResult } from '../config/types'

// Alternative if OpenFreeMap disappears: https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export interface PointWithScore {
  point: ObservationPoint
  score?: number
  scoreResult?: ScoreResult
}

export interface MapViewProps {
  gridGeoJSON?: GridGeoJSON | null
  points?: PointWithScore[]
  onMapClick?: (lat: number, lon: number) => void
  onPointSelect?: (pointId: string) => void
  onEvaluatePoint?: (lat: number, lon: number) => Promise<ScoreResult | null>
  onSavePoint?: (lat: number, lon: number, name: string, elevation: number) => void
}

interface ClickedPointState {
  lat: number
  lon: number
  state: 'loading' | 'done'
  result: ScoreResult | null
}

export function MapView({
  gridGeoJSON,
  points,
  onPointSelect,
  onEvaluatePoint,
  onSavePoint,
}: MapViewProps) {
  const [clickedPoint, setClickedPoint] = useState<ClickedPointState | null>(null)

  const handleClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const { lat, lng } = event.lngLat

      setClickedPoint({ lat, lon: lng, state: 'loading', result: null })

      if (onEvaluatePoint) {
        try {
          const result = await onEvaluatePoint(lat, lng)
          setClickedPoint({ lat, lon: lng, state: 'done', result })
        } catch {
          setClickedPoint({ lat, lon: lng, state: 'done', result: null })
        }
      } else {
        setClickedPoint({ lat, lon: lng, state: 'done', result: null })
      }
    },
    [onEvaluatePoint],
  )

  const handleSavePoint = useCallback(() => {
    if (!clickedPoint || !onSavePoint) return
    const name = prompt('Nombre del punto:')
    if (!name) return
    onSavePoint(clickedPoint.lat, clickedPoint.lon, name, 0)
    setClickedPoint(null)
  }, [clickedPoint, onSavePoint])

  return (
    <Map
      initialViewState={{
        latitude: 40.4168,
        longitude: -3.7038,
        zoom: 6,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      onClick={handleClick}
    >
      {/* Grid heatmap layer */}
      {gridGeoJSON && (
        <Source type="geojson" data={gridGeoJSON}>
          <Layer
            id="grid-fill"
            type="fill"
            filter={['has', 'score']}
            paint={{
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'score'],
                0, '#d32f2f',
                25, '#f57c00',
                50, '#fdd835',
                75, '#66bb6a',
                100, '#2e7d32',
              ],
              'fill-opacity': 0.5,
            }}
          />
          <Layer
            id="grid-outline"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 0.5,
              'line-opacity': 0.3,
            }}
          />
        </Source>
      )}

      {/* Point markers */}
      {points?.map(({ point, score }) => (
        <Marker
          key={point.id}
          latitude={point.coordinates.lat}
          longitude={point.coordinates.lon}
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            onPointSelect?.(point.id)
          }}
        >
          <div
            className="w-6 h-6 rounded-full border-2 border-white shadow-md cursor-pointer"
            style={{ backgroundColor: scoreToColor(score) }}
            title={`${point.name}: ${score ?? '?'}/100`}
          />
        </Marker>
      ))}

      {/* Click-to-evaluate popup */}
      {clickedPoint && (
        <Popup
          latitude={clickedPoint.lat}
          longitude={clickedPoint.lon}
          onClose={() => setClickedPoint(null)}
          closeOnClick={false}
        >
          <div className="p-2 min-w-[180px]">
            <p className="text-xs text-gray-500">
              {clickedPoint.lat.toFixed(4)}, {clickedPoint.lon.toFixed(4)}
            </p>
            {clickedPoint.state === 'loading' && (
              <p className="text-sm mt-1">Evaluando...</p>
            )}
            {clickedPoint.state === 'done' && clickedPoint.result && (
              <div className="mt-1">
                <p className="text-lg font-bold">
                  {clickedPoint.result.total}/100
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {clickedPoint.result.explanation}
                </p>
              </div>
            )}
            {clickedPoint.state === 'done' && !clickedPoint.result && (
              <p className="text-sm mt-1 text-gray-500">Sin datos disponibles</p>
            )}
            {onSavePoint && (
              <button
                onClick={handleSavePoint}
                className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 w-full"
              >
                📌 Guardar punto
              </button>
            )}
          </div>
        </Popup>
      )}
    </Map>
  )
}

function scoreToColor(score?: number): string {
  if (score === undefined) return '#9e9e9e'
  if (score < 25) return '#d32f2f'
  if (score < 50) return '#f57c00'
  if (score < 75) return '#66bb6a'
  return '#2e7d32'
}
