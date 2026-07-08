# Plan: Forecast Provider

> Issue: [#2 — Forecast Provider: integración Open-Meteo con batching y cache](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/2)
> Análisis: [decisiones-analisis.md § C1-C5](docs/analysis/decisiones-analisis.md)
> Dependencia: #1 (setup) — ✅ Completada (commit c62cadd)
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | — |
| 2 | ✅ Completada | 2026-07-08 | — |
| 3 | ✅ Completada | 2026-07-08 | — |
| 4 | ✅ Completada | 2026-07-08 | — |

---

## Fase 1 — Tipos e interfaces del forecast

**Objetivo:** Definir las interfaces TypeScript que modelan la respuesta de Open-Meteo y los datos internos del forecast provider.

**Archivos y contexto:**
- `src/config/types.ts` — Ya tiene `ForecastData` con 5 campos + `time: string`. Necesita expandirse para modelar datos horarios (array de timestamps).
- `src/providers/index.ts` — Barrel vacío, listo para re-exports.

**Hallazgos del código:**
- `ForecastData` actual modela un **único instante** (un solo `time`). Para el provider necesitamos también una estructura de respuesta completa (múltiples horas).
- La respuesta de la API Open-Meteo con multi-coord devuelve un **JSON array** donde cada elemento es un objeto con: `latitude`, `longitude`, `elevation`, `hourly.time[]`, `hourly.cloud_cover[]`, etc.

**Pasos concretos:**

1. Ampliar `src/config/types.ts` añadiendo:
   ```typescript
   /** Respuesta horaria completa de Open-Meteo para una coordenada */
   export interface HourlyForecast {
     latitude: number
     longitude: number
     elevation: number
     times: string[]                // ISO timestamps
     cloudCover: number[]
     cloudCoverLow: number[]
     cloudCoverMid: number[]
     cloudCoverHigh: number[]
     visibility: number[]
   }

   /** Opciones para consultar forecast */
   export interface ForecastRequest {
     coordinates: Array<{ lat: number; lon: number }>
     model: 'best_match' | 'icon_eu'
     forecastDays?: number           // default 3
     startDate?: string              // ISO date (modo eclipse)
     endDate?: string                // ISO date (modo eclipse)
   }

   /** Resultado de cache con metadata */
   export interface CachedForecast {
     data: HourlyForecast
     fetchedAt: number               // Date.now()
     model: string
   }
   ```
   - `ForecastData` existente se mantiene como "snapshot de un instante" (usado por score-engine).
   - `HourlyForecast` es la respuesta completa (usada por provider y timeline).

2. Crear barrel en `src/providers/index.ts` que exportará los módulos del provider.

**Fuera de alcance:** No se implementa lógica de fetch ni cache. Solo tipos.

**Validación:**
- [ ] `npm run build` pasa sin errores de tipo
- [ ] Los nuevos tipos se pueden importar desde `src/config`

---

## Fase 2 — Cache de dos niveles

**Objetivo:** Implementar el sistema de cache con memoria (TTL 1h) + localStorage (TTL 5min), con key basada en coordenada+modelo+forecastDays.

**Archivos a crear:**
- `src/providers/forecast-cache.ts` — lógica de cache

**Hallazgos del código:**
- No existe nada de cache actualmente (solo barrel vacío en providers).
- La key de cache decidida en C3 es: `${lat},${lon},${model},${forecastDays}`.
- Las coordenadas Open-Meteo se redondean a grid de 0.0625° (verificado en respuesta real: 40.42 → 40.4375). Para evitar cache misses por decimales sutiles, redondear la key a 4 decimales.

**Pasos concretos:**

1. Crear `src/providers/forecast-cache.ts` con:
   ```typescript
   // Constantes
   const MEMORY_TTL_MS = 60 * 60 * 1000     // 1 hora
   const STORAGE_TTL_MS = 5 * 60 * 1000      // 5 minutos
   const STORAGE_PREFIX = 'eclipse-forecast-cache-'

   // Cache en memoria (Map)
   const memoryCache = new Map<string, CachedForecast>()

   // Funciones exportadas:
   export function getCacheKey(lat: number, lon: number, model: string, forecastDays: number): string
   export function getFromCache(key: string): HourlyForecast | null
   export function setInCache(key: string, data: HourlyForecast, model: string): void
   export function clearExpiredStorage(): void
   export function clearAllCache(): void
   ```

2. Lógica de `getFromCache`:
   - Buscar en memoryCache → si existe y no expirado (TTL 1h) → devolver
   - Buscar en localStorage (`STORAGE_PREFIX + key`) → si existe y no expirado (TTL 5min) → guardar en memoryCache también → devolver
   - Si no hay hit → devolver null

3. Lógica de `setInCache`:
   - Guardar en memoryCache con `fetchedAt: Date.now()`
   - Guardar en localStorage como JSON con `fetchedAt`
   - `clearExpiredStorage()` — opcional: limpiar entries expirados cuando se escribe (evitar acumulación)

4. Redondeo de key: lat/lon a 4 decimales → `lat.toFixed(4),lon.toFixed(4),model,forecastDays`

**Fuera de alcance:** No se conecta con el fetch de la API. Eso es Fase 3.

**Dependencias:** Fase 1 (necesita las interfaces `HourlyForecast`, `CachedForecast`)

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test manual (o unitario con vitest): set → get devuelve datos, get tras TTL devuelve null
- [ ] localStorage se escribe y lee correctamente (verificable con un test simple)

**Gaps o decisiones abiertas:**
- Para testear cache con TTL, se necesitará un test runner. **Decisión a tomar**: ¿Añadir vitest ahora o diferir tests a una issue transversal? → Se propone añadir vitest como devDependency en esta issue ya que es el test runner estándar para Vite y permite validar los criterios de aceptación.

---

## Fase 3 — Forecast provider con batching y retry

**Objetivo:** Implementar la función principal que consulta Open-Meteo, agrupa coordenadas en batches de ≤50, aplica retry, y devuelve datos parseados.

**Archivos a crear:**
- `src/providers/forecast-provider.ts` — lógica de fetch + batching

**Hallazgos del código (API real verificada):**
- URL: `https://api.open-meteo.com/v1/forecast`
- Multi-coord: `latitude=40.42,41.39&longitude=-3.70,2.17` → respuesta es un **JSON array**
- Single-coord: mismos params pero con un solo valor → respuesta es un **JSON object** (no array)
- Parámetros relevantes: `hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&models=<model>&forecast_days=<n>&timezone=auto`
- Con `start_date` y `end_date`: limitar rango temporal (modo eclipse)
- Respuesta: cada item tiene `hourly.time[]`, `hourly.cloud_cover[]`, etc. (arrays paralelos)

**Pasos concretos:**

1. Crear `src/providers/forecast-provider.ts` con:
   ```typescript
   export async function fetchForecast(request: ForecastRequest): Promise<(HourlyForecast | null)[]>
   ```
   - Recibe N coordenadas + modelo + config temporal
   - Devuelve array de N resultados (null si falló para esa coordenada)

2. Implementar `splitIntoBatches(coords, batchSize=50)`:
   - Agrupa las coordenadas en arrays de máx 50
   - Devuelve array de arrays

3. Implementar `fetchBatch(batch, model, forecastDays, startDate?, endDate?)`:
   - Construye URL con params multi-coord
   - Incluye throttle: `await delay(200)` entre batches consecutivos
   - Si batch tiene 1 coord → la respuesta es un objeto, wrappear en array
   - Si batch tiene >1 coord → la respuesta ya es un array
   - Parsear respuesta: mapear campos de `hourly.*` a `HourlyForecast`

4. Implementar retry:
   ```typescript
   async function fetchWithRetry(url: string, retries = 1, delayMs = 2000): Promise<Response>
   ```
   - Si falla → esperar `delayMs` → reintentar 1 vez
   - Si sigue fallando → throw (el caller mapea a null)

5. Integrar con cache:
   - ANTES de fetch: verificar cache para cada coordenada individualmente
   - Solo hacer fetch de las coordenadas que no estén en cache
   - DESPUÉS de fetch: guardar cada resultado en cache
   - Devolver array combinado (de cache + de fetch), en el orden original

6. Función pública de alto nivel:
   ```typescript
   export async function getForecast(request: ForecastRequest): Promise<(HourlyForecast | null)[]>
   ```
   - Separar coords con cache hit vs miss
   - Fetch solo los miss
   - Combinar y devolver en orden

**Fuera de alcance:** Score calculation, corridor generation, grid. Solo obtener datos meteo.

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test: fetch 1 coordenada → devuelve HourlyForecast con 24+ timestamps
- [ ] Test: fetch 60 coordenadas → se ejecutan 2 batches (verificar con mock o con llamada real en test de integración)
- [ ] Test: segunda llamada idéntica dentro de TTL → no hace fetch (cache hit)
- [ ] Test: si API devuelve error → retry 1x → si sigue fallando → null

---

## Fase 4 — Tests y validación final

**Objetivo:** Tests unitarios que verifican los criterios de aceptación de la issue. Setup de vitest si no existe.

**Archivos a crear:**
- `vitest.config.ts` — config del test runner (si no existe)
- `src/providers/__tests__/forecast-cache.test.ts`
- `src/providers/__tests__/forecast-provider.test.ts`

**Pasos concretos:**

1. Añadir vitest como devDependency:
   ```bash
   npm install --save-exact -D vitest @testing-library/jest-dom
   ```

2. Crear `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config'

   export default defineConfig({
     test: {
       environment: 'node',
     },
   })
   ```

3. Añadir script de test en package.json:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

4. Tests de cache (`forecast-cache.test.ts`):
   - `setInCache` + `getFromCache` → devuelve datos
   - Simular TTL expirado (mockear Date.now) → devuelve null
   - `clearAllCache` → todo vacío
   - Key generation es determinista para mismas coords

5. Tests del provider (`forecast-provider.test.ts`):
   - Mock de `fetch` global
   - Test batching: 60 coords → 2 llamadas fetch (cada una con ≤50 coords en URL)
   - Test retry: primera llamada falla, segunda éxito → devuelve datos
   - Test retry agotado: ambas fallan → devuelve null
   - Test integración cache: primera llamada fetch real, segunda usa cache

6. (Opcional) Un test de integración real que llame a Open-Meteo con 1 coord y verifique la estructura de la respuesta. Marcarlo con `.skip` por defecto para no depender de red en CI.

**Fuera de alcance:** Tests E2E, tests de componentes React.

**Dependencias:** Fases 1, 2, 3

**Validación:**
- [ ] `npm run test` ejecuta y pasa todos los tests
- [ ] `npm run build` sigue pasando
- [ ] Cobertura de los 5 criterios de aceptación de la issue:
  - ✓ 1 coord → datos correctos
  - ✓ 60 coords → 2 batches
  - ✓ Cache localStorage (<5min)
  - ✓ Cache memoria (misma sesión)
  - ✓ API falla → retry → null

---

## Gaps y notas

1. **Interface `ForecastData` vs `HourlyForecast`:** Ambas coexisten. `ForecastData` es un snapshot de un instante (usado por score-engine cuando evalúa una hora específica). `HourlyForecast` es la respuesta completa con arrays paralelos (usado por provider y timeline). El score-engine extraerá el instante relevante de `HourlyForecast` → `ForecastData` (esa lógica va en issue #5).

2. **localStorage en tests:** vitest con `environment: 'node'` no tiene `localStorage`. Para tests de cache, usar un mock simple (`Map` que simula la API) o cambiar a `environment: 'jsdom'` para esos tests.

3. **Throttle 200ms:** Se implementa con un `await new Promise(r => setTimeout(r, 200))` entre batches consecutivos. No es un rate limiter sofisticado — solo cortesía secuencial.

4. **Single-coord vs multi-coord response:** La API devuelve un **objeto** para 1 coord y un **array** para >1 coords. El código debe manejar ambos casos (`Array.isArray(response) ? response : [response]`).

5. **Recharts v3:** Se actualizó a v3 en el setup. La API de LineChart puede tener cambios menores respecto a v2 cuando se use en la issue #11.
