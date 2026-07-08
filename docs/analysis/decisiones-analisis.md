# Decisiones y Análisis — Eclipse MVP

> Última actualización: 2026-07-08
> Input para: plan-expander

---

## A — Stack técnico y arquitectura

### A1 — Lenguaje principal

**Decisión:** TypeScript

**Motivo:** El motor de scoring necesita interfaces claras entre componentes (forecast, solar, elevation, score). Los tipos facilitan la iteración por agente y reducen errores en refactoring. SunCalc tiene tipos disponibles.

**Descartado:** JavaScript puro (sin tipos, refactoring frágil para un proyecto con múltiples módulos interdependientes).

**Referencia fuente:** mvp.md § Arquitectura técnica sugerida: "Motor de scoring desacoplado, testeable y configurable"

**Paths explorados:**
- `/home/develop/projects/eclipse/mvp.md` — sección arquitectura, componentes lógicos listados

**Impacto:** Todo el código del proyecto será TypeScript. tsconfig.json necesario.

---

### A2 — Framework frontend

**Decisión:** React

**Motivo:** Ecosystem maduro para mapas (`react-map-gl`) y charts. Mayor cantidad de ejemplos y libs compatibles. Buena integración con el wrapper de MapLibre.

**Descartado:** Vue (válido pero menos integración con react-map-gl), Svelte (ecosystem más pequeño para mapas/charts), Vanilla (demasiado trabajo manual para estado reactivo del ranking).

**Referencia fuente:** mvp.md § UX propuesta: "Frontend web con mapa interactivo", múltiples vistas reactivas (ranking, ficha, timeline).

**Paths explorados:**
- `/home/develop/projects/eclipse/mvp.md` — secciones UX y arquitectura

**Impacto:** React como framework principal. JSX/TSX para componentes.

---

### A3 — Capa de servicios

**Decisión:** SPA pura, sin backend. API keys (si se necesitan en el futuro) se gestionan en localStorage del navegador.

**Motivo:** Open-Meteo es CORS-friendly y no requiere API key. MapLibre es client-side. No hay necesidad de backend para el MVP. Si surge una API con key, el usuario la introduce una vez en un panel de configuración y se almacena en localStorage.

**Descartado:** Backend proxy (complejidad operativa innecesaria para MVP), Serverless functions (vendor lock-in, no aporta valor cuando las APIs son públicas).

**Referencia fuente:** mvp.md § Arquitectura: "Capa de servicios ligera para consumir APIs públicas y normalizar respuestas" — se resuelve con módulos TypeScript client-side en vez de un servidor.

**Paths explorados:**
- `/home/develop/projects/eclipse/mvp.md` — sección arquitectura y fuentes de datos

**Impacto:** No hay infra de backend. Deployment es solo archivos estáticos. Las APIs se consumen directamente desde el browser.

---

### A4 — Bundler/tooling

**Decisión:** Vite

**Motivo:** Estándar actual para SPAs con React + TypeScript. HMR rápido, soporte TS nativo, configuración mínima. Sin overhead de SSR.

**Descartado:** Next.js (overkill, no necesitamos SSR/SSG para una herramienta sin SEO crítico), Astro (orientado a contenido estático).

**Referencia fuente:** mvp.md § Criterios de éxito: "lo bastante simple como para que un agente de código pueda iterar sobre él en ciclos cortos"

**Paths explorados:**
- `/home/develop/projects/eclipse/mvp.md` — criterios de éxito, arquitectura

**Impacto:** `vite.config.ts` como configuración central del build.

---

### A5 — Monorepo vs single-app

**Decisión:** Single-app con módulos internos organizados por carpeta.

**Motivo:** MVP con complejidad acotada. Los componentes lógicos del mvp.md (score-engine, forecast-provider, etc.) serán carpetas/módulos dentro de `/src/`, no paquetes separados. Reduce tooling y fricción.

**Descartado:** Monorepo con turborepo/nx (overkill para MVP, más configuración sin beneficio real con un solo deployable).

**Referencia fuente:** mvp.md § Arquitectura: lista de componentes lógicos (`points-catalog`, `forecast-provider`, `solar-engine`, `elevation-provider`, `score-engine`, `timeline-view`, `map-view`).

