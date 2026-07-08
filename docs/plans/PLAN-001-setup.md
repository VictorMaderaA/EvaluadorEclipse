# Plan: Setup del proyecto

> Issue: [#1 — Setup del proyecto: Vite + React + TypeScript + Tailwind + MapLibre](https://github.com/VictorMaderaA/EvaluadorEclipse/issues/1)
> Análisis: [decisiones-analisis.md § A](docs/analysis/decisiones-analisis.md), [§ J2](docs/analysis/decisiones-analisis.md)
> Estado: ✅ Completado

---

## Estado de progreso

| Fase | Estado | Fecha | Commit |
|------|--------|-------|--------|
| 1 | ✅ Completada | 2026-07-08 | c62cadd |
| 2 | ✅ Completada | 2026-07-08 | c62cadd |
| 3 | ✅ Completada | 2026-07-08 | c62cadd |
| 4 | ✅ Completada | 2026-07-08 | c62cadd |
| 5 | ✅ Completada | 2026-07-08 | c62cadd |

---

## Fase 1 — Scaffolding con Vite y dependencias

**Objetivo:** Proyecto funcional con todas las dependencias instaladas y configuración base lista.

**Archivos a crear/modificar:**
- `package.json` — dependencias con versiones pineadas
- `tsconfig.json` — config TypeScript para React + Vite
- `tsconfig.node.json` — config para archivos de config de Vite
- `vite.config.ts` — configuración de Vite
- `index.html` — entry point HTML
- `.gitignore` — exclusiones estándar para Node/Vite

**Pasos concretos:**

1. Ejecutar `npm create vite@latest . -- --template react-ts` en el directorio del proyecto (o scaffolding manual si ya hay archivos).
   - **Resultado esperado:** package.json + vite.config.ts + tsconfig.json generados.
   - **Nota:** Ya existen `mvp.md` y `docs/` → el scaffold debe convivir con ellos.

2. Instalar dependencias de producción con versiones pineadas:
   ```bash
   npm install react@18.3.1 react-dom@18.3.1 react-map-gl@8.1.1 maplibre-gl@4.7.1 suncalc@1.9.0 recharts@2.15.3
   ```
   - **Resultado esperado:** `node_modules` creado, `package-lock.json` generado.

3. Instalar dependencias de desarrollo:
   ```bash
   npm install -D typescript@5.7.3 @types/react@18.3.18 @types/react-dom@18.3.5 @types/suncalc@1.8.3 @vitejs/plugin-react@4.3.4 tailwindcss@4.1.8 @tailwindcss/vite@4.1.8
   ```

4. Configurar `vite.config.ts`:
   ```typescript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   import tailwindcss from '@tailwindcss/vite'

   export default defineConfig({
     plugins: [react(), tailwindcss()],
   })
   ```

5. Configurar `tsconfig.json` con:
   - `strict: true`
   - `target: "ES2020"`
   - `module: "ESNext"`
   - `moduleResolution: "bundler"`
   - `jsx: "react-jsx"`
   - `paths` si se quiere alias `@/`

6. Crear `src/index.css` con import de Tailwind v4:
   ```css
   @import "tailwindcss";
   ```

7. Configurar script de build en package.json:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "tsc --noEmit && vite build",
     "preview": "vite preview"
   }
   ```

**Fuera de alcance:** No se configura ESLint ni Prettier en esta fase (no es un entregable de la issue).

**Validación:**
- [ ] `npm run dev` arranca sin errores (puerto 5173)
- [ ] `npm run build` ejecuta tsc + vite build sin errores y produce `dist/`
- [ ] Las dependencias en package.json tienen versiones exactas (no rangos abiertos)

---

## Fase 2 — Estructura de carpetas y barrel exports

**Objetivo:** Crear la estructura de módulos definida en la decisión A5. Cada carpeta tiene un `index.ts` barrel y opcionalmente un archivo placeholder.

**Archivos a crear:**
```
src/
  engines/
    index.ts
  providers/
    index.ts
  data/
    index.ts
  views/
    index.ts
  components/
    index.ts
  config/
    index.ts
    types.ts        ← interfaces compartidas (ObservationPoint, ForecastData, ScoreResult, etc.)
    scoring-config.ts ← ScoringConfig con defaults (placeholder)
    eclipse-config.ts ← EclipseConfig con defaults (placeholder)
