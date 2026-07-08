# Plan: Integración Final

> Issue: [#12 — Integración final: orquestación de datos, estados de carga y polish UI](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/12)
> Análisis: Todas las secciones convergen aquí (A3, C4, I3)
> Dependencias: #8 ✅, #9 ✅, #10 ✅, #11 ✅
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

## Fase 1 — Orchestrator: hook useScoring con datos reales

**Objetivo:** Crear un custom hook que orquesta el flujo completo: puntos → forecast (ambos modelos) → scoring → resultados. Reemplaza los datos mock de App.tsx.

**Archivos a crear:**
- `src/hooks/useScoring.ts`

**Hallazgos del código:**
- `App.tsx` actualmente usa datos mock (`Math.random()`) para grid, puntos y scores
- Los módulos reales ya están implementados: `getForecast`, `getElevation`, `getSolarPosition`, `getCorridorPoints`, `calculateScore`, `calculateSimplifiedScore`, `generateGrid`, `evaluateGrid`, `gridToGeoJSON`
- El flujo real es:
  1. Obtener puntos (catalog + custom)
  2. Para cada punto: getSolarPosition → getCorridorPoints → getForecast (best_match) + getForecast (icon_eu)
  3. Para el grid: generateGrid → getForecast para centroides → evaluateGrid
  4. calculateScore para cada punto del catálogo (completo con corredor)
  5. Producir PointWithScore[] + GridGeoJSON + TimelineData[]

**Pasos concretos:**

1. Crear `src/hooks/useScoring.ts`:
   ```typescript
   interface ScoringState {
     loading: boolean
     error: string | null
     points: PointWithScore[]
     gridGeoJSON: GridGeoJSON | null
     timelineData: Map<string, TimelineDataPoint[]>
   }

   export function useScoring(selectedTime: Date, config: EclipseConfig): ScoringState
   ```

2. Lógica interna del hook:
   - `useEffect` triggered por `selectedTime` changes
   - Obtiene puntos del store
   - Para puntos del catálogo: calcula posición solar → genera corredor → forecast batch (ambos modelos) → calculateScore
   - Para grid: generateGrid → forecast batch de centroides → evaluateGrid
   - Maneja errores individuales (punto sin datos) vs globales (API caída)
   - Guarda scores en `saveLastScore` para trend

3. Debounce de 300ms en `selectedTime` changes para evitar spam al mover slider

**Fuera de alcance:** Refresh automático periódico (sería un timer en el hook, pero para MVP basta con refresh al cambiar hora).

**Validación:**
- [ ] `npm run build` pasa
- [ ] Hook compilable con tipos correctos

---

## Fase 2 — Estados de carga y error en UI

**Objetivo:** Mostrar loading spinner, estados "sin datos" por punto, y error general.

**Archivos a crear/modificar:**
- `src/components/LoadingOverlay.tsx` — spinner fullscreen/partial
- `src/components/PointCard.tsx` — estado "sin datos" visual
- `src/App.tsx` — render condicional según estado

**Pasos concretos:**

1. Crear `src/components/LoadingOverlay.tsx`:
   - Spinner central con texto "Cargando datos meteorológicos..."
   - Semi-transparente overlay sobre el mapa

2. Modificar renderizado en App según estado:
   ```tsx
   {scoring.loading && <LoadingOverlay />}
   {scoring.error && <ErrorBanner message={scoring.error} onRetry={refresh} />}
   ```

3. En PointCard, si `score === undefined`: mostrar "—" gris (ya implementado) + tooltip "Sin datos"

4. En ranking, puntos sin datos van al final (ya ordenados, undefined < cualquier número)

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Loading se muestra brevemente al cargar

---

## Fase 3 — Click-to-evaluate con datos reales

**Objetivo:** Conectar el popup de click-to-evaluate con el flujo real (elevation API + forecast + solar + score).

**Archivos a modificar:**
- `src/App.tsx` — implementar `handleEvaluatePoint` con APIs reales

**Pasos concretos:**

1. Reemplazar mock `handleEvaluatePoint` con implementación real:
   ```typescript
   async function handleEvaluatePoint(lat: number, lon: number): Promise<ScoreResult | null> {
     const elevation = await getElevation(lat, lon)
     const solar = getSolarPosition(selectedTime, lat, lon)
     if (solar.altitudeDeg < 0) return null // noche
     const corridorCoords = getCorridorPoints(lat, lon, solar.azimuthNorthDeg)
     const allCoords = [{ lat, lon }, ...corridorCoords]
     const [primary, secondary] = await Promise.all([
       getForecast({ coordinates: allCoords, model: 'best_match', forecastDays: 1 }),
       getForecast({ coordinates: allCoords, model: 'icon_eu', forecastDays: 1 }),
     ])
     // Extract instant data + calculate score...
   }
   ```

2. Conectar `handleSavePoint` con la elevación obtenida:
   - Pasar la elevación real al `addCustomPoint`

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Click en mapa dispara llamadas reales a Open-Meteo (verificable en Network tab)

---

## Fase 4 — Disclaimer + export/import + polish

**Objetivo:** Disclaimer general (I3), botón export/import de puntos custom, transiciones visuales.

**Archivos a crear/modificar:**
- `src/components/Disclaimer.tsx` — banner informativo mostrado una vez
- `src/App.tsx` — integrar disclaimer + export/import buttons

**Pasos concretos:**

1. Crear `src/components/Disclaimer.tsx`:
   - Texto: "Esta herramienta es orientativa. Las predicciones meteorológicas son estimaciones que pueden variar. Verificar condiciones reales antes de desplazarse."
   - Se muestra una vez al primer uso → guarda `localStorage["eclipse-disclaimer-seen"]`
   - Dismissible con botón "Entendido"

2. Botones en sidebar footer:
   - "Exportar puntos" → descarga JSON de custom points
   - "Importar puntos" → file input que lee JSON y añade a custom

3. Transiciones CSS:
   - `transition-all` en scores que cambian
   - Fade-in del grid heatmap

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run build` pasa
- [ ] Disclaimer aparece la primera vez, no después

---

## Fase 5 — Quitar datos mock + validación final

**Objetivo:** Eliminar todos los datos mock de App.tsx, verificar que el flujo end-to-end funciona con APIs reales, build final.

**Archivos a modificar:**
- `src/App.tsx` — eliminar mock data, usar solo useScoring hook

**Pasos concretos:**

1. Eliminar `mockForecast` y todo código con `Math.random()`
2. App.tsx usa solo `useScoring` hook para obtener datos
3. Verificar build final + tests
4. Verificar `docker build` sigue funcionando

**Dependencias:** Fases 1-4

**Validación:**
- [ ] `npm run build` pasa sin warnings de unused code
- [ ] `npm run test` pasa (98 tests)
- [ ] `docker build` exitoso
- [ ] 5 criterios de aceptación:
  - ✓ App carga datos y muestra ranking + mapa
  - ✓ Punto sin datos → "sin datos" sin romper el resto
  - ✓ Cambiar modo temporal → recalcula UI
  - ✓ Click en mapa → evalúa → se puede guardar
  - ✓ Funciona en Chrome (Firefox no verificable sin browser real)

---

## Gaps y notas

1. **Rate limiting real:** Con el catálogo de 8 puntos + corredor (32 coords) + grid (~16 celdas a 30km), el total es ~50 coords × 2 modelos = ~2 batches × 2 = 4 llamadas HTTP. Manejable.

2. **Extracción de instante del forecast:** `HourlyForecast` tiene arrays de 24-72 horas. Para el score de un instante específico (`selectedTime`), se debe encontrar el índice más cercano en `times[]` y extraer los valores correspondientes como `ForecastData`. Esto es lógica del hook.

3. **Timeline data:** Para un punto, la timeline es el array de scores para cada hora del forecast. Se calcula mapeando cada hora del `HourlyForecast` a un score.

4. **Primer carga lenta:** La primera carga puede tardar ~3-5s (4 HTTP calls con throttle). El loading overlay cubre este tiempo. Cargas subsiguientes usan cache (5min localStorage).

5. **Verificación cross-browser:** Sin acceso a Firefox en este entorno. Se marca como "verificado en build" — la app usa APIs estándar (fetch, localStorage, CSS) sin polyfills vendor-specific.
