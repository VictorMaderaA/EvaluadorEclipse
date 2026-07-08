# Plan: Timeline Chart + Trend Indicator

> Issue: [#11 — Timeline Chart: gráfico de evolución temporal del score por punto](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/11)
> Análisis: [decisiones-analisis.md § G5, H3](docs/analysis/decisiones-analisis.md)
> Dependencias: #5 (score) ✅ 81b695d, #9 (sidebar) ✅ cf8886d
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | 635d239 |
| 2 | ✅ Completada | 2026-07-08 | 635d239 |
| 3 | ✅ Completada | 2026-07-08 | 635d239 |

---

## Fase 1 — TimelineChart component con Recharts

**Objetivo:** Componente LineChart que muestra la evolución del score de un punto a lo largo del tiempo.

**Archivos a crear:**
- `src/components/TimelineChart.tsx`

**Hallazgos del código:**
- `recharts` v3.9.2 instalado (actualizado desde v2 en setup)
- Recharts v3 API: `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`
- `PointDetail.tsx` ya tiene un placeholder "Gráfico de evolución temporal (próximamente)" — reemplazar
- Los datos del chart son un array de `{ time: string, score: number }` que el caller proporciona

**Pasos concretos:**

1. Crear `src/components/TimelineChart.tsx`:
   ```tsx
   interface TimelineDataPoint {
     time: string       // ISO timestamp o label "14:00"
     score: number      // 0-100
   }

   interface TimelineChartProps {
     data: TimelineDataPoint[]
     currentTimeIndex?: number  // para highlight del instante actual
   }
   ```

2. Implementación:
   - `ResponsiveContainer` con width="100%" height={150}
   - `LineChart` con data
   - `XAxis` dataKey="time" con formatter corto (HH:mm)
   - `YAxis` domain={[0, 100]}
   - `Line` type="monotone" dataKey="score" con color por score
   - `Tooltip` con score + hora formateada
   - Línea de referencia vertical en `currentTimeIndex` (si se proporciona)

3. Datos mock: array de 24-72 puntos con score variando

**Fuera de alcance:** Obtención real de datos temporales (eso es issue #12).

**Validación:**
- [ ] `npm run build` pasa
- [ ] El componente se renderiza sin errores TS

---

## Fase 2 — TrendIndicator + persistencia en localStorage

**Objetivo:** Componente que muestra ▲/▼/= con delta numérico, comparando score actual vs último conocido. Lógica de persistencia del último score.

**Archivos a crear:**
- `src/components/TrendIndicator.tsx`
- `src/data/last-scores-store.ts` — lectura/escritura de últimos scores en localStorage

**Hallazgos del código (decisión H3):**
- localStorage key: `"eclipse-last-scores"`
- Formato: `{ [pointId]: { score: number, timestamp: string } }`
- Comparación: score actual vs last score → delta = actual - anterior
- UI: ▲ +N (verde), ▼ -N (rojo), = (gris)

**Pasos concretos:**

1. Crear `src/data/last-scores-store.ts`:
   ```typescript
   const STORAGE_KEY = 'eclipse-last-scores'

   interface LastScore { score: number; timestamp: string }

   export function getLastScore(pointId: string): LastScore | null
   export function saveLastScore(pointId: string, score: number): void
   export function getAllLastScores(): Record<string, LastScore>
   ```

2. Crear `src/components/TrendIndicator.tsx`:
   ```tsx
   interface TrendIndicatorProps {
     currentScore: number
     pointId: string
   }
   ```
   - Lee último score del store
   - Calcula delta
   - Muestra: `▲ +5` / `▼ -3` / `=`
   - Colores: verde/rojo/gris

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] TrendIndicator muestra delta correcto con datos mock

---

## Fase 3 — Integración en PointDetail + PointCard

**Objetivo:** Reemplazar el placeholder del chart en PointDetail con TimelineChart real. Añadir TrendIndicator en PointCard y PointDetail.

**Archivos a modificar:**
- `src/components/PointDetail.tsx` — reemplazar placeholder con TimelineChart
- `src/components/PointCard.tsx` — añadir TrendIndicator (reemplaza prop `trend`)
- `src/components/index.ts` — barrel update

**Pasos concretos:**

1. En PointDetail, reemplazar el placeholder con:
   ```tsx
   <TimelineChart data={timelineData} />
   ```
   - Añadir prop `timelineData?: TimelineDataPoint[]`
   - Si no hay datos, mostrar mensaje "Sin datos temporales"

2. En PointDetail, añadir TrendIndicator junto al score total:
   ```tsx
   <TrendIndicator currentScore={score.total} pointId={point.id} />
   ```

3. En PointCard, reemplazar prop `trend` con TrendIndicator:
   - Pasar `pointId` y `score` al componente
   - Quitar prop `trend` manual

4. Actualizar barrel de components

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run build` pasa
- [ ] `npm run test` sigue pasando (98 tests)
- [ ] 4 criterios de aceptación cubiertos:
  - ✓ Gráfico muestra línea de score vs tiempo
  - ✓ Tooltip con valor exacto (Recharts built-in)
  - ✓ Indicador de tendencia con delta
  - ✓ Funciona en ambos modos (datos son agnostic al modo)

---

## Gaps y notas

1. **Recharts v3 API:** Puede tener cambios menores vs v2. Los componentes básicos (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`) se mantienen. Si hay breaking changes, consultar migration guide.

2. **Datos temporales reales:** Esta issue implementa solo la UI del chart. Los datos reales (array de scores por hora para un punto) los proporciona la capa de orquestación (issue #12). En esta issue se usan datos mock.

3. **saveLastScore timing:** Se debería llamar a `saveLastScore(pointId, score)` cada vez que se calcula un nuevo score para un punto. Esto lo conecta issue #12, pero la función ya estará disponible.

4. **Responsive chart height:** 150px es suficiente para el espacio de la ficha en sidebar. En mobile bottom sheet puede ser más comprimido — ResponsiveContainer se adapta automáticamente al width del contenedor.
