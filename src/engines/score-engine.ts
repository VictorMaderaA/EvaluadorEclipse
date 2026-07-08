import type { ForecastData, ScoreResult } from '../config/types'
import type { ScoringConfig } from '../config/scoring-config'
import { DEFAULT_SCORING_CONFIG } from '../config/scoring-config'
import { elevationScore } from '../providers/elevation-provider'
import { getAltitudePenalty } from './solar-engine'
import { generateExplanation } from './explanation-engine'

/**
 * Componente meteo: inversión de nubosidad total.
 * Cielo despejado (0%) → 1.0, totalmente cubierto (100%) → 0.0
 */
export function calcMeteoComponent(forecast: ForecastData): number {
  return 1 - forecast.cloudCover / 100
}

/**
 * Componente capas: ponderación por nivel de obstrucción visual.
 * Nubes bajas (50%) pesan más que medias (30%) y altas (20%).
 */
export function calcLayersComponent(forecast: ForecastData): number {
  const weighted =
    forecast.cloudCoverLow * 0.5 +
    forecast.cloudCoverMid * 0.3 +
    forecast.cloudCoverHigh * 0.2
  return 1 - weighted / 100
}

/**
 * Componente corredor: media ponderada de nubosidad en puntos del corredor.
 * Pesos por defecto: 70% (5km), 20% (10km), 10% (20km).
 */
export function calcCorridorComponent(
  corridorForecasts: ForecastData[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  if (corridorForecasts.length === 0) return 1.0

  let weightedCloud = 0
  const weights = config.corridorWeights

  for (let i = 0; i < corridorForecasts.length && i < weights.length; i++) {
    weightedCloud += corridorForecasts[i]!.cloudCover * weights[i]!
  }

  return 1 - weightedCloud / 100
}

/**
 * Componente confianza: concordancia entre modelos meteorológicos.
 * Diff en cloudCover: <15% → 1.0 (alta confianza), >40% → 0.3 (baja), lineal entre medias.
 */
export function calcConfidenceComponent(
  primaryCloudCover: number,
  secondaryCloudCover: number,
): number {
  const diff = Math.abs(primaryCloudCover - secondaryCloudCover)

  if (diff <= 15) return 1.0
  if (diff >= 40) return 0.3

  // Interpolación lineal: 15→1.0, 40→0.3
  return 1.0 - ((diff - 15) / (40 - 15)) * 0.7
}

// Re-exports para acceso externo
export { elevationScore, getAltitudePenalty }

/**
 * Calcula el score completo para un punto de observación (con corredor).
 * Combina 5 componentes + penalties por nubosidad extrema y altitud solar.
 *
 * @returns ScoreResult con total 0-100, componentes 0-1, penalty 0-1, explanation vacía
 */
export function calculateScore(
  forecast: ForecastData,
  corridorForecasts: ForecastData[],
  elevation: number,
  primaryCloudCover: number,
  secondaryCloudCover: number,
  solarAltitudeDeg: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoreResult {
  const components = {
    meteo: calcMeteoComponent(forecast),
    layers: calcLayersComponent(forecast),
    corridor: calcCorridorComponent(corridorForecasts, config),
    elevation: elevationScore(elevation),
    confidence: calcConfidenceComponent(primaryCloudCover, secondaryCloudCover),
  }

  const { weights } = config
  const scoreRaw =
    components.meteo * weights.meteo +
    components.layers * weights.layers +
    components.corridor * weights.corridor +
    components.elevation * weights.elevation +
    components.confidence * weights.confidence

  // Penalty nubosidad extrema (B1)
  const threshold = config.cloudPenaltyThreshold
  const cloudPenalty =
    forecast.cloudCover > threshold
      ? Math.max(0, 1 - (forecast.cloudCover - threshold) / (100 - threshold))
      : 1.0

  // Penalty altitud solar (B4)
  const solarPenalty = getAltitudePenalty(solarAltitudeDeg)

  const totalPenalty = cloudPenalty * solarPenalty
  const scoreFinal = scoreRaw * totalPenalty

  return {
    total: Math.round(scoreFinal * 100),
    components,
    penalty: totalPenalty,
    explanation: generateExplanation(components, totalPenalty),
  }
}

/**
 * Calcula score simplificado para celdas del grid (sin corredor).
 * Redistribuye el peso del corredor proporcionalmente entre los otros 4 componentes.
 */
export function calculateSimplifiedScore(
  forecast: ForecastData,
  elevation: number,
  primaryCloudCover: number,
  secondaryCloudCover: number,
  solarAltitudeDeg: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoreResult {
  const components = {
    meteo: calcMeteoComponent(forecast),
    layers: calcLayersComponent(forecast),
    corridor: 0, // no evaluado en grid
    elevation: elevationScore(elevation),
    confidence: calcConfidenceComponent(primaryCloudCover, secondaryCloudCover),
  }

  // Redistribuir peso del corredor proporcionalmente
  const { weights } = config
  const totalWithoutCorridor = weights.meteo + weights.layers + weights.elevation + weights.confidence
  const redistFactor = 1 / totalWithoutCorridor

  const scoreRaw =
    components.meteo * weights.meteo * redistFactor +
    components.layers * weights.layers * redistFactor +
    components.elevation * weights.elevation * redistFactor +
    components.confidence * weights.confidence * redistFactor

  // Penalties (misma lógica)
  const threshold = config.cloudPenaltyThreshold
  const cloudPenalty =
    forecast.cloudCover > threshold
      ? Math.max(0, 1 - (forecast.cloudCover - threshold) / (100 - threshold))
      : 1.0

  const solarPenalty = getAltitudePenalty(solarAltitudeDeg)
  const totalPenalty = cloudPenalty * solarPenalty
  const scoreFinal = scoreRaw * totalPenalty

  return {
    total: Math.round(scoreFinal * 100),
    components,
    penalty: totalPenalty,
    explanation: generateExplanation(components, totalPenalty),
  }
}