**Estructura propuesta:**
```
src/
  engines/       → score-engine, solar-engine
  providers/     → forecast-provider, elevation-provider
  data/          → points-catalog
  views/         → map-view, timeline-view, ranking
  components/    → UI compartida
  config/        → tipos, constantes, configuración
```

**Impacto:** Un solo `package.json`, un solo deploy target.

---

### A6 — Librería de mapas

**Decisión:** MapLibre GL JS con wrapper `react-map-gl`. Tiles gratuitas (OpenFreeMap o Stadia Maps).

**Motivo:** El usuario necesita un mapa de calor basado en grid (evaluar score en celdas y colorear por valor). Esto requiere renderizar cientos/miles de polígonos coloreados. MapLibre usa WebGL → rendimiento fluido para esta carga. Soporta capa `fill` nativa para GeoJSON con color por propiedad, click events por feature, y en el futuro terreno 3D si se quiere.

**Descartado:** Leaflet (DOM-based, rendimiento insuficiente para grid denso de celdas coloreadas; plugin heatmap es punto-radio, no grid discreto), Mapbox GL JS (requiere API key y coste potencial).

**Referencia fuente:** mvp.md § UX: "Mapa general con puntos coloreados por score", "vista de mapa 2D con capas básicas y marcadores por score". El usuario amplió el requisito a heatmap por grid evaluado.

**Paths explorados:**
- `/home/develop/projects/eclipse/mvp.md` — sección UX y arquitectura
- Investigación de rendimiento Leaflet vs MapLibre para visualización densa

**Impacto:** `react-map-gl` + `maplibre-gl` como dependencias. Tiles gratuitas sin API key para el MVP. El grid heatmap se renderiza como capa GeoJSON `fill` con color-scale por score.

---

## B — Modelo de scoring v1

### B1 — Fórmula base

**Decisión:** Modelo híbrido — base aditiva ponderada con penalización multiplicativa cuando nubosidad total > 90%.

**Motivo:** La base aditiva es explicable y permite mostrar desglose visual de componentes. El multiplicador de penalización evita el caso absurdo de buen score con cielo cubierto al 98%. Combina simplicidad con realismo.

**Descartado:** Aditivo puro (no castiga suficiente nubosidad extrema), Multiplicativo puro (menos intuitivo para el usuario, difícil explicar desglose).

**Referencia fuente:** mvp.md § Propuesta de scoring v1: "El scoring debe ser simple, explicable y fácil de recalibrar"

**Fórmula:**
```
score_raw = w1·meteo + w2·capas + w3·corredor + w4·elevacion + w5·confianza
penalty = cloud_cover_total > 90 ? (1 - (cloud_cover_total - 90) / 10) : 1.0
score_final = score_raw × penalty
```

**Impacto:** `src/engines/score-engine.ts` — función principal de cálculo.

---

### B2 — Pesos iniciales

**Decisión:** Distribución de pesos v1:

| Componente | Peso |
|---|---|
| Nubosidad total del punto | 30% |
| Nubosidad por capas (baja/media/alta) | 25% |
| Corredor direccional | 25% |
| Elevación/relieve | 10% |
| Confianza del modelo | 10% |

**Motivo:** Nubosidad total como señal dominante rápida. Capas y corredor equiparados porque ambos refinan la lectura de formas distintas. Elevación aporta pero no domina. Confianza subida a 10% (desde 5% del mvp.md) porque si la predicción es muy incierta, hay que reflejarlo.

**Descartado:** Los pesos originales del mvp.md (35/25/25/10/5) — se ajustó ligeramente para dar más relevancia a confianza.

**Referencia fuente:** mvp.md § Propuesta de scoring v1: tabla de pesos orientativos.

**Impacto:** Valores iniciales en `ScoringConfig`. Ajustables sin redeploy.

---

### B3 — Corredor direccional

**Decisión:** Corredor de 20 km desde el punto de observación, en línea recta hacia el azimut solar. 3 puntos de muestreo a 5, 10 y 20 km. Ponderación por proximidad: 70% / 20% / 10%.

**Motivo:** 20 km cubre la distancia relevante de nubes bajas/medias que podrían obstruir la visión. 3 puntos son suficientes para v1 sin explotar las llamadas a la API. Más peso al punto cercano porque las nubes próximas obstruyen más.

