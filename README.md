# Eclipse Viewer

Evaluador de puntos de observación para eclipses solares. Calcula y visualiza la idoneidad de ubicaciones basándose en predicciones meteorológicas, posición solar, corredor direccional y elevación.

## Características

- **Mapa interactivo** con heatmap de scoring por celdas (MapLibre GL JS)
- **Ranking de puntos** ordenado por score con ficha detallada
- **Score híbrido** (aditivo + penalización) con 5 componentes: nubosidad, capas, corredor solar, elevación, confianza
- **Dos modos temporales**: próximas 72h y modo eclipse (ventana configurable)
- **Click-to-evaluate**: click en cualquier punto del mapa para evaluación instantánea
- **Puntos custom**: guarda tus propios puntos de observación en localStorage
- **Explicabilidad**: texto explicativo algorítmico + desglose visual por componente
- **Sin backend**: SPA pura que consume APIs públicas directamente

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 6 |
| Mapa | MapLibre GL JS + react-map-gl |
| Estilos | Tailwind CSS v4 |
| Gráficos | Recharts v3 |
| Solar | SunCalc |
| APIs | Open-Meteo (forecast + elevation) |
| Deploy | Docker (nginx) |

## Requisitos

- Node.js ≥ 18
- npm ≥ 9
- Docker (para producción)

## Desarrollo local

```bash
# Clonar
git clone git@github.com:VictorMaderaA/EvaluadorEclipse.git
cd EvaluadorEclipse

# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Preview del build de producción |
| `npm run test` | Ejecutar tests una vez |
| `npm run test:watch` | Tests en modo watch |

## Producción (Docker)

### Build y deploy manual

```bash
# Construir imagen y levantar contenedor en puerto 8080
./deploy.sh
```

El script hace:
1. `docker build` — imagen multi-stage (node build + nginx serve)
2. Stop/remove del contenedor anterior (si existe)
3. `docker run` en puerto 8080 con restart automático

### Verificar que funciona

```bash
curl http://localhost:8080
```

### Detener

```bash
docker stop eclipse-viewer
```

### Configuración del puerto

El contenedor expone el puerto 80 internamente. El mapping por defecto es `8080:80`. Para cambiar el puerto externo, editar `deploy.sh`:

```bash
-p <tu-puerto>:80
```

### Cloudflare Tunnel

La app está diseñada para exponerse vía Cloudflare Tunnel. Configura el tunnel para apuntar a `http://localhost:8080` desde tu dashboard de Cloudflare.

## Arquitectura

```
src/
├── engines/          Motor de cálculo
│   ├── solar-engine.ts      Posición solar + corredor geodésico
│   ├── score-engine.ts      Scoring híbrido (5 componentes + penalties)
│   ├── grid-engine.ts       Grid de celdas + GeoJSON
│   └── explanation-engine.ts Templates de explicación
├── providers/        Acceso a datos externos
│   ├── forecast-provider.ts  Open-Meteo forecast (batching + cache)
│   ├── forecast-cache.ts     Cache 2 niveles (memoria 1h + localStorage 5min)
│   └── elevation-provider.ts Open-Meteo elevation
├── data/             Datos y persistencia
│   ├── points-catalog.json   Catálogo base (8 puntos España)
│   ├── points-store.ts       CRUD catálogo + custom
│   └── last-scores-store.ts  Últimos scores (tendencia)
├── config/           Configuración tipada
│   ├── types.ts              Interfaces compartidas
│   ├── scoring-config.ts     Pesos y parámetros del scoring
│   └── eclipse-config.ts     Config temporal + persistencia
├── hooks/            React hooks
│   └── useScoring.ts         Orquestador principal
├── views/            Vistas principales
│   ├── MapView.tsx           Mapa + heatmap + marcadores + popup
│   └── Sidebar.tsx           Container responsive
├── components/       Componentes UI
│   ├── RankingList.tsx       Lista ordenada por score
│   ├── PointCard.tsx         Card en ranking
│   ├── PointDetail.tsx       Ficha detallada
│   ├── ModeSelector.tsx      Toggle 72h/eclipse
│   ├── TimeSlider.tsx        Navegación temporal
│   ├── TimelineChart.tsx     Gráfico evolución (Recharts)
│   ├── TrendIndicator.tsx    ▲/▼/= de tendencia
│   ├── LoadingOverlay.tsx    Spinner de carga
│   └── Disclaimer.tsx        Aviso informativo
└── App.tsx           Composición principal
```

## Modelo de scoring

Score híbrido con base aditiva ponderada + penalización multiplicativa:

```
score_raw = meteo(30%) + capas(25%) + corredor(25%) + elevación(10%) + confianza(10%)
penalty = cloud_penalty × solar_penalty
score_final = score_raw × penalty × 100
```

| Componente | Peso | Fuente |
|------------|------|--------|
| Nubosidad total | 30% | Open-Meteo `cloud_cover` |
| Capas (low/mid/high) | 25% | Open-Meteo por capas |
| Corredor solar | 25% | 3 puntos a 5/10/20km hacia el Sol |
| Elevación | 10% | Open-Meteo Elevation API |
| Confianza | 10% | Diff entre modelos best_match vs icon_eu |

### Penalizaciones

- **Cloud penalty**: si `cloud_cover > 90%` → reduce score proporcionalmente hasta 0
- **Solar penalty**: si altitud solar < 30° → reduce gradualmente; < 0° → score = 0

## APIs utilizadas

| API | Uso | Auth |
|-----|-----|------|
| [Open-Meteo Forecast](https://open-meteo.com/en/docs) | Datos meteorológicos horarios | No requiere key |
| [Open-Meteo Elevation](https://open-meteo.com/en/docs/elevation-api) | Elevación del terreno | No requiere key |
| [OpenFreeMap](https://openfreemap.org) | Tiles del mapa base | No requiere key |

## Tests

```bash
npm run test
```

98 tests unitarios cubriendo:
- Forecast provider (batching, cache, retry)
- Solar engine (posición, corredor, penalty)
- Elevation provider (API, score curve)
- Score engine (componentes, scoring completo, penalties)
- Grid engine (generación, evaluación, GeoJSON)
- Points store (CRUD, persistencia)

## Configuración compartible

La app soporta URL params para compartir configuración del modo eclipse:

```
https://tu-dominio.com/?mode=eclipse&date=2027-08-02&time=10:30
```

## Licencia

MIT

## Documentación adicional

- `docs/analysis/` — Análisis de requisitos completo (48 decisiones documentadas)
- `docs/plans/` — Planes de implementación por issue (PLAN-001 a PLAN-012)
