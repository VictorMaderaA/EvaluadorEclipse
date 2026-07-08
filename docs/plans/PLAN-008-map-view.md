# Plan: Map View

> Issue: [#8 — Map View: MapLibre con heatmap grid + marcadores de puntos](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/8)
> Análisis: [decisiones-analisis.md § A6, B8, G1, G7](docs/analysis/decisiones-analisis.md)
> Dependencias: #7 (grid) ✅ 046e725, #6 (points) ✅ 290780e, #5 (score) ✅ 81b695d
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | — |
| 2 | ✅ Completada | 2026-07-08 | — |
| 3 | ✅ Completada | 2026-07-08 | — |
| 4 | ✅ Completada | 2026-07-08 | — |
| 5 | ✅ Completada | 2026-07-08 | — |

---

## Fase 1 — Mapa base + estructura del componente

**Objetivo:** Refactorizar `App.tsx` para extraer `MapView` como componente independiente en `src/views/`. Mapa base con tiles gratuitas, responsive (fullscreen mobile, parcial desktop).

**Archivos a crear/modificar:**
- `src/views/MapView.tsx` — componente de mapa
- `src/App.tsx` — importa MapView en layout

**Hallazgos del código:**
- `App.tsx` actual ya renderiza un mapa MapLibre con OpenFreeMap tiles
- El mapa está fullscreen (`h-screen w-screen`) — necesita adaptarse para layout split (sidebar desktop)
- `react-map-gl` ya instalado v8.1.1, `maplibre-gl` v4.7.1

**Pasos concretos:**

1. Crear `src/views/MapView.tsx`:
   ```tsx
   import Map from 'react-map-gl/maplibre'
   import 'maplibre-gl/dist/maplibre-gl.css'

   interface MapViewProps {
     onMapClick?: (lat: number, lon: number) => void
     onPointSelect?: (pointId: string) => void
   }

   export function MapView({ onMapClick, onPointSelect }: MapViewProps)
   ```
   - Renderiza el mapa con OpenFreeMap tiles
   - Props para callbacks de interacción (click libre, selección de punto)
   - `style={{ width: '100%', height: '100%' }}` — se adapta al contenedor padre

2. Actualizar `src/App.tsx` con layout provisional:
   - Desktop: mapa ocupa todo (sidebar se añade en issue #9)
   - El componente acepta children o layers como props futuras

**Fuera de alcance:** Capas de grid y marcadores (fases siguientes).

**Validación:**
- [ ] `npm run build` pasa
- [ ] `npm run dev` → mapa visible

---

## Fase 2 — Capa heatmap del grid (fill layer)

**Objetivo:** Renderizar el grid evaluado como capa GeoJSON `fill` con color-scale por score (rojo→amarillo→verde).

**Archivos a modificar:**
- `src/views/MapView.tsx` — añadir Source + Layer de react-map-gl

**Hallazgos del código:**
- `gridToGeoJSON()` ya produce GeoJSON FeatureCollection con `properties.score`
- react-map-gl expone `<Source>` y `<Layer>` para capas GeoJSON
- MapLibre soporta `fill-color` con expresiones de interpolación por propiedad

**Pasos concretos:**

1. Añadir prop `gridGeoJSON` al componente MapView:
   ```tsx
   interface MapViewProps {
     gridGeoJSON?: GridGeoJSON | null
     // ...
   }
   ```

2. Renderizar con Source + Layer:
   ```tsx
   {gridGeoJSON && (
     <Source type="geojson" data={gridGeoJSON}>
       <Layer
         type="fill"
         paint={{
           'fill-color': [
             'interpolate', ['linear'], ['get', 'score'],
             0, '#d32f2f',     // rojo
             25, '#f57c00',    // naranja
             50, '#fdd835',    // amarillo
             75, '#66bb6a',    // verde claro
             100, '#2e7d32',   // verde oscuro
           ],
           'fill-opacity': 0.5,
         }}
       />
     </Source>
   )}
   ```

3. Manejar celdas sin score (score=null): filtrar con `['!=', ['get', 'score'], null]` o no renderizarlas.

**Fuera de alcance:** Obtención real de forecast para el grid (eso es issue #12 de integración). Se puede pasar data mock para validar visualmente.

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Con datos mock de grid, la capa fill se renderiza con colores

---

## Fase 3 — Marcadores de puntos con color

**Objetivo:** Renderizar los puntos del catálogo/custom como marcadores en el mapa con color indicativo de su score.

**Archivos a modificar:**
- `src/views/MapView.tsx` — añadir marcadores

**Hallazgos del código:**
- react-map-gl tiene `<Marker>` component para marcadores individuales
- Alternativa: usar una capa GeoJSON `circle` para rendimiento con muchos puntos
- Para ~20-50 puntos, `<Marker>` es suficiente y más flexible (tooltips, events)

**Pasos concretos:**

1. Añadir prop `points` con scores:
   ```tsx
   interface PointWithScore {
     point: ObservationPoint
     score?: number
   }

   interface MapViewProps {
     points?: PointWithScore[]
     // ...
   }
   ```

2. Renderizar marcadores:
   ```tsx
   {points?.map(({ point, score }) => (
     <Marker
       key={point.id}
       latitude={point.coordinates.lat}
       longitude={point.coordinates.lon}
       onClick={() => onPointSelect?.(point.id)}
     >
       <div className="w-6 h-6 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: scoreToColor(score) }} />
     </Marker>
   ))}
   ```

3. Función helper `scoreToColor(score?: number): string`:
   - 0-25 → rojo
   - 25-50 → naranja
   - 50-75 → verde claro
   - 75-100 → verde oscuro
   - undefined → gris

4. Click en marcador → `onPointSelect(pointId)` callback al padre.

**Fuera de alcance:** Tooltip detallado (se muestra en sidebar, issue #9).

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Marcadores visibles con puntos del catálogo (datos mock de score)

---

## Fase 4 — Click-to-evaluate: popup y guardado

**Objetivo:** Al hacer click en área libre del mapa, mostrar popup con coordenadas, evaluar on-demand, y ofrecer botón para guardar como punto custom.

**Archivos a modificar:**
- `src/views/MapView.tsx` — handler onClick, popup component

**Hallazgos del código (decisión G7):**
- Click → popup con "Evaluando..." → consulta APIs → muestra score → botón guardar
- react-map-gl tiene `<Popup>` component
- La evaluación on-demand requiere: getElevation + getForecast + getSolarPosition + calculateScore
- El guardado usa `addCustomPoint()` del points-store

**Pasos concretos:**

1. Handler `onClick` del mapa:
   ```tsx
   function handleMapClick(event: MapLayerMouseEvent) {
     // Ignorar si click fue en un marcador existente
     if (event.features?.length) return

     const { lat, lng } = event.lngLat
     setClickedPoint({ lat, lon: lng })
     setEvaluationState('loading')
   }
   ```

2. Estado local del popup:
   ```tsx
   const [clickedPoint, setClickedPoint] = useState<{lat: number, lon: number} | null>(null)
   const [evaluationState, setEvaluationState] = useState<'loading' | 'done' | null>(null)
   const [evaluationResult, setEvaluationResult] = useState<ScoreResult | null>(null)
   ```

3. Popup component:
   ```tsx
   {clickedPoint && (
     <Popup latitude={clickedPoint.lat} longitude={clickedPoint.lon}
            onClose={() => setClickedPoint(null)}>
       <div>
         <p>{clickedPoint.lat.toFixed(4)}, {clickedPoint.lon.toFixed(4)}</p>
         {evaluationState === 'loading' && <p>Evaluando...</p>}
         {evaluationResult && <p>Score: {evaluationResult.total}/100</p>}
         <button onClick={handleSavePoint}>📌 Guardar punto</button>
       </div>
     </Popup>
   )}
   ```

4. Función `handleSavePoint`:
   - Prompt para nombre (o input inline en el popup)
   - Llama a `addCustomPoint({ name, region: 'Custom', coordinates, elevation })`
   - Cierra popup
   - Callback al padre para refrescar lista

5. Prop callback `onEvaluatePoint`:
   ```tsx
   onEvaluatePoint?: (lat: number, lon: number) => Promise<ScoreResult | null>
   ```
   - La lógica de evaluación real (APIs) la proporciona el padre/orquestador
   - MapView solo muestra el resultado

**Fuera de alcance:** La lógica real de evaluación (fetch forecast + elevation + solar) es del orquestador (issue #12). MapView recibe un callback async.

**Dependencias:** Fases 1, 3

**Validación:**
- [ ] `npm run build` pasa
- [ ] Click en mapa muestra popup con coordenadas
- [ ] Botón guardar llama a `addCustomPoint` (verificar con mock)

---

## Fase 5 — Integración y validación visual

**Objetivo:** Conectar todo en `App.tsx` con datos mock para validación visual completa. Verificar los 5 criterios de aceptación.

**Archivos a modificar:**
- `src/App.tsx` — datos mock + props a MapView
- `src/views/index.ts` — barrel update

**Pasos concretos:**

1. En `App.tsx`, generar datos mock:
   - Grid con scores aleatorios (para ver heatmap)
   - Puntos del catálogo con scores mock
   - Callback `onEvaluatePoint` que devuelve un ScoreResult mock

2. Pasar todo a `<MapView>`:
   ```tsx
   <MapView
     gridGeoJSON={mockGridGeoJSON}
     points={mockPointsWithScores}
     onPointSelect={(id) => console.log('Selected:', id)}
     onEvaluatePoint={async () => mockScoreResult}
   />
   ```

3. Verificar visualmente:
   - Mapa con tiles ✓
   - Grid coloreado ✓
   - Marcadores con color ✓
   - Click → popup ✓
   - Guardar → nuevo marcador ✓

4. Actualizar barrel `src/views/index.ts`

**Dependencias:** Fases 1-4

**Validación:**
- [ ] `npm run build` pasa
- [ ] `npm run dev` → mapa con heatmap visible
- [ ] Marcadores del catálogo visibles
- [ ] Click en área libre muestra popup
- [ ] Guardar punto lo añade al mapa

---

## Gaps y notas

1. **Datos mock vs reales:** Esta issue implementa solo la UI del mapa. Los datos reales (forecast API, elevation API) se conectan en issue #12 (integración). Para validar visualmente se usan datos mock generados en App.tsx.

2. **Layout split:** El layout desktop con sidebar se implementa en issue #9. En esta issue, el mapa ocupa todo el viewport. La integración de sidebar + mapa se hará en #9 ajustando el contenedor padre.

3. **Popup vs sidebar:** El click en marcador no abre popup — emite `onPointSelect` para que la sidebar (issue #9) muestre la ficha. El popup solo se usa para evaluación efímera (click en área libre).

4. **Performance con muchos marcadores:** Con ~20-50 puntos, `<Marker>` components son suficientes. Si el catálogo crece a >100, migrar a una capa GeoJSON `circle` con interactivity.

5. **Color-scale consistencia:** Tanto el grid fill como los marcadores usan la misma escala de color (rojo→verde, 0→100). La función helper `scoreToColor` se reutiliza.

6. **interactiveLayerIds:** Para que el click en el grid layer no dispare `handleMapClick` como "área libre", puede necesitarse distinguir. Se puede resolver con `event.features` — si hay features del grid bajo el cursor, es click en grid (no popup). Documentado para implementación.