**Descartado:** Corredor más largo (30-50 km — añade complejidad sin certeza de mejora en v1), Abanico 2D (útil pero fase posterior), Ponderación uniforme (menos realista).

**Referencia fuente:** mvp.md § Modelo conceptual: "Muestreo meteorológico en varios puntos del corredor alineado con el azimut solar"

**Impacto:** 3 llamadas API adicionales por punto evaluado del catálogo. Grid heatmap NO usa corredor (reducir coste). `src/engines/solar-engine.ts` calcula coordenadas del corredor.

---

### B4 — Penalización por altitud solar baja

**Decisión:** Multiplicador de penalización basado en altitud solar:
- ≥ 30°: sin penalización (×1.0)
- 10°–30°: penalización lineal (×0.7 a ×1.0)
- 0°–10°: penalización fuerte (×0.5 a ×0.7)
- < 0°: score = 0 (sol bajo horizonte)

**Motivo:** Cuando el Sol está bajo, la línea de visión atraviesa más atmósfera y las nubes bajas tienen más efecto. El umbral de 30° es conservador. Los eclipses en España suelen tener altitudes solares moderadas, así que este factor será un ajuste fino, no un cambio drástico.

**Descartado:** Sin penalización (ignora un factor físico real), Curva exponencial (más difícil de explicar).

**Referencia fuente:** mvp.md § Modelo conceptual: "Penalización adicional cuando la altitud solar sea baja"

**Impacto:** Multiplicador aplicado después del score aditivo, antes del penalty de nubosidad extrema.

---

### B5 — Normalización de componentes

**Decisión:** Cálculo interno en rango 0–1 para cada componente. Presentación al usuario en escala 0–100 (entero redondeado).

**Motivo:** 0–1 simplifica la aritmética de pesos y multiplicadores. 0–100 es intuitivo para el usuario ("este punto tiene 73 sobre 100").

**Descartado:** 0–10 (menos granular), mantener 0–1 en UI (menos intuitivo).

**Referencia fuente:** mvp.md § UX: "Score total" como elemento visible por punto.

**Impacto:** Cada provider devuelve valores normalizados 0–1. La capa de presentación multiplica por 100.

---

### B6 — Confianza del modelo

**Decisión:** Comparar forecast de 2 modelos meteorológicos (best_match + ICON-EU) para la misma coordenada y hora. Medir diferencia absoluta en `cloud_cover`. Si < 15% → confianza 1.0. Si > 40% → confianza 0.3. Interpolación lineal entre medias.

**Motivo:** Ligero (2 llamadas vs N del ensemble completo), ya da información útil sobre la fiabilidad de la predicción. Si ambos modelos coinciden, la predicción es más robusta.

**Descartado:** Ensemble completo (muchas más llamadas API, complejidad de procesamiento para MVP), Sin confianza (pierde información útil que es barata de obtener).

**Referencia fuente:** mvp.md § Fuentes de datos: "variantes por modelo y ensemble mean", § Scoring: "Ajuste por confianza del modelo"

**Impacto:** 2× llamadas API por punto (una por modelo). `src/providers/forecast-provider.ts` debe soportar consultar modelos específicos.

---

### B7 — Parametrización en runtime

**Decisión:** Configuración tipada en TypeScript (`ScoringConfig`), exportada desde archivo dedicado. Incluye pesos, umbrales de penalización, y parámetros del corredor. Para v1, solo configurable editando el archivo. Panel UI de ajuste en fase posterior.

**Interfaz:**
```typescript
interface ScoringConfig {
  weights: {
    cloudTotal: number
    cloudLayers: number
    corridor: number
    elevation: number
    confidence: number
  }
  penalties: {
    highCloudThreshold: number    // default: 90
    lowAltitudeThreshold: number  // default: 30
    minAltitude: number           // default: 10
  }
  corridor: {
    lengthKm: number             // default: 20
    samplePoints: number         // default: 3
    distanceWeights: number[]    // default: [0.7, 0.2, 0.1]
  }
}
```

**Motivo:** Permite iterar sobre calibrado sin tocar lógica de negocio. Tipo estricto previene errores.

**Referencia fuente:** mvp.md § Scoring: "versión parametrizable y que el calibrado se haga con datos reales"

