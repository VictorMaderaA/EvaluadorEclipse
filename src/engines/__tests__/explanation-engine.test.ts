import { describe, it, expect } from 'vitest'
import { generateExplanation } from '../explanation-engine'

describe('generateExplanation', () => {
  it('returns non-empty string for any valid input', () => {
    const explanation = generateExplanation(
      { meteo: 0.5, layers: 0.5, corridor: 0.5, elevation: 0.5, confidence: 0.5 },
      1.0,
    )
    expect(explanation.length).toBeGreaterThan(0)
  })

  it('mentions clear sky for high meteo component', () => {
    const explanation = generateExplanation(
      { meteo: 0.95, layers: 0.9, corridor: 0.9, elevation: 0.7, confidence: 0.9 },
      1.0,
    )
    expect(explanation.toLowerCase()).toMatch(/despejado|ausencia/)
  })

  it('mentions clouds for low meteo component', () => {
    const explanation = generateExplanation(
      { meteo: 0.1, layers: 0.2, corridor: 0.3, elevation: 0.7, confidence: 0.8 },
      1.0,
    )
    expect(explanation.toLowerCase()).toMatch(/nub|obstruir/)
  })

  it('mentions uncertainty for low confidence', () => {
    const explanation = generateExplanation(
      { meteo: 0.7, layers: 0.7, corridor: 0.7, elevation: 0.7, confidence: 0.2 },
      1.0,
    )
    expect(explanation.toLowerCase()).toMatch(/concordancia|inciert/)
  })

  it('mentions penalty when active', () => {
    const explanation = generateExplanation(
      { meteo: 0.5, layers: 0.5, corridor: 0.5, elevation: 0.5, confidence: 0.5 },
      0.5,
    )
    expect(explanation.toLowerCase()).toMatch(/penalización/)
  })

  it('changes explanation based on different scenarios', () => {
    const clear = generateExplanation(
      { meteo: 0.95, layers: 0.95, corridor: 0.9, elevation: 0.8, confidence: 0.9 },
      1.0,
    )
    const overcast = generateExplanation(
      { meteo: 0.1, layers: 0.2, corridor: 0.3, elevation: 0.7, confidence: 0.8 },
      0.5,
    )

    expect(clear).not.toBe(overcast)
  })
})
