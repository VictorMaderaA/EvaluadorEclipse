# Plan: Solar Engine

> Issue: [#3 — Solar Engine: posición solar + cálculo de corredor direccional](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/3)
> Análisis: [decisiones-analisis.md § E1-E4](docs/analysis/decisiones-analisis.md), [§ B3-B4](docs/analysis/decisiones-analisis.md)
> Dependencia: #1 (setup) — ✅ Completada (commit c62cadd)
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | — |
| 2 | ✅ Completada | 2026-07-08 | — |
| 3 | ✅ Completada | 2026-07-08 | — |

---

## Fase 1 — Posición solar con SunCalc

**Objetivo:** Función que devuelve altitud y azimut solar para cualquier coordenada e instante, con conversión correcta desde el sistema de referencia de SunCalc.

**Archivos a crear:**
- `src/engines/solar-engine.ts`

**Archivos y contexto:**
- `src/config/types.ts` — Ya tiene `SolarPosition { altitudeDeg, azimuthNorthDeg }`
- `node_modules/@types/suncalc` — API: `getPosition(date, lat, lon)` → `{ altitude, azimuth }` (radianes)

**Hallazgos del código:**
- SunCalc `getPosition` devuelve `altitude` en radianes (negativo bajo horizonte) y `azimuth` medido desde **sur**, positivo al **oeste**.
- Conversión necesaria documentada en E1:
  - `altitudeDeg = altitude * 180 / Math.PI`
  - `azimuthNorthDeg = (azimuth * 180 / Math.PI + 180) % 360` — rota de "desde sur" a "desde norte"

**Pasos concretos:**

1. Crear `src/engines/solar-engine.ts` con función:
   ```typescript
   import SunCalc from 'suncalc'
   import type { SolarPosition } from '../config/types'

   export function getSolarPosition(date: Date, lat: number, lon: number): SolarPosition {
     const pos = SunCalc.getPosition(date, lat, lon)
     return {
       altitudeDeg: pos.altitude * (180 / Math.PI),
       azimuthNorthDeg: (pos.azimuth * (180 / Math.PI) + 180) % 360,
     }
   }
   ```

2. Verificar con valores conocidos:
   - Madrid (40.42, -3.70), 2026-07-08 12:00 UTC → altitud ≈ 70°, azimut ≈ 180° (sur)
   - Madrid, 2026-07-08 22:00 UTC → altitud < 0° (noche)

**Fuera de alcance:** Corredor y penalties (fases 2 y 3).

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test: Madrid mediodía verano → altitud entre 60° y 75°
- [ ] Test: Madrid medianoche → altitud < 0°
- [ ] Test: azimut está entre 0 y 360

---

## Fase 2 — Corredor direccional con destino geodésico

**Objetivo:** Función que genera 3 puntos a 5, 10 y 20 km en la dirección del azimut solar desde un punto de observación, usando trigonometría esférica.

**Archivos a modificar:**
- `src/engines/solar-engine.ts` — añadir `getCorridorPoints` y `destinationPoint`

**Hallazgos del código:**
- Fórmula de destino geodésico documentada textualmente en E2 (análisis):
  ```
  R = 6371 km
  d = distKm / R (distancia angular)
  lat2 = asin(sin(lat1)*cos(d) + cos(lat1)*sin(d)*cos(bearing))
  lon2 = lon1 + atan2(sin(bearing)*sin(d)*cos(lat1), cos(d) - sin(lat1)*sin(lat2))
  ```
- Distancias del corredor: [5, 10, 20] km (decisión B3)
- Return type: array de [lat, lon] tuples

**Pasos concretos:**

1. Añadir función `destinationPoint`:
   ```typescript
   /**
    * Calcula punto destino dado origen, distancia y bearing.
    * Trigonometría esférica — preciso a <1m para distancias ≤50km.
    */
   export function destinationPoint(
     lat: number, lon: number, distKm: number, bearingDeg: number
   ): [number, number]
   ```
   - Input/output en grados
   - Cálculo interno en radianes

2. Añadir función `getCorridorPoints`:
   ```typescript
   export function getCorridorPoints(
     lat: number, lon: number, azimuthDeg: number
   ): Array<{ lat: number; lon: number }>
   ```
   - Usa distancias hardcodeadas [5, 10, 20] km (o parámetro configurable)
   - Devuelve 3 objetos `{ lat, lon }`

3. Verificación de distancia: el punto a 5km debe estar a ~5km del origen (verificar con Haversine inverso en el test).

**Fuera de alcance:** Integración con forecast provider (eso es issue #5).

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test: corredor desde Madrid con bearing 90° (este) → los 3 puntos tienen misma latitud ± epsilon, longitud creciente
- [ ] Test: distancia Haversine entre origen y punto 1 ≈ 5km (±100m)
- [ ] Test: distancia entre origen y punto 3 ≈ 20km (±100m)

---

## Fase 3 — Penalización por altitud solar + tests

**Objetivo:** Función de penalización según altitud + tests completos del módulo.

**Archivos a modificar/crear:**
- `src/engines/solar-engine.ts` — añadir `getAltitudePenalty`
- `src/engines/__tests__/solar-engine.test.ts` — tests unitarios

**Hallazgos del código (decisión B4):**
- ≥ 30°: sin penalización (×1.0)
- 10°–30°: penalización lineal (×0.7 a ×1.0)
- 0°–10°: penalización fuerte (×0.5 a ×0.7)
- < 0°: score = 0 (×0.0)

Curva lineal por tramos:
```
alt < 0    → 0.0
0 ≤ alt < 10  → 0.5 + (alt / 10) * 0.2  → [0.5, 0.7]
10 ≤ alt < 30 → 0.7 + ((alt - 10) / 20) * 0.3  → [0.7, 1.0]
alt ≥ 30   → 1.0
```

**Pasos concretos:**

1. Añadir función `getAltitudePenalty`:
   ```typescript
   export function getAltitudePenalty(altitudeDeg: number): number
   ```
   - Retorna multiplicador 0.0 a 1.0

2. Crear `src/engines/__tests__/solar-engine.test.ts` con tests:
   - **getSolarPosition:**
     - Madrid mediodía verano → altitud 60-75°, azimut ~170-190°
     - Madrid medianoche → altitud < 0°
     - Retorna azimut siempre entre 0 y 360
   - **getCorridorPoints:**
     - 3 puntos devueltos
     - Bearing 0° (norte) → latitud crece, longitud ≈ igual
     - Bearing 90° (este) → longitud crece, latitud ≈ igual
     - Distancias correctas (verificar con Haversine)
   - **destinationPoint:**
     - Punto a 0km = punto original
     - Punto a distancia conocida en dirección conocida
   - **getAltitudePenalty:**
     - alt=-10 → 0.0
     - alt=0 → 0.5
     - alt=5 → 0.6
     - alt=10 → 0.7
     - alt=20 → 0.85
     - alt=30 → 1.0
     - alt=50 → 1.0

3. Actualizar barrel `src/engines/index.ts` con exports del solar-engine.

**Fuera de alcance:** Score engine integration. Solo el motor solar puro.

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run test` pasa todos los tests del solar-engine
- [ ] `npm run build` pasa
- [ ] Los 3 criterios de aceptación de la issue están cubiertos:
  - ✓ `getSolarPosition` valores coherentes
  - ✓ `getCorridorPoints` distancias correctas (±100m)
  - ✓ `getAltitudePenalty` curva correcta

---

## Gaps y notas

1. **Import de SunCalc:** El paquete `suncalc` es CommonJS. Con `"type": "module"` en package.json y Vite, se importa como `import SunCalc from 'suncalc'` (default import). Verificar que funciona con `esModuleInterop: true` en tsconfig (ya incluido implícitamente por `moduleResolution: "bundler"`).

2. **Distancias hardcodeadas vs configurable:** La issue dice [5, 10, 20] km hardcodeados. El `ScoringConfig` ya tiene `corridorDistancesKm: [5, 10, 20]`. El solar-engine puede recibir las distancias como parámetro opcional (default a las de ScoringConfig) para flexibilidad futura sin romper la API.

3. **Función helper Haversine para tests:** Se necesita una función `haversineDistance` en el test para verificar las distancias. Es solo para testing, no se exporta al bundle de producción.
