import { describe, it, expect } from 'vitest'
import {
  calcMeteoComponent,
  calcLayersComponent,
  calcCorridorComponent,
  calcConfidenceComponent,
  calculateScore,
  calculateSimplifiedScore,
} from '../score-engine'
import type { ForecastData } from '../../config/types'
import { DEFAULT_SCORING_CONFIG } from '../../config/scoring-config'

const clearForecast: ForecastData = {
  cloudCover: 0,
  cloudCoverLow: 0,
  cloudCoverMid: 0,
  cloudCoverHigh: 0,
  visibility: 50000,
  time: '2026-07-08T12:00',
}

const overcastForecast: ForecastData = {
  cloudCover: 100,
  cloudCoverLow: 80,
  cloudCoverMid: 60,
  cloudCoverHigh: 40,
  visibility: 5000,
  time: '2026-07-08T12:00',
}

describe('calcMeteoComponent', () => {
  it('returns 1.0 for clear sky', () => {
    expect(calcMeteoComponent(clearForecast)).toBe(1.0)
  })

  it('returns 0.0 for fully overcast', () => {
    expect(calcMeteoComponent(overcastForecast)).toBe(0.0)
  })

  it('returns 0.5 for 50% cloud cover', () => {
    expect(calcMeteoComponent({ ...clearForecast, cloudCover: 50 })).toBe(0.5)
  })
})

describe('calcLayersComponent', () => {
  it('returns 1.0 for no clouds in any layer', () => {
    expect(calcLayersComponent(clearForecast)).toBe(1.0)
  })

  it('weights low clouds more heavily', () => {
    const lowOnly: ForecastData = { ...clearForecast, cloudCoverLow: 100, cloudCoverMid: 0, cloudCoverHigh: 0 }
    const highOnly: ForecastData = { ...clearForecast, cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 100 }

    const scoreLow = calcLayersComponent(lowOnly)
    const scoreHigh = calcLayersComponent(highOnly)

    // Low clouds penalize more
    expect(scoreLow).toBeLessThan(scoreHigh)
  })
})

describe('calcCorridorComponent', () => {
  it('returns 1.0 for empty corridor', () => {
    expect(calcCorridorComponent([])).toBe(1.0)
  })

  it('returns 1.0 for clear corridor', () => {
    const corridor = [clearForecast, clearForecast, clearForecast]
    expect(calcCorridorComponent(corridor)).toBe(1.0)
  })

  it('returns 0.0 for fully overcast corridor', () => {
    const corridor = [overcastForecast, overcastForecast, overcastForecast]
    expect(calcCorridorComponent(corridor)).toBe(0.0)
  })

  it('weights first point (5km) most heavily', () => {
    const near: ForecastData = { ...clearForecast, cloudCover: 100 }
    const far: ForecastData = { ...clearForecast, cloudCover: 0 }

    const corridorNearBad = [near, far, far]
    const corridorFarBad = [far, far, near]

    // Near point bad → worse score
    expect(calcCorridorComponent(corridorNearBad)).toBeLessThan(calcCorridorComponent(corridorFarBad))
  })
})

describe('calcConfidenceComponent', () => {
  it('returns 1.0 when models agree (diff < 15%)', () => {
    expect(calcConfidenceComponent(30, 30)).toBe(1.0)
    expect(calcConfidenceComponent(50, 40)).toBe(1.0)
  })

  it('returns 0.3 when models strongly disagree (diff > 40%)', () => {
    expect(calcConfidenceComponent(10, 60)).toBe(0.3)
    expect(calcConfidenceComponent(0, 100)).toBe(0.3)
  })

  it('interpolates linearly between 15 and 40', () => {
    // diff = 27.5 (midpoint of 15-40)
    const mid = calcConfidenceComponent(50, 22.5)
    expect(mid).toBeCloseTo(0.65, 1)
  })
})

describe('calculateScore', () => {
  it('returns high score for clear conditions', () => {
    const result = calculateScore(
      clearForecast,
      [clearForecast, clearForecast, clearForecast],
      1000, // elevation
      0,    // primary cloud
      0,    // secondary cloud (same = high confidence)
      45,   // solar altitude
    )

    expect(result.total).toBeGreaterThan(80)
    expect(result.penalty).toBe(1.0)
  })

  it('returns low score for overcast conditions', () => {
    const result = calculateScore(
      overcastForecast,
      [overcastForecast, overcastForecast, overcastForecast],
      0,
      100,
      100,
      45,
    )

    expect(result.total).toBeLessThan(30)
  })

  it('applies cloud penalty when cloud_cover > 90%', () => {
    const forecastHigh: ForecastData = { ...clearForecast, cloudCover: 95 }
    const forecastMod: ForecastData = { ...clearForecast, cloudCover: 85 }

    const scoreHigh = calculateScore(forecastHigh, [clearForecast, clearForecast, clearForecast], 1000, 95, 95, 45)
    const scoreMod = calculateScore(forecastMod, [clearForecast, clearForecast, clearForecast], 1000, 85, 85, 45)

    expect(scoreHigh.total).toBeLessThan(scoreMod.total)
    expect(scoreHigh.penalty).toBeLessThan(1.0)
    expect(scoreMod.penalty).toBe(1.0)
  })

  it('applies solar penalty for low altitude', () => {
    const scoreHigh = calculateScore(clearForecast, [clearForecast, clearForecast, clearForecast], 1000, 0, 0, 45)
    const scoreLow = calculateScore(clearForecast, [clearForecast, clearForecast, clearForecast], 1000, 0, 0, 5)
    const scoreNight = calculateScore(clearForecast, [clearForecast, clearForecast, clearForecast], 1000, 0, 0, -5)

    expect(scoreHigh.total).toBeGreaterThan(scoreLow.total)
    expect(scoreNight.total).toBe(0)
  })

  it('components are normalized between 0 and 1', () => {
    const result = calculateScore(
      { ...clearForecast, cloudCover: 50, cloudCoverLow: 30, cloudCoverMid: 20, cloudCoverHigh: 10 },
      [{ ...clearForecast, cloudCover: 40 }, { ...clearForecast, cloudCover: 60 }, { ...clearForecast, cloudCover: 80 }],
      500,
      50,
      70,
      25,
    )

    for (const value of Object.values(result.components)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('generates non-empty explanation', () => {
    const result = calculateScore(clearForecast, [clearForecast, clearForecast, clearForecast], 1000, 0, 0, 45)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('respects custom config', () => {
    const customConfig = {
      ...DEFAULT_SCORING_CONFIG,
      weights: { meteo: 1.0, layers: 0, corridor: 0, elevation: 0, confidence: 0 },
    }

    const result = calculateScore(clearForecast, [overcastForecast, overcastForecast, overcastForecast], 0, 50, 0, 45, customConfig)
    // With all weight on meteo (clear=1.0), score should be high regardless of corridor
    expect(result.total).toBeGreaterThan(90)
  })
})

describe('calculateSimplifiedScore', () => {
  it('returns score without corridor component', () => {
    const result = calculateSimplifiedScore(clearForecast, 1000, 0, 0, 45)

    expect(result.total).toBeGreaterThan(80)
    expect(result.components.corridor).toBe(0)
  })

  it('produces different result than full score for same inputs', () => {
    const full = calculateScore(clearForecast, [overcastForecast, overcastForecast, overcastForecast], 1000, 0, 0, 45)
    const simplified = calculateSimplifiedScore(clearForecast, 1000, 0, 0, 45)

    // Simplified doesn't have corridor penalty, should be higher
    expect(simplified.total).toBeGreaterThan(full.total)
  })
})
