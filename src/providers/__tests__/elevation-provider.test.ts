import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getElevation, getElevationBatch, elevationScore } from '../elevation-provider'

describe('elevationScore', () => {
  it('returns 0.3 for 0m', () => {
    expect(elevationScore(0)).toBe(0.3)
  })

  it('returns 0.3 for negative elevation', () => {
    expect(elevationScore(-10)).toBe(0.3)
  })

  it('returns 1.0 for 1500m', () => {
    expect(elevationScore(1500)).toBe(1.0)
  })

  it('returns 1.0 for elevation above 1500m', () => {
    expect(elevationScore(2000)).toBe(1.0)
    expect(elevationScore(3000)).toBe(1.0)
  })

  it('returns ~0.67 for 800m', () => {
    const score = elevationScore(800)
    // 0.3 + (800/1500) * 0.7 = 0.3 + 0.3733 = 0.6733
    expect(score).toBeCloseTo(0.673, 2)
  })

  it('returns 0.65 for 750m', () => {
    const score = elevationScore(750)
    // 0.3 + (750/1500) * 0.7 = 0.3 + 0.35 = 0.65
    expect(score).toBeCloseTo(0.65, 2)
  })

  it('is monotonically increasing', () => {
    const values = [0, 100, 300, 500, 800, 1000, 1200, 1500, 2000]
    for (let i = 1; i < values.length; i++) {
      expect(elevationScore(values[i]!)).toBeGreaterThanOrEqual(elevationScore(values[i - 1]!))
    }
  })
})

describe('getElevationBatch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns elevations for multiple coordinates', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ elevation: [666, 44, 18] }), { status: 200 }),
    )

    const coords = [
      { lat: 40.4168, lon: -3.7038 },
      { lat: 41.3888, lon: 2.159 },
      { lat: 37.3891, lon: -5.9845 },
    ]

    const results = await getElevationBatch(coords)
    expect(results).toEqual([666, 44, 18])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('returns empty array for empty input', async () => {
    const results = await getElevationBatch([])
    expect(results).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns zeros on fetch failure', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    const coords = [{ lat: 40.0, lon: -3.0 }, { lat: 41.0, lon: 2.0 }]
    const results = await getElevationBatch(coords)
    expect(results).toEqual([0, 0])
  }, 10000)
})

describe('getElevation', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns elevation for single coordinate', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ elevation: [666] }), { status: 200 }),
    )

    const result = await getElevation(40.4168, -3.7038)
    expect(result).toBe(666)
  })
})