**Impacto:** `src/config/scoring-config.ts`. Importado por score-engine.

---

### B8 — Grid para heatmap

**Decisión:** Grid de 10 km × 10 km sobre la franja del eclipse (+ buffer). Score simplificado para el grid (sin corredor direccional). Los puntos del catálogo mantienen score completo con corredor. Dos capas visuales complementarias en el mapa.

**Detalles:**
- Resolución: 10 km × 10 km por celda
- Área: franja del eclipse + buffer lateral (~800×200 km → ~160 celdas)
- Evaluación: centroide de cada celda
- Score grid: meteo + capas + elevación + confianza (sin corredor) → reduce llamadas API
- Visualización: capa GeoJSON `fill` con color-scale en MapLibre
- Interacción: click en celda muestra score + desglose

**Motivo:** El corredor en cada celda del grid triplicaría las llamadas API (~480 extra). Sin corredor, el heatmap sigue siendo informativo como visión panorámica. Los puntos del catálogo (curados, ~20-50) sí justifican el coste del corredor.

**Descartado:** Grid con corredor completo (coste API prohibitivo para refrescos frecuentes), Grid solo donde hay puntos del catálogo (pierde el valor de panorámica visual).

**Referencia fuente:** Requisito del usuario durante análisis: "mapa de calor para un área... grid evaluado... click para ver score". mvp.md § UX: "Mapa general con puntos coloreados por score".

**Impacto:** `src/engines/grid-engine.ts` (generación de celdas), reutiliza score-engine en modo simplificado. Capa adicional en map-view.

---

### Nota para secciones futuras

Se registra para Sección G (UX): el usuario quiere además una **capa visual de nubosidad sobre mapa con relieve** (tipo radar meteorológico), toggleable, para ver las nubes que motivan el score. Registrado como G6. No es scoring, es visualización complementaria.

---

## C — Integración meteorológica (Open-Meteo)

### C1 — Modelos meteorológicos

**Decisión:** Modelo principal `best_match` (default de Open-Meteo, selecciona automáticamente el mejor modelo para cada coordenada). Modelo secundario `icon_eu` (DWD ICON EU) para el componente de confianza (B6).

**Motivo:** `best_match` es el más conveniente porque Open-Meteo ya optimiza la selección del modelo con mejor resolución local. `icon_eu` tiene 7km de resolución, cubre toda España, se actualiza cada 3 horas y es un modelo diferente al que normalmente selecciona `best_match` para España → da buena señal de acuerdo/desacuerdo.

**Descartado:**
- `ecmwf_ifs` como secundario (updates cada 6h, más lento; 9km resolución inferior a ICON-EU para Europa)
- `arpege_europe` (cobertura parcial de España, especialmente sur)
- Ensemble completo (demasiadas llamadas para MVP)

**Referencia fuente:** mvp.md § Fuentes de datos: "variantes por modelo y ensemble mean"

**Paths explorados:**
- https://open-meteo.com/en/docs — documentación completa de la API, modelos disponibles, tabla de resoluciones

**Impacto:** `src/providers/forecast-provider.ts` — debe aceptar parámetro de modelo. Dos llamadas por batch (una por modelo).

---

### C2 — Variables exactas

**Decisión:** Variables horarias a consultar:
- `cloud_cover` — nubosidad total (%)
- `cloud_cover_low` — nubes bajas hasta 3km (%)
- `cloud_cover_mid` — nubes medias 3-8km (%)
- `cloud_cover_high` — nubes altas >8km (%)
- `visibility` — visibilidad en metros (complementaria para niebla/calima)

**Motivo:** Cubren todos los componentes del scoring (B1-B4). Nubosidad total para el score base y penalty. Capas para el componente por capas. Visibility como señal complementaria para condiciones de baja visibilidad no necesariamente causadas por nubes (niebla, calima).

**Descartado:** `relative_humidity_2m` (correlaciona con nubosidad, redundante), variables de precipitación (no aportan al score de observación visual directa).

**Referencia fuente:** mvp.md § Fuentes de datos: lista de variables de interés.

**Parámetro API:**
```
hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility
```

**Impacto:** Interface `ForecastData` en TypeScript con estos 5 campos + timestamps.

---

