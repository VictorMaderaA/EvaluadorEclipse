# Plan: Score Engine

> Issue: [#5 — Score Engine: cálculo de puntuación con modelo híbrido](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/5)
> Análisis: [decisiones-analisis.md § B1-B7](docs/analysis/decisiones-analisis.md), [§ I1](docs/analysis/decisiones-analisis.md)
> Dependencias: #2 (forecast) ✅ 69cc019, #3 (solar) ✅ 8c64e41, #4 (elevation) ✅ a2bb784
> Estado: Pendiente de ejecución

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ⏳ Pendiente | — | — |
| 2 | ⏳ Pendiente | — | — |
| 3 | ⏳ Pendiente | — | — |
| 4 | ⏳ Pendiente | — | — |

---

## Fase 1 — Funciones de componentes individuales

**Objetivo:** Implementar las funciones que calculan cada uno de los 5 componentes del score (0-1), separadas y testables independientemente.

**Archivos a crear:**
- `src/engines/score-engine.ts`

**Archivos de contexto (ya existentes):**
- `src/config/types.ts` — `ForecastData`, `ScoreResult`, `SolarPosition`
- `src/config/scoring-config.ts` — `ScoringConfig`, `DEFAULT_SCORING_CONFIG`
- `src/providers/elevation-provider.ts` — `elevationScore()`
- `src/engines/solar-engine.ts` — `getAltitudePenalty()`

**Hallazgos del código:**
- `elevationScore()` ya existe en elevation-provider (curva 0.3→1.0). Se reutiliza directamente.
- `getAltitudePenalty()` ya existe en solar-engine (curva 4 tramos). Se reutiliza.
- `ForecastData` modela un instante: `cloudCover`, `cloudCoverLow/Mid/High`, `visibility`.
- `ScoringConfig` tiene `weights`, `cloudPenaltyThreshold`, `corridorDistancesKm`, `corridorWeights`.

**Pasos concretos:**

1. Crear `src/engines/score-engine.ts` con funciones internas:

   ```typescript
   /** Componente meteo: 1 - (cloudCover / 100). Cielo despejado = 1.0 */
   function calcMeteoComponent(forecast: ForecastData): number

   /** Componente capas: ponderado low(50%) + mid(30%) + high(20%). Menos nubes = mejor */
   function calcLayersComponent(forecast: ForecastData): number

   /** Componente corredor: media ponderada de cloudCover en corredor (70/20/10). Menos nubes = mejor */
   function calcCorridorComponent(corridorForecasts: ForecastData[], config: ScoringConfig): number

   /** Componente confianza: diff cloudCover entre modelos. <15% → 1.0, >40% → 0.3, lineal */
   function calcConfidenceComponent(primaryCloudCover: number, secondaryCloudCover: number): number
   ```

2. Detalles de cada componente:
   - **Meteo:** `1 - (cloudCover / 100)` — inversión simple (0% nubes = score 1.0)
   - **Capas:** `1 - (low*0.5 + mid*0.3 + high*0.2) / 100` — nubes bajas pesan más (obstruyen más la visión directa)
   - **Corredor:** `1 - (sum(cloudCover[i] * corridorWeights[i]) / 100)` — para los 3 puntos del corredor
   - **Confianza:** interpolación lineal entre diff 15%(→1.0) y 40%(→0.3)

**Fuera de alcance:** `calculateScore` completa, explanation engine, tests.

**Validación:**
- [ ] `npm run build` pasa
- [ ] Cada función es pura y recibe solo datos (no hace fetch)

---

## Fase 2 — calculateScore y calculateSimplifiedScore

**Objetivo:** Funciones principales que combinan los componentes con pesos, aplican penalties (nubosidad >90%, altitud solar) y devuelven `ScoreResult`.

**Archivos a modificar:**
- `src/engines/score-engine.ts` — añadir funciones públicas

**Pasos concretos:**

1. Implementar `calculateScore`:
   ```typescript
   export function calculateScore(
     forecast: ForecastData,
     corridorForecasts: ForecastData[],
     elevation: number,
     primaryCloudCover: number,
     secondaryCloudCover: number,
     solarAltitudeDeg: number,
     config: ScoringConfig = DEFAULT_SCORING_CONFIG,
   ): ScoreResult
   ```

   Lógica:
   ```
   components = {
     meteo: calcMeteoComponent(forecast),
     layers: calcLayersComponent(forecast),
     corridor: calcCorridorComponent(corridorForecasts, config),
     elevation: elevationScore(elevation),
     confidence: calcConfidenceComponent(primary, secondary),
   }

   scoreRaw = sum(components[k] * weights[k])

   // Penalty nubosidad extrema (B1)
   cloudPenalty = forecast.cloudCover > config.cloudPenaltyThreshold
     ? 1 - (forecast.cloudCover - config.cloudPenaltyThreshold) / (100 - config.cloudPenaltyThreshold)
     : 1.0

   // Penalty altitud solar (B4) — reutiliza getAltitudePenalty
   solarPenalty = getAltitudePenalty(solarAltitudeDeg)

   totalPenalty = cloudPenalty * solarPenalty
   scoreFinal = scoreRaw * totalPenalty

   return {
     total: Math.round(scoreFinal * 100),  // 0-100
     components,
     penalty: totalPenalty,
     explanation: ''  // se llena en Fase 3
   }
   ```

2. Implementar `calculateSimplifiedScore` (para grid, sin corredor):
   ```typescript
   export function calculateSimplifiedScore(
     forecast: ForecastData,
     elevation: number,
     primaryCloudCover: number,
     secondaryCloudCover: number,
     solarAltitudeDeg: number,
     config: ScoringConfig = DEFAULT_SCORING_CONFIG,
   ): ScoreResult
   ```
   - Usa 4 de 5 componentes (sin corredor)
   - Redistribuye el peso del corredor proporcionalmente entre los otros 4
   - O alternativamente: calcula con los 4 componentes disponibles y normaliza

   **Decisión del análisis (B8):** Grid usa score simplificado sin corredor. El peso se redistribuye:
   - meteo: 0.30/(1-0.25) = 0.40
   - layers: 0.25/(1-0.25) = 0.333
   - elevation: 0.10/(1-0.25) = 0.133
   - confidence: 0.10/(1-0.25) = 0.133

**Fuera de alcance:** Explanation engine (Fase 3).

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Score cielo despejado (cloudCover=0, alt=45°, elev=1000m, conf alta) → total > 80
- [ ] Score cielo cubierto (cloudCover=100, alt=45°) → total < 30
- [ ] Penalty activa: cloudCover=95% → score reducido vs cloudCover=85%

---

## Fase 3 — Explanation Engine

**Objetivo:** Función que genera texto explicativo (1-2 frases) basándose en los componentes del score.

**Archivos a crear:**
- `src/engines/explanation-engine.ts`

**Hallazgos del código (I1):**
- Templates algorítmicos con lógica condicional
- Primera frase: factor dominante (positivo o negativo)
- Segunda frase: matiz o factor secundario
- Sin LLM, determinista

**Pasos concretos:**

1. Crear `src/engines/explanation-engine.ts`:
   ```typescript
   export function generateExplanation(
     components: ScoreResult['components'],
     penalty: number,
   ): string
   ```

2. Lógica:
   - Identificar factor dominante: el componente con mayor impacto (mejor o peor)
   - Identificar factor secundario relevante
   - Templates por caso:
     - Meteo alto + corredor alto → "Cielo despejado en el punto y hacia el Sol."
     - Meteo bajo → "Nubosidad elevada prevista en el punto de observación."
     - Corredor bajo → "Nubes previstas en la dirección del Sol."
     - Confianza baja → "Baja concordancia entre modelos; predicción incierta."
     - Elevación alta → "Buena altitud del punto reduce riesgo de nubes bajas."
     - Penalty activa → "Penalización por nubosidad extrema (>{threshold}%)."

3. Integrar con `calculateScore`: llenar el campo `explanation` del `ScoreResult`.

**Fuera de alcance:** Internacionalización, personalización de templates.

**Dependencias:** Fase 2

**Validación:**
- [ ] `npm run build` pasa
- [ ] Explicación es string no vacío para cualquier input válido
- [ ] Explicación cambia según el escenario (despejado vs cubierto)

---

## Fase 4 — Tests completos

**Objetivo:** Tests unitarios que cubren los 5 criterios de aceptación de la issue.

**Archivos a crear:**
- `src/engines/__tests__/score-engine.test.ts`
- `src/engines/__tests__/explanation-engine.test.ts`

**Pasos concretos:**

1. Tests de `score-engine.test.ts`:
   - **Cielo despejado:** cloudCover=0, layers=0, corredor despejado, elev=1000, conf alta, alt=45° → score > 80
   - **Cielo cubierto:** cloudCover=100, layers=100, corredor cubierto → score < 30
   - **Penalty activa:** cloudCover=95% → score significativamente menor que con 85%
   - **Confianza alta:** diff < 15% → componente confidence = 1.0
   - **Confianza baja:** diff > 40% → componente confidence = 0.3
   - **Simplified vs full:** simplified no tiene corredor, redistribuye pesos
   - **Solar penalty:** alt < 0 → total = 0; alt = 5° → total reducido vs alt = 45°
   - **Components normalizados:** cada componente está entre 0 y 1

2. Tests de `explanation-engine.test.ts`:
   - Genera string no vacío
   - Cielo despejado → incluye palabra positiva ("despejado" o similar)
   - Cielo cubierto → incluye referencia a nubes
   - Confianza baja → menciona incertidumbre

3. Actualizar barrel `src/engines/index.ts` con todos los exports.

**Dependencias:** Fases 1, 2, 3

**Validación:**
- [ ] `npm run test` pasa todos los tests
- [ ] `npm run build` pasa
- [ ] 5 criterios de aceptación cubiertos:
  - ✓ Score 0-100 coherente
  - ✓ Penalty reduce score cuando cloud > 90%
  - ✓ Componentes normalizados 0-1
  - ✓ Explicación textual generada
  - ✓ Config modificable (test con config custom vs default)

---

## Gaps y notas

1. **Peso de capas (low/mid/high):** La issue dice 25% del score total para "capas", pero no especifica la distribución interna. El análisis no lo detalla explícitamente. Propuesta: low=50%, mid=30%, high=20% (nubes bajas son más obstructivas para visión directa). Esto NO es una decisión de diseño nueva — es la implementación del "score de capas por nivel de obstrucción visual" descrito en B2.

2. **Redistribución de pesos en simplified score:** Se redistribuye proporcionalmente eliminando el corredor. El score simplified seguirá siendo 0-100 con la misma escala perceptual.

3. **`elevationScore` está en elevation-provider:** Se importa directamente desde ahí. No se duplica en score-engine.

4. **Penalty formula (B1):** `cloud_cover > 90 ? (1 - (cc - 90) / 10) : 1.0`. Esto significa:
   - 90% → penalty 1.0 (sin efecto)
   - 95% → penalty 0.5
   - 100% → penalty 0.0
   La fórmula del análisis era ligeramente distinta: usa `(100 - threshold)` como denominador. Con threshold=90: `1 - (cc - 90) / (100 - 90)` = `1 - (cc - 90) / 10`. Coherente.

5. **Orden de penalties:** Score raw × cloud penalty × solar penalty. Ambos multiplicativos.
