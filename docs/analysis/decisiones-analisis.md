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