### C3 — Estrategia de cache y refresco

**Decisión:** Cache de dos niveles:
1. **Nivel 1 — Memoria (Map JS):** TTL 1 hora. Evita repetir llamadas mientras el usuario navega entre vistas en la misma sesión.
2. **Nivel 2 — localStorage:** TTL 5 minutos. Evita repetir llamadas si el usuario recarga la página o abre nueva pestaña en un intervalo corto.

Key en ambos: `${lat},${lon},${model},${forecastDays}`.

Flujo de lectura: memoria → localStorage (si no expirado) → API.
Flujo de escritura: al obtener de API → guardar en memoria + localStorage con timestamp.

**Motivo:** La cache en memoria (1h) cubre la navegación normal. La cache en localStorage (5min) evita el caso molesto de recargar página y que se re-hagan todas las peticiones idénticas inmediatamente. 5 minutos es suficientemente corto para no servir datos stale pero suficiente para cubrir recargas rápidas.

**Descartado:** Solo memoria (se pierde al recargar, innecesarias llamadas repetidas), localStorage con TTL largo (datos stale), sin cache (demasiadas llamadas).

**Referencia fuente:** mvp.md § Arquitectura: "Cache temporal en memoria o estrategia de refresco simple". Refinado por el usuario: persistencia corta para evitar re-peticiones tras recarga.

**Impacto:** `src/providers/forecast-cache.ts` — dos capas, la de localStorage serializa/deserializa JSON con campo `fetchedAt`.

---

### C4 — Manejo de errores y fallback

**Decisión:**
1. Si falla una petición → retry 1 vez tras 2 segundos
2. Si sigue fallando → punto marcado como "sin datos" con indicador visual en UI
3. Si el modelo secundario (`icon_eu`) falla → confianza = 0.5 (neutro, no penaliza ni bonifica)
4. No hay fallback entre modelos: no mezclar fuentes de forma opaca

**Motivo:** Simplicidad y transparencia. Es mejor mostrar "sin datos" que presentar un score calculado con datos de fuente diferente sin que el usuario lo sepa. El valor neutro de confianza (0.5) no distorsiona el ranking cuando el dato no está disponible.

**Descartado:** Fallback automático a otro modelo (opacidad, puede generar inconsistencias en el ranking), cache indefinida de último dato conocido (puede ser muy stale).

**Referencia fuente:** mvp.md § Riesgos: "Riesgo de scoring opaco"

**Impacto:** Lógica de retry en `forecast-provider.ts`. Estado "sin datos" en la UI por punto.

---

### C5 — Rate limiting y batching

**Decisión:** Usar el soporte nativo de Open-Meteo para coordenadas múltiples en una llamada (`&latitude=lat1,lat2,...&longitude=lon1,lon2,...`). Batches de hasta 50 coordenadas. Throttle de 200ms entre llamadas.

**Estimación de llamadas por refresco completo:**
- Grid (160 celdas): ceil(160/50) = 4 batches × 2 modelos = 8 llamadas HTTP
- Catálogo (30 puntos + 90 corredor): ceil(120/50) = 3 batches × 2 modelos = 6 llamadas HTTP
- **Total: ~14 llamadas HTTP por refresco completo** (~3 segundos con throttle)

**Motivo:** El batching reduce drásticamente el número de llamadas HTTP. 14 llamadas es trivial y no estresará la API. El throttle de 200ms es cortesía para no mandar todo en paralelo absoluto.

**Descartado:** Una llamada por coordenada (160+ llamadas HTTP, lento e innecesario), batches más grandes (>50 coords no probado, conservar margen).

**Referencia fuente:** Documentación API Open-Meteo: "Multiple coordinates can be comma separated"

**Impacto:** `src/providers/forecast-provider.ts` — función de batching que agrupa coords y distribuye en llamadas.

---

## D — Catálogo de puntos

### D1 — Formato del catálogo

**Decisión:** JSON en `/src/data/points-catalog.json` con interface TypeScript para validación en build-time. Adicionalmente, puntos custom del usuario se almacenan en localStorage y se fusionan con el catálogo base en runtime.

**Motivo:** JSON es versionable en git, importable directamente por Vite sin parser extra. La capa de localStorage permite al usuario añadir puntos propios sin tocar código ni redeploy.

