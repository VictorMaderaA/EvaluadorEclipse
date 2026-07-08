export interface ScoringConfig {
  weights: {
    meteo: number
    layers: number
    corridor: number
    elevation: number
    confidence: number
  }
  cloudPenaltyThreshold: number
  corridorDistancesKm: number[]
  corridorWeights: number[]
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    meteo: 0.30,
    layers: 0.25,
    corridor: 0.25,
    elevation: 0.10,
    confidence: 0.10,
  },
  cloudPenaltyThreshold: 90,
  corridorDistancesKm: [5, 10, 20],
  corridorWeights: [0.70, 0.20, 0.10],
}