```

**Pasos concretos:**

1. Crear directorios: `src/engines`, `src/providers`, `src/data`, `src/views`, `src/components`, `src/config`.

2. Crear `src/config/types.ts` con las interfaces principales definidas como stubs:
   ```typescript
   export interface ObservationPoint {
     id: string
     name: string
     region: string
     coordinates: { lat: number; lon: number }
     elevation: number
     source: 'catalog' | 'custom'
     metadata?: Record<string, unknown>
     tags?: string[]
   }

   export interface ForecastData {
     cloudCover: number
     cloudCoverLow: number
     cloudCoverMid: number
     cloudCoverHigh: number
     visibility: number
     time: string
   }

   export interface ScoreResult {
     total: number
     components: {
       meteo: number
       layers: number
       corridor: number
       elevation: number
       confidence: number
     }
     penalty: number
     explanation: string
   }
   ```

3. Crear `src/config/scoring-config.ts` con la interface y defaults:
   ```typescript
   export interface ScoringConfig {
     weights: {
       meteo: number       // 0.30
       layers: number      // 0.25
       corridor: number    // 0.25
       elevation: number   // 0.10
       confidence: number  // 0.10
     }
     cloudPenaltyThreshold: number  // 90
     corridorDistancesKm: number[]  // [5, 10, 20]
     corridorWeights: number[]      // [0.70, 0.20, 0.10]
   }

   export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
     weights: { meteo: 0.30, layers: 0.25, corridor: 0.25, elevation: 0.10, confidence: 0.10 },
     cloudPenaltyThreshold: 90,
     corridorDistancesKm: [5, 10, 20],
     corridorWeights: [0.70, 0.20, 0.10],
   }
   ```

4. Crear `src/config/eclipse-config.ts` placeholder:
   ```typescript
   export interface EclipseConfig {
     mode: '72h' | 'eclipse'
     eclipseDate: string      // ISO date
     eclipseTime: string      // HH:mm
     windowBefore: number     // minutos (default 60)
     windowAfter: number      // minutos (default 15)
   }
   ```

5. Crear barrel `index.ts` en cada carpeta con export vacío o re-export de lo que exista.

**Fuera de alcance:** No se implementa lógica de negocio. Solo estructura y tipos.

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run build` sigue pasando (los tipos compilan sin error)
- [ ] Importar `import { ObservationPoint } from './config/types'` funciona desde `src/App.tsx`

---

## Fase 3 — App mínima con mapa MapLibre

**Objetivo:** Renderizar un mapa MapLibre funcional como smoke test visual. Confirma que react-map-gl + maplibre-gl + tiles gratuitas funcionan correctamente juntos.

**Archivos a crear/modificar:**
- `src/App.tsx` — componente raíz con mapa
- `src/main.tsx` — entry point (ya creado por scaffold, ajustar si es necesario)
- `src/App.css` — eliminar estilos por defecto de Vite, mapa fullscreen

**Pasos concretos:**

1. Reemplazar `src/App.tsx` con un componente que renderiza MapLibre:
   ```tsx
   import Map from 'react-map-gl/maplibre'
   import 'maplibre-gl/dist/maplibre-gl.css'

   function App() {
     return (
       <div className="h-screen w-screen">
         <Map
           initialViewState={{
             latitude: 40.4168,   // Madrid (centro de España)
             longitude: -3.7038,
             zoom: 6,
           }}
           style={{ width: '100%', height: '100%' }}
           mapStyle="https://tiles.openfreemap.org/styles/liberty"
         />
       </div>
     )
   }

   export default App
   ```

2. Actualizar `src/main.tsx` para importar `./index.css`.

3. Limpiar archivos generados por el scaffold que no se necesitan (`src/App.css` por defecto, `src/assets/react.svg`, etc.).

4. Verificar que el mapa se renderiza en el browser.

**Fuera de alcance:** No se añaden capas, marcadores ni interactividad. Solo mapa base.

**Dependencias:** Fase 1

**Validación:**
- [ ] `npm run dev` → abrir browser → mapa de España visible con tiles cargando
- [ ] No hay errores en la consola del browser
- [ ] El mapa es interactivo (pan/zoom funcionan)