**Descartado:** YAML (añade dependencia de parser), base de datos (overkill sin backend), solo localStorage (se pierde el catálogo curado base).

**Referencia fuente:** mvp.md § Alcance funcional: "Cargar una lista de puntos candidatos en España", § Arquitectura: "Dataset versionado de puntos candidatos en JSON o similar"

**Flujo de fusión:**
1. En build: catálogo base importado como JSON estático
2. En runtime: leer `localStorage['eclipse-custom-points']`
3. Merge: catálogo base + puntos custom → lista completa para scoring
4. Los puntos custom tienen un flag `source: 'custom'` para diferenciarlos visualmente

**Impacto:** `src/data/points-catalog.json` (base), `src/data/points-store.ts` (merge + CRUD localStorage).

---

### D2 — Campos por punto

**Decisión:** Interface TypeScript con campos obligatorios y opcionales:

```typescript
interface ObservationPoint {
  id: string                    // Identificador único (slug o UUID para custom)
  name: string                  // Nombre legible
  region: string                // Región/provincia
  coordinates: {
    lat: number                 // WGS84
    lon: number
  }
  elevation: number             // Metros sobre nivel del mar
  source: 'catalog' | 'custom' // Origen del punto
  metadata?: {
    access?: string             // Descripción de acceso
    difficulty?: 'easy' | 'moderate' | 'hard'
    parking?: boolean           // ¿Hay aparcamiento cercano?
    notes?: string              // Notas libres
  }
  tags?: string[]               // Etiquetas opcionales
}
```

**Motivo:** Campos mínimos (id, name, region, coordinates, elevation, source) son obligatorios para que el scoring funcione. Metadata es opcional → permite añadir puntos rápido (solo nombre + coords) sin rellenar todo.

**Referencia fuente:** mvp.md § Alcance funcional: "nombre, coordenadas, elevación base, notas logísticas y etiqueta de región"

**Impacto:** Todos los módulos que consumen puntos (score-engine, map-view, ranking) usan esta interface.

---

### D3 — Criterios de selección y regiones

**Decisión:** Criterios para el catálogo base curado:
1. Dentro o cerca de la franja del eclipse
2. Elevación preferente >800m (reduce probabilidad de nubes bajas)
3. Horizonte despejado conocido (miradores, cumbres, altiplanos)
4. Accesibilidad razonable (coche o caminata corta)
5. Diversidad geográfica (distribuidos, no todos en la misma zona)

Regiones candidatas: Sistema Central, Meseta norte, Aragón/Sistema Ibérico, Pirineos, costa mediterránea norte. Selección concreta pendiente de confirmar franja real del eclipse.

**Motivo:** Estos criterios maximizan la utilidad del ranking: puntos diversos donde el score realmente discrimine. La selección final se hará cuando se conozca la geometría del eclipse.

**Referencia fuente:** mvp.md § Enfoque geográfico: "Definir puntos candidatos curados manualmente, con preferencia por lugares altos o con horizonte despejado"

**Impacto:** Tarea de curación manual antes de fase de implementación. JSON editable post-deploy sin problema.

---

### D4 — Cantidad objetivo

**Decisión:** 20-30 puntos en el catálogo base. Sin límite para puntos custom del usuario.

**Motivo:** 30 puntos × 4 coords (con corredor) = 120 coords → 3 batches API, manejable. Suficientes para ranking interesante. No tantos como para abrumar la UI. Puntos custom sin límite porque el usuario decide cuánto quiere explorar.

**Referencia fuente:** mvp.md § Alcance: "conjunto de puntos definidos de antemano" (base) + requisito del usuario de poder añadir más (custom).

**Impacto:** Si el usuario añade muchos puntos custom (>50 totales), el refresco tardará más. Aceptable para MVP — se puede paginar las llamadas o mostrar warning si hay demasiados.

---

## E — Motor solar y corredor direccional

### E1 — Librería solar

**Decisión:** SunCalc (`suncalc` + `@types/suncalc`). Usar `SunCalc.getPosition(date, lat, lon)` que devuelve `{ altitude, azimuth }` en radianes.

**Motivo:** Librería madura (2013), tiny (~3KB), hace exactamente lo necesario sin overhead. Muy usada (>3M descargas/semana). Tipos disponibles vía DefinitelyTyped.

