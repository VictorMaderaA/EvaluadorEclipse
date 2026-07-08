# Plan: Modos Temporales

> Issue: [#10 — Modos temporales: toggle 72h/eclipse + slider + config persistente](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/10)
> Análisis: [decisiones-analisis.md § H1-H4](docs/analysis/decisiones-analisis.md)
> Dependencias: #5 (score) ✅, #8 (map) ✅ 836120f, #9 (sidebar) ✅ cf8886d
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

## Fase 1 — Config manager con lectura URL → localStorage → defaults

**Objetivo:** Ampliar `eclipse-config.ts` con funciones de lectura/escritura que respetan la prioridad: URL params > localStorage > defaults.

**Archivos a modificar:**
- `src/config/eclipse-config.ts` — añadir funciones de gestión

**Hallazgos del código:**
- `EclipseConfig` ya definida con `mode`, `eclipseDate`, `eclipseTime`, `windowBefore`, `windowAfter`
- `DEFAULT_ECLIPSE_CONFIG` ya existe
- localStorage key: `"eclipse-config"` (decisión H4)
- URL params: `?mode=eclipse&date=YYYY-MM-DD&time=HH:mm`

**Pasos concretos:**

1. Añadir funciones a `eclipse-config.ts`:
   ```typescript
   export function loadEclipseConfig(): EclipseConfig
   export function saveEclipseConfig(config: EclipseConfig): void
   export function configToUrlParams(config: EclipseConfig): string
   export function getSelectedDateTime(config: EclipseConfig): Date | null
   ```

2. `loadEclipseConfig()`:
   - Leer URL search params (`window.location.search`)
   - Si hay `mode=eclipse` + `date` + `time` → construir config desde URL
   - Si no → leer `localStorage["eclipse-config"]`
   - Si no → devolver `DEFAULT_ECLIPSE_CONFIG`

3. `saveEclipseConfig(config)`:
   - Guardar en localStorage como JSON

4. `configToUrlParams(config)`:
   - Si mode=eclipse: `?mode=eclipse&date=${eclipseDate}&time=${eclipseTime}`
   - Si mode=72h: `?mode=72h`

5. `getSelectedDateTime(config)`:
   - Construye Date desde eclipseDate + eclipseTime
   - Null si faltan datos

**Fuera de alcance:** UI components (fases siguientes).

**Validación:**
- [ ] `npm run build` pasa
- [ ] Test: loadEclipseConfig con URL params mock devuelve config correcta

---

## Fase 2 — ModeSelector (toggle en header)

**Objetivo:** Componente toggle que cambia entre "Próximas 72h" y "Modo Eclipse", con panel de configuración para eclipse.

**Archivos a crear:**
- `src/components/ModeSelector.tsx`

**Pasos concretos:**

1. Crear `src/components/ModeSelector.tsx`:
   ```tsx
   interface ModeSelectorProps {
     config: EclipseConfig
     onConfigChange: (config: EclipseConfig) => void
   }
   ```

2. UI del toggle:
   - Dos botones/tabs: "72h" y "Eclipse"
   - Estilo activo/inactivo con Tailwind
   - Posicionado en header (barra superior sobre sidebar + mapa)

3. Panel de configuración eclipse (visible solo en modo eclipse):
   - Input fecha: `<input type="date">`
   - Input hora: `<input type="time">`
   - Inputs ventana: `-XX min` / `+XX min` (numéricos)
   - Botón "Compartir" → copia URL params al clipboard

4. Al cambiar modo → `onConfigChange` con nuevo config

**Fuera de alcance:** Slider temporal (Fase 3).

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Toggle cambia visualmente entre modos

---

## Fase 3 — TimeSlider

**Objetivo:** Slider que permite navegar por horas. En modo 72h cubre 72 horas desde ahora, en modo eclipse cubre la ventana configurada.

**Archivos a crear:**
- `src/components/TimeSlider.tsx`

**Pasos concretos:**

1. Crear `src/components/TimeSlider.tsx`:
   ```tsx
   interface TimeSliderProps {
     config: EclipseConfig
     selectedTime: Date
     onTimeChange: (time: Date) => void
   }
   ```

2. Lógica del rango:
   - **Modo 72h:** `startTime = now`, `endTime = now + 72h`, step = 1h
   - **Modo eclipse:** `startTime = eclipseDateTime - windowBefore`, `endTime = eclipseDateTime + windowAfter`, step = 15min (más granular)

3. UI:
   - `<input type="range">` estilizado con Tailwind
   - Label mostrando fecha/hora seleccionada: "Mié 8 Jul, 14:00"
   - Marcas opcionales (inicio, fin, medio)

4. Al mover slider → `onTimeChange(newDate)` → trigger recálculo en padre

**Fuera de alcance:** Recálculo real de scores (eso lo conecta el padre/App).

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` pasa
- [ ] Slider renderiza con rango correcto según modo

---

## Fase 4 — Integración en App + header layout

**Objetivo:** Integrar ModeSelector y TimeSlider en la app, añadir header bar, conectar cambio de tiempo con estado global.

**Archivos a modificar:**
- `src/App.tsx` — añadir estado de config + header + slider + lógica temporal
- `src/components/index.ts` — barrel update

**Pasos concretos:**

1. Añadir header bar en App.tsx (encima del layout):
   ```tsx
   <div className="h-screen w-screen flex flex-col">
     <header className="h-14 bg-white border-b flex items-center px-4 z-20">
       <ModeSelector config={config} onConfigChange={setConfig} />
     </header>
     <div className="flex-1 flex relative">
       <Sidebar>...</Sidebar>
       <div className="flex-1 lg:ml-[350px] relative">
         <MapView ... />
         <div className="absolute bottom-4 left-4 right-4">
           <TimeSlider config={config} selectedTime={selectedTime} onTimeChange={setSelectedTime} />
         </div>
       </div>
     </div>
   </div>
   ```

2. Estado:
   ```tsx
   const [config, setConfig] = useState<EclipseConfig>(loadEclipseConfig)
   const [selectedTime, setSelectedTime] = useState<Date>(new Date())
   ```

3. Efecto: al cambiar config → `saveEclipseConfig(config)`

4. Al cambiar `selectedTime` → en futuro triggerea recálculo de scores (por ahora solo estado)

5. Actualizar barrel `src/components/index.ts`

**Dependencias:** Fases 1, 2, 3

**Validación:**
- [ ] `npm run build` pasa
- [ ] `npm run test` sigue pasando (98 tests)
- [ ] 5 criterios de aceptación cubiertos:
  - ✓ Toggle cambia entre modos
  - ✓ Slider en 72h cubre 72 horas
  - ✓ Slider en eclipse cubre ventana configurada
  - ✓ Config persiste (localStorage)
  - ✓ URL params configuran al cargar

---

## Gaps y notas

1. **Recálculo de scores al mover slider:** La conexión real (mover slider → nueva posición solar → nuevo score) se implementa en issue #12 (integración). En esta issue, el slider emite la hora seleccionada y el estado se guarda, pero no dispara fetch de forecast.

2. **URL params lectura vs escritura:** Se lee al cargar (`loadEclipseConfig`). Se escribe solo al pulsar "Compartir". No se actualiza la URL en tiempo real (history.pushState) para evitar pollution del historial del browser.

3. **Header responsivo:** En mobile, el header queda fixed top con el toggle. El TimeSlider va posicionado absolute sobre el mapa (bottom), tanto en desktop como mobile.

4. **Step del slider:** 1h en modo 72h (72 posiciones), 15min en modo eclipse (~5 posiciones para ventana 75min). El step pequeño en eclipse permite evaluar el instante exacto de máximo eclipse.