---

## Fase 4 — Dockerfile + nginx.conf + deploy.sh

**Objetivo:** Infraestructura de deployment lista para usar. El Dockerfile construye la app y la sirve con Nginx.

**Archivos a crear:**
- `Dockerfile` — multi-stage build (node + nginx)
- `nginx.conf` — configuración para SPA con try_files
- `deploy.sh` — script de deployment manual
- `.dockerignore` — excluir node_modules, .git, etc.

**Pasos concretos:**

1. Crear `Dockerfile`:
   ```dockerfile
   # Build stage
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   # Production stage
   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   ```

2. Crear `nginx.conf`:
   ```nginx
   server {
       listen 80;
       root /usr/share/nginx/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. Crear `deploy.sh`:
   ```bash
   #!/bin/bash
   set -e

   echo "🔨 Building Docker image..."
   docker build -t eclipse-viewer:latest .

   echo "🔄 Stopping old container..."
   docker stop eclipse-viewer 2>/dev/null || true
   docker rm eclipse-viewer 2>/dev/null || true

   echo "🚀 Starting new container..."
   docker run -d \
     --name eclipse-viewer \
     --restart unless-stopped \
     -p 8080:80 \
     eclipse-viewer:latest

   echo "✅ Deployed successfully"
   ```

4. Crear `.dockerignore`:
   ```
   node_modules
   dist
   .git
   docs
   *.md
   ```

5. Hacer `deploy.sh` ejecutable: `chmod +x deploy.sh`

**Fuera de alcance:** No se ejecuta el deploy real al servidor. Solo se verifica que la imagen construye.

**Dependencias:** Fases 1, 3 (necesita que el build funcione y haya algo que servir)

**Validación:**
- [ ] `docker build -t eclipse-viewer:latest .` completa sin errores
- [ ] `docker run --rm -p 8080:80 eclipse-viewer:latest` sirve la app en `http://localhost:8080`
- [ ] Navegar a `http://localhost:8080/ruta-inexistente` devuelve `index.html` (SPA fallback)

---

## Fase 5 — Verificación final y commit

**Objetivo:** Confirmar que todos los criterios de aceptación de la issue se cumplen, limpiar archivos temporales y hacer commit.

**Pasos concretos:**

1. Ejecutar `npm run dev` → verificar mapa funcional.
2. Ejecutar `npm run build` → verificar que `dist/` se genera sin errores.
3. Ejecutar `docker build -t eclipse-viewer:latest .` → verificar build Docker.
4. Verificar estructura de carpetas completa:
   ```
   src/engines/index.ts ✓
   src/providers/index.ts ✓
   src/data/index.ts ✓
   src/views/index.ts ✓
   src/components/index.ts ✓
   src/config/index.ts ✓
   src/config/types.ts ✓
   src/config/scoring-config.ts ✓
   src/config/eclipse-config.ts ✓
   ```
5. Asegurar que `.gitignore` incluye `node_modules/`, `dist/`, `.env`.
6. Commit: `feat: setup proyecto — Vite+React+TS+Tailwind+MapLibre+Docker`
7. Push a branch `feat/setup-proyecto` (o main si el usuario lo prefiere).

**Dependencias:** Todas las fases anteriores.

**Validación (criterios de aceptación de la issue):**
- [ ] `npm run dev` arranca sin errores y muestra mapa
- [ ] `npm run build` produce `dist/` válido
- [ ] `docker build` construye imagen exitosamente
- [ ] Estructura de carpetas existe con archivos barrel/placeholder

---

## Gaps y notas

1. **Tiles provider:** Se usa OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`). Si no funciona en el momento de implementar → alternativa: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (CartoDB gratuito).

2. **Versiones de dependencias:** Las versiones listadas son las últimas estables a julio 2026. Si npm no las resuelve exactamente, usar la última minor disponible de la misma major.

3. **Tailwind v4:** Usa el plugin `@tailwindcss/vite` nativo (sin PostCSS config ni `tailwind.config.js`). La configuración de tokens se hace en CSS con `@theme` si es necesario en issues posteriores.

4. **Node version:** El Dockerfile usa `node:20-alpine`. Localmente se asume Node 20+ disponible.
