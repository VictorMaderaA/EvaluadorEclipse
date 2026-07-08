# Plan: Grid Engine

> Issue: [#7 — Grid Engine: generación de celdas y score simplificado para heatmap](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/7)
> Análisis: [decisiones-analisis.md § B8](docs/analysis/decisiones-analisis.md)
> Dependencias: #5 (score engine) ✅ 81b695d, #2 (forecast provider) ✅ 69cc019
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | 046e725 |
| 2 | ✅ Completada | 2026-07-08 | 046e725 |
| 3 | ✅ Completada | 2026-07-08 | 046e725 |

---

## Fase 1 — Generación del grid de celdas

**Objetivo:** Función que genera un array de celdas rectangulares (10km×10km por defecto) sobre un bounding box dado, con bounds (4 esquinas) y centroide.

**Archivos a crear:**
- `src/engines/grid-engine.ts`

**Archivos de contexto (existentes):**
- `src/config/types.ts` — `GridCell` ya definida: `{ bounds: [[lat,lon]×4], centroid: {lat,lon}, score?, forecastData? }`

**Hallazgos del código:**
- `GridCell.bounds` es un array de 4 tuplas `[number, number]` (4 esquinas del rectángulo)
- `destinationPoint()` ya existe en solar-engine y puede reutilizarse para calcular offsets geodésicos — pero para un grid regular, es más eficiente calcular offsets en grados directamente (~1° lat ≈ 111km, ~1° lon ≈ 111km × cos(lat))
- El grid es "plano" (celdas rectangulares en coordenadas geográficas). A latitud de España (~40°), 10km ≈ 0.09° lat, ≈ 0.117° lon

**Pasos concretos:**

1. Crear `src/engines/grid-engine.ts` con:
   ```typescript
   export interface GridBounds {
     north: number  // lat max
     south: number  // lat min
     east: number   // lon max
     west: number   // lon min
   }

   export function generateGrid(bounds: GridBounds, cellSizeKm: number = 10): GridCell[]
   ```

2. Lógica de `generateGrid`:
   - Calcular `latStep` ≈ `cellSizeKm / 111` (grados)
   - Calcular `lonStep` ≈ `cellSizeKm / (111 * cos(centerLat))` (grados)
   - Iterar rows (lat) y cols (lon) para llenar el bounding box
   - Para cada celda: calcular 4 esquinas + centroide
   - Devolver array de `GridCell`

3. El centroide es el centro del rectángulo: `(south+north)/2`, `(west+east)/2` de la celda.

4. Los bounds de la celda son las 4 esquinas en orden: [SW, SE, NE, NW] (para GeoJSON polygon ring).

**Fuera de alcance:** Evaluación de score (Fase 2), generación de GeoJSON (Fase 2).

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test: grid de 40×40km → ~16 celdas (puede variar por redondeo ±2)
- [ ] Cada celda tiene bounds (4 puntos) y centroide

---

## Fase 2 — Evaluación del grid y GeoJSON output

**Objetivo:** Función que toma un array de celdas con forecast data y produce un GeoJSON FeatureCollection con score por celda.

**Archivos a modificar:**
- `src/engines/grid-engine.ts` — añadir `evaluateGrid` y `gridToGeoJSON`

**Hallazgos del código:**
- `calculateSimplifiedScore()` ya existe en score-engine (recibe forecast, elevation, cloudCovers, solarAlt)
- El GeoJSON FeatureCollection es un objeto estándar:
  ```json
  {
    "type": "FeatureCollection",
    "features": [{ "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [...] }, "properties": { "score": 75 } }]
  }
  ```
- MapLibre consume GeoJSON nativo para capas `fill`

**Pasos concretos:**

1. Añadir función `evaluateGrid`:
   ```typescript
   export function evaluateGrid(
     cells: GridCell[],
     forecasts: (ForecastData | null)[],       // forecast por celda (mismo orden)
     elevations: number[],                      // elevación por celda
     primaryCloudCovers: number[],              // cloud_cover del modelo primario
     secondaryCloudCovers: number[],            // cloud_cover del modelo secundario
     solarAltitudeDeg: number,                  // altitud solar (misma para toda el área en un instante)
     config?: ScoringConfig,
   ): GridCell[]
   ```
   - Para cada celda con forecast: calcula `calculateSimplifiedScore`
   - Para celdas sin forecast (null): score = undefined

2. Añadir función `gridToGeoJSON`:
   ```typescript
   export interface GridGeoJSON {
     type: 'FeatureCollection'
     features: Array<{
       type: 'Feature'
       geometry: { type: 'Polygon'; coordinates: [number, number][][] }
       properties: { score: number | null; centroid: { lat: number; lon: number } }
     }>
   }

   export function gridToGeoJSON(cells: GridCell[]): GridGeoJSON
   ```
   - Convierte bounds a formato GeoJSON Polygon (coordinates: [[[lon,lat]×5]] — cerrado)
   - Nota: GeoJSON usa [lon, lat] (inverso a nuestro interno [lat, lon])

**Fuera de alcance:** Integración con forecast-provider para obtener datos reales (eso lo orquesta la UI).

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test: `gridToGeoJSON` produce FeatureCollection con coordinates válidas
- [ ] Test: `evaluateGrid` asigna scores 0-100 a celdas con forecast
- [ ] GeoJSON coordinates usan [lon, lat] (verificar orden)

---

## Fase 3 — Tests completos

**Objetivo:** Tests que cubren los 4 criterios de aceptación de la issue.

**Archivos a crear:**
- `src/engines/__tests__/grid-engine.test.ts`

**Pasos concretos:**

1. Tests de `generateGrid`:
   - Bounds de 40×40km → ~16 celdas (±2 por redondeo)
   - Cada celda tiene 4 bounds + centroide
   - Centroides están dentro del bounding box
   - Celdas cubren el área sin huecos significativos

2. Tests de `evaluateGrid`:
   - Con forecast claro → scores > 0
   - Sin forecast (null) → score undefined
   - Usa `calculateSimplifiedScore` (sin corredor): verificar que corridor component = 0

3. Tests de `gridToGeoJSON`:
   - Produce FeatureCollection con correct type
   - Features tienen Polygon geometry
   - Coordinates son [lon, lat] (GeoJSON standard)
   - Polygon está cerrado (primer punto = último)
   - Properties incluyen score

4. Actualizar barrel `src/engines/index.ts`

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run test` pasa
- [ ] `npm run build` pasa
- [ ] 4 criterios de aceptación cubiertos

---

## Gaps y notas

1. **Aproximación plana vs geodésica:** Para un grid de 10km a latitud de España (~37-43°), la diferencia entre grados fijos y distancia geodésica es <1%. Aceptable para visualización.

2. **Orden de coordenadas:** Internamente usamos `{ lat, lon }`. GeoJSON usa `[lon, lat]`. La conversión se hace en `gridToGeoJSON` solamente.

3. **Elevación para el grid:** El caller necesita obtener elevación para cada centroide antes de evaluar. Esto lo hará la capa de orquestación (issue #12). Para el grid-engine, la elevación es un input.

4. **Solar altitude uniforme:** Se asume la misma altitud solar para todas las celdas del grid en un instante dado (la variación en ~200km es <0.5° — despreciable).