**Conversión necesaria:**
- Altitude: `altitudeDeg = altitude * 180 / Math.PI`
- Azimuth (SunCalc mide desde sur, positivo al oeste): `azimuthNorth = (azimuth * 180 / Math.PI + 180) % 360`

**Descartado:** suncalc3 (más pesada, API diferente, menos popular), cálculo manual (reinventar la rueda con riesgo de bugs).

**Referencia fuente:** mvp.md § Fuentes de datos: "SunCalc es una librería pequeña y suficiente para calcular altitud y azimut solar"

**Impacto:** `src/engines/solar-engine.ts` — función `getSolarPosition(date, lat, lon)` que devuelve `{ altitudeDeg, azimuthNorthDeg }`.

---

### E2 — Definición geométrica del corredor

**Decisión:** Proyectar 3 puntos en línea recta desde el observador en dirección al azimut solar, usando fórmula de destino geodésico (trigonometría esférica). Distancias: 5, 10, 20 km.

**Implementación:**
```typescript
function getCorridorPoints(lat: number, lon: number, azimuthDeg: number): [number, number][] {
  const distances = [5, 10, 20] // km
  return distances.map(d => destinationPoint(lat, lon, d, azimuthDeg))
}

function destinationPoint(lat: number, lon: number, distKm: number, bearingDeg: number): [number, number] {
  const R = 6371
  const d = distKm / R
  const brng = bearingDeg * Math.PI / 180
  const lat1 = lat * Math.PI / 180
  const lon1 = lon * Math.PI / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng))
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI]
}
```

**Motivo:** Trigonometría esférica es precisa a estas distancias (5-20 km, error <1m). No necesita dependencia de geodesia (turf.js, etc.).

**Descartado:** Proyección plana (error crece con latitud), turf.js (dependencia pesada para una sola función), abanico 2D (fase posterior).

**Referencia fuente:** mvp.md § Modelo conceptual: "Muestreo meteorológico en varios puntos del corredor alineado con el azimut solar"

**Impacto:** `src/engines/solar-engine.ts` — función `getCorridorPoints()`. Output alimenta al forecast-provider para batching.

---

### E3 — Resolución del muestreo meteorológico en el corredor

**Decisión:** Cada punto del corredor se consulta directamente a Open-Meteo como coordenada independiente (se incluye en el batch de C5). No hay interpolación entre puntos.

**Cálculo del componente corredor:**
```typescript
corridor_score = cloud_at_5km * 0.70 + cloud_at_10km * 0.20 + cloud_at_20km * 0.10
corridor_component = 1 - (corridor_score / 100)  // invertir: menos nubes = mejor score
```

**Motivo:** Consulta directa es más precisa que interpolar. El coste extra es manejable (3 coords por punto → ya incluido en estimación de C5: ~120 coords catálogo en 3 batches).

**Descartado:** Interpolación entre puntos del grid (pierde precisión), consulta con mayor densidad (>3 puntos innecesario para v1).

**Impacto:** El forecast-provider recibe las coordenadas del corredor como parte del lote general. El score-engine calcula el componente corredor con los pesos definidos en B3.

---

### E4 — Comportamiento cuando altitud solar < 0°

**Decisión:**
- Si altitud solar < 0° → score = 0 para ese punto/instante. No se evalúa meteorología.
- En UI: mostrar indicador "Sol bajo horizonte" en vez de score numérico.
- En modo 72h: solo evaluar horas con altitud > 0° (descartar noche).
- En modo eclipse: evaluar siempre la hora fijada (el eclipse ocurre de día por definición, pero validar igualmente por robustez).

**Motivo:** No tiene sentido evaluar condiciones de observación cuando el Sol no es visible. Ahorra llamadas API innecesarias para horas nocturnas.

**Descartado:** Evaluar todas las horas y mostrar score=0 (desperdicio de API y confuso en UI).

**Referencia fuente:** mvp.md § Modelo conceptual: "penalización adicional cuando la altitud solar sea baja" — extendido lógicamente a "no evaluar si es negativa".

**Impacto:** Filtro previo al scoring en `score-engine.ts`. Timeline en UI solo muestra horas diurnas.
