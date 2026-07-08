# Checklist de Análisis — Eclipse MVP

> Última actualización: 2026-07-08

## Flujo de trabajo por sección

Para cada sección se sigue un ciclo iterativo:
1. Presentar contexto del documento fuente + contexto técnico verificado
2. Identificar opciones con pros/contras y recomendación
3. Formular dudas concretas del agente + preguntar al usuario
4. Iterar si hay nuevas dudas (máx 5 ciclos)
5. Documentar decisión en `decisiones-analisis.md`
6. Actualizar estado aquí
7. Commit checkpoint

## Contexto para retomar

| Dato | Valor |
|------|-------|
| Última sección completada | E (Motor solar y corredor direccional) |
| Siguiente sección | F (Elevación y relieve) |
| Commit más reciente | d1af441 docs(análisis): sección D completada |
| Decisiones que condicionan secciones restantes | TypeScript+React+Vite+MapLibre, SPA pura, SunCalc para posición solar, corredor 3 puntos geodésicos, cache 2 niveles (mem 1h + localStorage 5min), grid sin corredor |

### Archivos explorados

| Path | Relevancia | Sección |
|------|-----------|---------|
| `/home/develop/projects/eclipse/mvp.md` | Documento fuente completo del MVP | Todas |
| `https://open-meteo.com/en/docs` | API docs: variables, modelos, batching, params | C |

## Leyenda

⬜ Pendiente · 🔄 En discusión / aparcado · ✅ Resuelto · ❌ Descartado

---

## Sección A — Stack técnico y arquitectura [media]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| A1 | Lenguaje principal (TypeScript vs JavaScript vs otro) | ✅ | TypeScript |
| A2 | Framework frontend (React, Vue, Svelte, vanilla) | ✅ | React |
| A3 | Capa de servicios (backend separado vs serverless vs solo frontend) | ✅ | SPA pura, API keys en localStorage |
| A4 | Bundler/tooling (Vite, Next, Astro, etc.) | ✅ | Vite |
| A5 | Monorepo vs single-app | ✅ | Single-app con módulos por carpeta |
| A6 | Librería de mapas (Leaflet, MapLibre, Mapbox GL) | ✅ | MapLibre GL JS + react-map-gl, tiles gratuitas |

## Sección B — Modelo de scoring v1 [compleja]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| B1 | Fórmula base: aditiva ponderada vs multiplicativa vs híbrida | ✅ | Híbrido: aditivo + penalización multiplicativa si cloud>90% |
| B2 | Pesos iniciales y justificación | ✅ | 30/25/25/10/10 |
| B3 | Definición del corredor direccional (longitud, ancho, puntos de muestreo) | ✅ | 20km, 3 puntos, línea recta, peso 70/20/10 |
| B4 | Penalización por altitud solar baja: umbral y curva | ✅ | Lineal 10-30°, fuerte <10°, cero si <0° |
| B5 | Normalización de componentes (0-100 vs 0-1 vs otro rango) | ✅ | 0-1 interno, 0-100 para usuario |
| B6 | Integración de confianza del modelo (ensemble) | ✅ | Comparación 2 modelos, diff cloud_cover como proxy |
| B7 | Parametrización y configuración de pesos en runtime | ✅ | ScoringConfig tipado, archivo dedicado |
| B8 | Definición del grid para heatmap: resolución de celda, área de cobertura, relación con catálogo | ✅ | 10km×10km, franja eclipse, score simplificado sin corredor |

## Sección C — Integración meteorológica (Open-Meteo) [media]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| C1 | Modelo(s) meteorológico(s) a utilizar (ICON, GFS, ECMWF, etc.) | ✅ | best_match (principal) + icon_eu (secundario para confianza) |
| C2 | Variables exactas a consultar | ✅ | cloud_cover, cloud_cover_low/mid/high, visibility |
| C3 | Estrategia de cache y refresco | ✅ | 2 niveles: memoria TTL 1h + localStorage TTL 5min |
| C4 | Manejo de errores y fallback entre modelos | ✅ | Retry 1x, sin fallback, confianza=0.5 si falla secundario |
| C5 | Rate limiting y batching de peticiones | ✅ | Batch 50 coords/llamada, ~14 HTTP por refresco, throttle 200ms |

