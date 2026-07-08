# Plan: Points Store

> Issue: [#6 — Points Store: catálogo base + puntos custom en localStorage](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/6)
> Análisis: [decisiones-analisis.md § D1-D4](docs/analysis/decisiones-analisis.md)
> Dependencia: #1 (setup) — ✅ Completada (commit c62cadd)
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | 290780e |
| 2 | ✅ Completada | 2026-07-08 | 290780e |
| 3 | ✅ Completada | 2026-07-08 | 290780e |

---

## Fase 1 — Catálogo base JSON

**Objetivo:** Crear el archivo JSON con 5-10 puntos de ejemplo para desarrollo. Puntos reales de España con elevación conocida.

**Archivos a crear:**
- `src/data/points-catalog.json`

**Hallazgos del código:**
- `ObservationPoint` ya existe en `src/config/types.ts` con todos los campos definidos
- El catálogo se importa como JSON estático por Vite (import directo)
- Decisión D3: criterios de selección → franja eclipse, >800m preferible, horizonte despejado, accesible

**Pasos concretos:**

1. Crear `src/data/points-catalog.json` con 8 puntos de ejemplo en España:
   - Puntos de montaña/meseta con buena elevación
   - Incluir variedad: Pirineo, Sistema Central, Sierra Nevada, etc.
   - Cada punto con todos los campos obligatorios + algunos opcionales
   - `source: "catalog"` en todos
   - Elevaciones reales (consultadas o aproximadas)

   Estructura por punto:
   ```json
   {
     "id": "cat-001",
     "name": "Pico del Veleta (acceso)",
     "region": "Sierra Nevada, Granada",
     "coordinates": { "lat": 37.0563, "lon": -3.3667 },
     "elevation": 3100,
     "source": "catalog",
     "tags": ["alta montaña", "horizonte despejado"],
     "metadata": { "access": "Carretera hasta 2500m + sendero", "parking": true }
   }
   ```

**Fuera de alcance:** No se buscan puntos definitivos para el eclipse real (requiere confirmar franja). Son puntos de desarrollo.

**Validación:**
- [ ] `npm run build` pasa (Vite importa el JSON sin errores)
- [ ] El JSON tiene 5-10 entradas válidas con todos los campos obligatorios

---

## Fase 2 — Points Store (CRUD + merge)

**Objetivo:** Implementar el módulo que fusiona catálogo base + puntos custom (localStorage) y expone funciones CRUD.

**Archivos a crear:**
- `src/data/points-store.ts`

**Hallazgos del código:**
- localStorage key: `"eclipse-custom-points"` (definido en análisis)
- Merge: catálogo base (inmutable) + custom (mutable) → array completo
- IDs custom: generar con `crypto.randomUUID()` o `Date.now().toString(36)` prefijado con `"custom-"`

**Pasos concretos:**

1. Crear `src/data/points-store.ts` con:
   ```typescript
   import catalogData from './points-catalog.json'
   import type { ObservationPoint } from '../config/types'

   const STORAGE_KEY = 'eclipse-custom-points'

   export function getAllPoints(): ObservationPoint[]
   export function getCatalogPoints(): ObservationPoint[]
   export function getCustomPoints(): ObservationPoint[]
   export function addCustomPoint(point: Omit<ObservationPoint, 'id' | 'source'>): ObservationPoint
   export function removeCustomPoint(id: string): void
   ```

2. `getAllPoints()`: devuelve `[...catalogPoints, ...customPoints]`
3. `getCatalogPoints()`: devuelve el catálogo base casteado a `ObservationPoint[]`
4. `getCustomPoints()`: lee de localStorage, parsea JSON, devuelve array
5. `addCustomPoint()`: genera id (`"custom-" + Date.now().toString(36)`), añade `source: "custom"`, guarda en localStorage
6. `removeCustomPoint(id)`: filtra el array de custom, guarda

**Fuera de alcance:** Validación de coordenadas, consulta de elevación (eso lo hace el caller antes de guardar).

**Dependencias:** Fase 1 (necesita el JSON)

**Validación:**
- [ ] `npm run build` pasa
- [ ] Import de `getAllPoints` compila sin errores de tipo

---

## Fase 3 — Tests + barrel update

**Objetivo:** Tests unitarios que cubren los 4 criterios de aceptación.

**Archivos a crear:**
- `src/data/__tests__/points-store.test.ts`

**Pasos concretos:**

1. Tests:
   - `getAllPoints()` devuelve puntos del catálogo (al menos 5)
   - `addCustomPoint()` → `getAllPoints()` incluye el nuevo punto
   - `addCustomPoint()` → punto tiene `source: "custom"` e id con prefijo
   - `removeCustomPoint()` → ya no aparece en `getAllPoints()`
   - `getCustomPoints()` devuelve solo los custom
   - Persistencia: tras `addCustomPoint`, verificar que localStorage tiene el dato

2. Actualizar barrel `src/data/index.ts`

**Dependencias:** Fases 1, 2

**Validación:**
- [ ] `npm run test` pasa todos los tests
- [ ] `npm run build` pasa
- [ ] 4 criterios de aceptación cubiertos

---

## Gaps y notas

1. **TypeScript y JSON import:** Vite soporta `import data from './file.json'` nativamente. El tipo se infiere. Se puede castear a `ObservationPoint[]` con un assert o mapeo.

2. **IDs del catálogo:** Usar prefijo `"cat-"` para diferenciar de custom (`"custom-"`). Esto evita colisiones.

3. **Puntos de ejemplo:** No son los puntos finales del eclipse real. Sirven para desarrollo y tests de la UI. Se actualizarán cuando se confirme la franja del eclipse (issue #8 del catálogo base mencionada en la validación cruzada).
