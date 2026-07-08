# Plan: Elevation Provider

> Issue: [#4 — Elevation Provider: consulta de elevación para puntos custom](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/4)
> Análisis: [decisiones-analisis.md § F1-F2](docs/analysis/decisiones-analisis.md)
> Dependencia: #1 (setup) — ✅ Completada (commit c62cadd)
> Estado: Pendiente de ejecución

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ⏳ Pendiente | — | — |
| 2 | ⏳ Pendiente | — | — |

---

## Fase 1 — Provider de elevación con batch

**Objetivo:** Funciones que consultan la Open-Meteo Elevation API para obtener la elevación de una o varias coordenadas.

**Archivos a crear:**
- `src/providers/elevation-provider.ts`

**Hallazgos del código (API real verificada):**
- URL: `https://api.open-meteo.com/v1/elevation`
- Params: `latitude=40.42,41.39&longitude=-3.70,2.16` (coordenadas separadas por comas)
- Respuesta: `{ "elevation": [666.0, 44.0] }` — objeto con array de elevaciones
- No requiere API key, CORS-friendly
- Una sola llamada sirve para N coordenadas (batch nativo)
- No hay límite documentado de coords por llamada, pero se mantendrá el batch ≤50 por coherencia con forecast

**Pasos concretos:**

1. Crear `src/providers/elevation-provider.ts` con:
   ```typescript
   const API_URL = 'https://api.open-meteo.com/v1/elevation'

   export async function getElevation(lat: number, lon: number): Promise<number>
   export async function getElevationBatch(coords: Array<{ lat: number; lon: number }>): Promise<number[]>
   ```

2. `getElevationBatch`:
   - Construye URL con latitudes/longitudes separadas por comas
   - Fetch con retry 1x (reutilizar patrón del forecast-provider o implementar inline simple)
   - Parsea respuesta `{ elevation: number[] }`
   - Si falla: devuelve 0 para las coordenadas que fallen (elevation desconocida = score mínimo 0.3)

3. `getElevation`: wrapper de `getElevationBatch` para una sola coordenada.

4. `elevationScore`: función pura que convierte metros a score 0.3–1.0:
   ```typescript
   export function elevationScore(elevationM: number): number {
     if (elevationM >= 1500) return 1.0
     if (elevationM <= 0) return 0.3
     return 0.3 + (elevationM / 1500) * 0.7
   }
   ```

**Fuera de alcance:** Cache (la elevación se consulta 1 vez por punto al crearlo y se guarda en el ObservationPoint). No necesita sistema de cache como el forecast.

**Validación:**
- [ ] `npm run build` pasa
- [ ] `elevationScore(0)` = 0.3
- [ ] `elevationScore(1500)` = 1.0
- [ ] `elevationScore(800)` ≈ 0.67

---

## Fase 2 — Tests unitarios

**Objetivo:** Tests que verifican elevationScore (puro) y el provider (con mock de fetch).

**Archivos a crear:**
- `src/providers/__tests__/elevation-provider.test.ts`

**Pasos concretos:**

1. Tests de `elevationScore` (función pura, sin mock):
   - `elevationScore(0)` → 0.3
   - `elevationScore(750)` → 0.65
   - `elevationScore(800)` → ≈0.67
   - `elevationScore(1500)` → 1.0
   - `elevationScore(2000)` → 1.0 (techo)
   - `elevationScore(-10)` → 0.3 (por debajo del mar, tratar como 0)

2. Tests de `getElevationBatch` (mock fetch):
   - Mock respuesta `{ elevation: [666, 44, 18] }` → devuelve array [666, 44, 18]
   - 1 coordenada → devuelve array de 1 elemento
   - Fetch falla → devuelve [0] (fallback)

3. Tests de `getElevation`:
   - Wrapper: llama a batch internamente

4. Actualizar barrel `src/providers/index.ts` con exports del elevation-provider.

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run test` pasa todos los tests
- [ ] `npm run build` pasa
- [ ] Los 3 criterios de aceptación de la issue están cubiertos:
  - ✓ Elevación devuelve valor numérico razonable
  - ✓ `elevationScore` curva correcta
  - ✓ Batch de 5 coordenadas devuelve 5 elevaciones

---

## Gaps y notas

1. **No se necesita cache:** A diferencia del forecast, la elevación no cambia. Se consulta una vez al crear un punto custom y se guarda en `ObservationPoint.elevation`. Los puntos del catálogo ya tienen la elevación hardcodeada en el JSON.

2. **Retry simple:** Se puede implementar inline (try/catch + 1 retry) sin reutilizar el módulo de forecast (que es más complejo). Mantenerlo sencillo para una issue scope:small.

3. **Fallback a 0:** Si la API falla, la elevación queda como 0 → `elevationScore(0) = 0.3`. Esto no rompe el scoring, simplemente no bonifica. El usuario puede reintentar más tarde.