## Sección D — Catálogo de puntos [simple]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| D1 | Formato del catálogo (JSON, YAML, otro) | ✅ | JSON base + puntos custom en localStorage, merge en runtime |
| D2 | Campos obligatorios y opcionales por punto | ✅ | id, name, region, coords, elevation, source + metadata/tags opcionales |
| D3 | Puntos iniciales: criterios de selección y regiones | ✅ | Elevación >800m, horizonte despejado, diversidad geográfica, franja eclipse |
| D4 | Cantidad objetivo de puntos para el MVP | ✅ | 20-30 base, sin límite para custom |

## Sección E — Motor solar y corredor direccional [media]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| E1 | Librería solar: SunCalc vs alternativas | ✅ | SunCalc (mourner/suncalc) + @types/suncalc |
| E2 | Definición geométrica del corredor (longitud km, ancho, nº puntos) | ✅ | Fórmula destino geodésico, 3 puntos a 5/10/20km en azimut solar |
| E3 | Resolución del muestreo meteorológico en el corredor | ✅ | Consulta directa por coord, score ponderado 70/20/10 |
| E4 | Comportamiento cuando altitud solar < 0 (pre-amanecer / post-atardecer) | ✅ | Score=0, indicador UI, no evaluar horas nocturnas en 72h |

## Sección F — Elevación y relieve [simple]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| F1 | API de elevación: Open-Meteo Elevation vs alternativas | ⬜ | mvp.md recomienda Open-Meteo |
| F2 | Cómo influye la elevación en el score | ⬜ | mvp.md: 10% peso |
| F3 | Indicador de horizonte orográfico: alcance MVP vs fase posterior | ⬜ | mvp.md: "si se implementa" |

## Sección G — UX y vistas del MVP [media]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| G1 | Layout general: sidebar + mapa vs tabs vs otra disposición | ⬜ | mvp.md: "ranking lateral o inferior" |
| G2 | Responsive / mobile-first vs desktop-first | ⬜ | — |
| G3 | Ficha de punto: qué datos mostrar y en qué orden | ⬜ | mvp.md lista elementos |
| G4 | Librería de componentes UI (Tailwind, Material, custom) | ⬜ | — |
| G5 | Gráficos de evolución temporal (librería de charts) | ⬜ | — |
| G6 | Capa visual de nubosidad sobre el mapa (tipo radar meteorológico) | ⬜ | Fase posterior. Visualizar nubes por capas sobre relieve para entender bloqueos |

## Sección H — Modos temporales (72h vs eclipse) [media]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| H1 | UX del cambio de modo: toggle, selector, detección automática | ⬜ | — |
| H2 | Ventana de análisis en modo eclipse: configuración por defecto | ⬜ | mvp.md: "-60 min a +15 min" |
| H3 | Comparativa entre actualizaciones del forecast | ⬜ | mvp.md: mencionado |
| H4 | Persistencia de la fecha/hora fijada (localStorage, URL params) | ⬜ | — |

## Sección I — Explicabilidad y comunicación del score [simple]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| I1 | Formato del resumen textual por punto | ⬜ | mvp.md: "motivo resumido" |
| I2 | Nivel de detalle del desglose (componentes visibles vs ocultos) | ⬜ | — |
| I3 | Tono y lenguaje (técnico vs divulgativo) | ⬜ | — |

## Sección J — Estrategia de deployment y operación [simple]

| # | Punto | Estado | Notas |
|---|-------|--------|-------|
| J1 | Plataforma de hosting (Vercel, Netlify, Cloudflare Pages, S3+CF) | ⬜ | — |
| J2 | CI/CD mínimo | ⬜ | — |
| J3 | Dominio y coste operativo | ⬜ | — |
| J4 | Monitorización básica y alertas | ⬜ | — |

---

## Resumen de progreso

| Sección | Total | Resueltos | Pendientes | Estado |
|---------|-------|-----------|------------|--------|
| A — Stack técnico | 6 | 6 | 0 | ✅ |
| B — Scoring v1 | 8 | 8 | 0 | ✅ |
| C — Meteorología | 5 | 5 | 0 | ✅ |
| D — Catálogo puntos | 4 | 4 | 0 | ✅ |
| E — Motor solar | 4 | 4 | 0 | ✅ |
| F — Elevación | 3 | 0 | 3 | ⬜ |
| G — UX y vistas | 6 | 0 | 6 | ⬜ |
| H — Modos temporales | 4 | 0 | 4 | ⬜ |
| I — Explicabilidad | 3 | 0 | 3 | ⬜ |
| J — Deployment | 4 | 0 | 4 | ⬜ |
| **Total** | **47** | **27** | **20** | — |
