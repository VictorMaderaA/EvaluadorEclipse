import type { ScoreResult } from '../config/types'

/**
 * Genera una explicación textual (1-2 frases) basada en los componentes del score.
 * Primera frase: factor dominante. Segunda frase: matiz o factor secundario.
 */
export function generateExplanation(
  components: ScoreResult['components'],
  penalty: number,
): string {
  const phrases: string[] = []

  // Factor dominante (mejor o peor componente)
  const dominant = getDominantFactor(components)
  phrases.push(dominant)

  // Factor secundario o matiz
  const secondary = getSecondaryFactor(components, penalty)
  if (secondary) {
    phrases.push(secondary)
  }

  return phrases.join(' ')
}

function getDominantFactor(components: ScoreResult['components']): string {
  // Encontrar el peor componente (más limitante)
  const entries = [
    { key: 'meteo', value: components.meteo, label: 'nubosidad' },
    { key: 'layers', value: components.layers, label: 'capas de nubes' },
    { key: 'corridor', value: components.corridor, label: 'corredor solar' },
    { key: 'elevation', value: components.elevation, label: 'elevación' },
    { key: 'confidence', value: components.confidence, label: 'confianza' },
  ] as const

  // Si corredor es 0 (grid simplified), excluirlo
  const active = entries.filter(e => e.key !== 'corridor' || e.value > 0)

  const worst = active.reduce((min, e) => (e.value < min.value ? e : min), active[0]!)
  const best = active.reduce((max, e) => (e.value > max.value ? e : max), active[0]!)

  // Si el peor es muy malo (<0.4), hablar de él
  if (worst.value < 0.4) {
    switch (worst.key) {
      case 'meteo':
        return 'Nubosidad elevada prevista en el punto de observación.'
      case 'layers':
        return 'Nubes bajas o medias previstas que pueden obstruir la visión.'
      case 'corridor':
        return 'Nubes previstas en la dirección del Sol.'
      case 'confidence':
        return 'Baja concordancia entre modelos; predicción incierta.'
      case 'elevation':
        return 'Altitud baja del punto aumenta riesgo de nubes bajas y niebla.'
    }
  }

  // Si el mejor es muy bueno (>0.8), destacarlo
  if (best.value > 0.8) {
    switch (best.key) {
      case 'meteo':
        return 'Cielo despejado previsto en el punto de observación.'
      case 'layers':
        return 'Ausencia de nubes en todas las capas atmosféricas.'
      case 'corridor':
        return 'Corredor despejado en la dirección del Sol.'
      case 'confidence':
        return 'Alta concordancia entre modelos meteorológicos.'
      case 'elevation':
        return 'Buena altitud del punto reduce riesgo de nubes bajas.'
    }
  }

  // Caso neutro
  return 'Condiciones moderadas previstas para la observación.'
}

function getSecondaryFactor(
  components: ScoreResult['components'],
  penalty: number,
): string | null {
  // Si hay penalty activa, mencionarla
  if (penalty < 0.9) {
    return 'Penalización aplicada por nubosidad extrema o sol bajo.'
  }

  // Si la confianza es baja pero no dominante, mencionarla
  if (components.confidence < 0.5 && components.meteo > 0.4) {
    return 'Predicción con incertidumbre moderada entre modelos.'
  }

  // Si la elevación es un factor positivo notable
  if (components.elevation > 0.8 && components.meteo < 0.7) {
    return 'La elevación del punto compensa parcialmente la nubosidad.'
  }

  // Si el corredor es bueno pero el punto no tanto
  if (components.corridor > 0.8 && components.meteo < 0.6) {
    return 'El corredor hacia el Sol está más despejado que el punto.'
  }

  return null
}
