# Plan: Sidebar + Ranking + Ficha de punto

> Issue: [#9 — Sidebar: ranking de puntos + ficha detallada con desglose](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/9)
> Análisis: [decisiones-analisis.md § G1-G4, I1-I3](docs/analysis/decisiones-analisis.md)
> Dependencias: #5 (score engine) ✅ 81b695d, #6 (points store) ✅ 290780e
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

## Fase 1 — Layout split adaptativo (Sidebar container)

**Objetivo:** Crear el contenedor Sidebar que funciona como panel lateral en desktop (≥1024px) y como bottom sheet en mobile (<1024px). Integrar con App.tsx junto al MapView.

**Archivos a crear/modificar:**
- `src/views/Sidebar.tsx` — contenedor responsive
- `src/App.tsx` — layout split con sidebar + mapa

**Hallazgos del código:**
- `App.tsx` actual tiene mapa fullscreen. Necesita refactorizarse a layout split.
- Tailwind v4 ya configurado. Breakpoint `lg` = 1024px por defecto.
- Decisión G1: desktop sidebar ~350px izquierda, mobile bottom sheet deslizable.

**Pasos concretos:**

1. Crear `src/views/Sidebar.tsx`:
   ```tsx
   interface SidebarProps {
     children: React.ReactNode
   }

   export function Sidebar({ children }: SidebarProps)
   ```
   - Desktop (≥lg): `fixed left-0 top-0 h-screen w-[350px] overflow-y-auto bg-white shadow-lg z-10`
   - Mobile (<lg): `fixed bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto bg-white shadow-lg rounded-t-xl z-10`

2. Actualizar `App.tsx`:
   ```tsx
   <div className="h-screen w-screen flex">
     <Sidebar>...</Sidebar>
     <div className="flex-1 lg:ml-[350px]">
       <MapView ... />
     </div>
   </div>
   ```

**Fuera de alcance:** Bottom sheet drag gesture (usar scroll nativo para MVP).

**Validación:**
- [ ] `npm run build` pasa
- [ ] Layout split visible: sidebar izquierda + mapa a la derecha

---

## Fase 2 — RankingList y PointCard

**Objetivo:** Componente de lista de puntos ordenada por score (descendente) con cards resumidas mostrando nombre + score + indicador de tendencia.

**Archivos a crear:**
- `src/components/RankingList.tsx`
- `src/components/PointCard.tsx`

**Pasos concretos:**

1. Crear `src/components/PointCard.tsx`:
   ```tsx
   interface PointCardProps {
     name: string
     region: string
     score?: number
     trend?: 'up' | 'down' | 'stable'
     isSelected: boolean
     onClick: () => void
   }
   ```
   - Muestra: nombre, región, score numérico con color, icono tendencia (▲/▼/=)
   - Background highlight cuando `isSelected`
   - Compact: una línea con score a la derecha

2. Crear `src/components/RankingList.tsx`:
   ```tsx
   interface RankingListProps {
     points: PointWithScore[]
     selectedPointId?: string
     onSelectPoint: (pointId: string) => void
   }
   ```
   - Ordena puntos por score descendente
   - Renderiza PointCard para cada uno
   - Scroll si la lista es larga

**Fuera de alcance:** Tendencia real (requiere issue #11). Por ahora `trend` es prop opcional.

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Lista muestra puntos ordenados por score (datos mock)

---

## Fase 3 — PointDetail (ficha completa)

**Objetivo:** Componente de ficha detallada que muestra toda la información del punto seleccionado según la estructura G3.

**Archivos a crear:**
- `src/components/PointDetail.tsx`

**Hallazgos del código (decisión G3):**
- Estructura: cabecera → score total → barras desglose → solar → explicación → metadata
- Dos niveles: resumen siempre visible + expandible con datos crudos (I2)
- Los datos crudos incluyen: cloud_cover %, alt/az solar, coords corredor, modelo, timestamp

**Pasos concretos:**

1. Crear `src/components/PointDetail.tsx`:
   ```tsx
   interface PointDetailProps {
     point: ObservationPoint
     score?: ScoreResult
     solarPosition?: SolarPosition
   }
   ```

2. Secciones del componente:
   - **Cabecera:** nombre, región, elevación, badge source (catalog/custom)
   - **Score total:** número grande (0-100) con color + barra visual
   - **Desglose componentes:** 5 barras de progreso (meteo, capas, corredor, elevación, confianza) con labels y valores
   - **Datos solares:** altitud ° + azimut ° + cardinal (N, NE, E, SE, S, SW, W, NW)
   - **Explicación:** texto del explanation-engine
   - **Expandible (datos crudos):** toggle "Ver datos brutos" → cloud_cover%, visibility, forecast time, etc.
   - **Metadata (colapsable):** access, parking, notes del punto

3. Función helper `azimuthToCardinal(deg: number): string`:
   - 0→N, 45→NE, 90→E, 135→SE, 180→S, 225→SW, 270→W, 315→NW

4. Barra de componente:
   ```tsx
   function ComponentBar({ label, value }: { label: string; value: number }) {
     return (
       <div>
         <div className="flex justify-between text-xs">
           <span>{label}</span>
           <span>{Math.round(value * 100)}%</span>
         </div>
         <div className="h-2 bg-gray-200 rounded">
           <div className="h-2 rounded" style={{ width: `${value*100}%`, backgroundColor: scoreToColor(value*100) }} />
         </div>
       </div>
     )
   }
   ```

**Fuera de alcance:** Timeline chart (issue #11). Slot o placeholder para él.

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run build` pasa
- [ ] Ficha muestra score + desglose + explicación con datos mock

---

## Fase 4 — Integración Sidebar + Ranking + Detail en App

**Objetivo:** Conectar todo en el layout: sidebar con ranking, selección muestra ficha detallada, integración con MapView.

**Archivos a modificar:**
- `src/App.tsx` — estado de selección + composición completa
- `src/views/Sidebar.tsx` — integrar RankingList y PointDetail

**Pasos concretos:**

1. Estado en App.tsx:
   ```tsx
   const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
   ```

2. Vista condicional en Sidebar:
   - Si no hay punto seleccionado → mostrar RankingList
   - Si hay punto seleccionado → mostrar PointDetail + botón "← Volver al ranking"

3. Conectar `onPointSelect` de MapView con `setSelectedPointId`

4. Conectar `onSelectPoint` de RankingList con `setSelectedPointId`

5. Pasar ScoreResult mock al PointDetail del punto seleccionado

**Dependencias:** Fases 1, 2, 3

**Validación:**
- [ ] `npm run build` pasa
- [ ] Click en ranking → muestra ficha
- [ ] Click en marcador del mapa → muestra ficha en sidebar
- [ ] Botón volver → vuelve a ranking

---

## Fase 5 — Responsive + polish + barrel

**Objetivo:** Verificar responsive (mobile bottom sheet), pulir estilos, actualizar barrels.

**Archivos a modificar:**
- `src/views/Sidebar.tsx` — ajustes mobile
- `src/components/index.ts` — barrel
- `src/views/index.ts` — barrel

**Pasos concretos:**

1. Verificar que en viewport <1024px el sidebar se posiciona como bottom sheet
2. Añadir handle visual para mobile (barra gris arriba del sheet)
3. Actualizar barrels:
   - `src/components/index.ts` → export RankingList, PointCard, PointDetail
   - `src/views/index.ts` → export Sidebar

4. Limpiar código, asegurar consistencia de estilos

**Dependencias:** Fase 4

**Validación:**
- [ ] `npm run build` pasa
- [ ] `npm run test` sigue pasando (98 tests)
- [ ] 5 criterios de aceptación de la issue cubiertos:
  - ✓ Ranking ordenado por score
  - ✓ Seleccionar punto muestra ficha
  - ✓ Ficha con score + desglose + explicación
  - ✓ Layout desktop + mobile
  - ✓ Detalle expandible con datos crudos

---

## Gaps y notas

1. **Bottom sheet drag:** Para MVP, el bottom sheet es un div fixed con scroll interno. No tiene gesture de drag up/down. Si se necesita en futuro, añadir librería tipo `react-spring` o CSS `snap-scroll`.

2. **Tendencia (▲/▼/=):** Requiere `localStorage["eclipse-last-scores"]` comparando con score anterior. Esto se implementa en issue #11 (Timeline). En esta issue, el prop `trend` es opcional y se muestra solo si disponible.

3. **scoreToColor reutilizable:** La función `scoreToColor` de MapView se reutiliza en PointCard y PointDetail. Extraerla a un helper compartido (`src/components/utils.ts` o similar).

4. **Sin tests de componentes React:** Esta issue no añade tests de React (Testing Library). La validación es build + visual. Tests de componentes se pueden añadir como mejora transversal posterior.
