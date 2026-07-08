import { describe, it, expect } from 'vitest'
import {
  getSolarPosition,
  getCorridorPoints,
  destinationPoint,
  getAltitudePenalty,
} from '../solar-engine'

/** Haversine distance in km (for test verification only) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

describe('getSolarPosition', () => {
  it('returns high altitude for Madrid at midday in summer', () => {
    // 2026-07-08 12:00 UTC → Madrid should have sun high (~70°)
    const date = new Date('2026-07-08T12:00:00Z')
    const pos = getSolarPosition(date, 40.4168, -3.7038)

    expect(pos.altitudeDeg).toBeGreaterThan(60)
    expect(pos.altitudeDeg).toBeLessThan(75)
  })

  it('returns azimuth near south for Madrid at solar noon', () => {
    const date = new Date('2026-07-08T12:00:00Z')
    const pos = getSolarPosition(date, 40.4168, -3.7038)

    // Solar noon in Madrid in summer: azimuth should be ~170-195° (south)
    expect(pos.azimuthNorthDeg).toBeGreaterThan(160)
    expect(pos.azimuthNorthDeg).toBeLessThan(200)
  })

  it('returns negative altitude at night', () => {
    // 2026-07-08 02:00 UTC → night in Madrid
    const date = new Date('2026-07-08T02:00:00Z')
    const pos = getSolarPosition(date, 40.4168, -3.7038)

    expect(pos.altitudeDeg).toBeLessThan(0)
  })

  it('azimuth is always between 0 and 360', () => {
    const dates = [
      new Date('2026-07-08T06:00:00Z'),
      new Date('2026-07-08T12:00:00Z'),
      new Date('2026-07-08T18:00:00Z'),
      new Date('2026-07-08T23:00:00Z'),
    ]

    for (const date of dates) {
      const pos = getSolarPosition(date, 40.4168, -3.7038)
      expect(pos.azimuthNorthDeg).toBeGreaterThanOrEqual(0)
      expect(pos.azimuthNorthDeg).toBeLessThan(360)
    }
  })
})

describe('destinationPoint', () => {
  it('returns same point for distance 0', () => {
    const [lat, lon] = destinationPoint(40.4168, -3.7038, 0, 90)
    expect(lat).toBeCloseTo(40.4168, 4)
    expect(lon).toBeCloseTo(-3.7038, 4)
  })

  it('moves north when bearing is 0', () => {
    const [lat, lon] = destinationPoint(40.0, -3.0, 10, 0)
    expect(lat).toBeGreaterThan(40.0)
    expect(lon).toBeCloseTo(-3.0, 2)
  })

  it('moves east when bearing is 90', () => {
    const [lat, lon] = destinationPoint(40.0, -3.0, 10, 90)
    expect(lat).toBeCloseTo(40.0, 1)
    expect(lon).toBeGreaterThan(-3.0)
  })

  it('produces correct distance (5km)', () => {
    const [lat2, lon2] = destinationPoint(40.4168, -3.7038, 5, 45)
    const dist = haversineDistance(40.4168, -3.7038, lat2, lon2)
    expect(dist).toBeCloseTo(5, 1) // ±100m
  })

  it('produces correct distance (20km)', () => {
    const [lat2, lon2] = destinationPoint(40.4168, -3.7038, 20, 180)
    const dist = haversineDistance(40.4168, -3.7038, lat2, lon2)
    expect(dist).toBeCloseTo(20, 1) // ±100m
  })
})

describe('getCorridorPoints', () => {
  it('returns 3 points by default', () => {
    const points = getCorridorPoints(40.4168, -3.7038, 180)
    expect(points).toHaveLength(3)
  })

  it('points are at correct distances (5, 10, 20 km)', () => {
    const points = getCorridorPoints(40.4168, -3.7038, 90)

    const d1 = haversineDistance(40.4168, -3.7038, points[0]!.lat, points[0]!.lon)
    const d2 = haversineDistance(40.4168, -3.7038, points[1]!.lat, points[1]!.lon)
    const d3 = haversineDistance(40.4168, -3.7038, points[2]!.lat, points[2]!.lon)

    expect(d1).toBeCloseTo(5, 1)
    expect(d2).toBeCloseTo(10, 1)
    expect(d3).toBeCloseTo(20, 1)
  })

  it('bearing east → longitude increases, latitude stays ~same', () => {
    const points = getCorridorPoints(40.0, -3.0, 90)

    for (const p of points) {
      expect(p.lon).toBeGreaterThan(-3.0)
      expect(p.lat).toBeCloseTo(40.0, 1)
    }
  })

  it('accepts custom distances', () => {
    const points = getCorridorPoints(40.0, -3.0, 0, [1, 2, 3, 4])
    expect(points).toHaveLength(4)
  })
})

describe('getAltitudePenalty', () => {
  it('returns 0.0 for negative altitude (below horizon)', () => {
    expect(getAltitudePenalty(-10)).toBe(0.0)
    expect(getAltitudePenalty(-1)).toBe(0.0)
  })

  it('returns 0.5 at altitude 0°', () => {
    expect(getAltitudePenalty(0)).toBeCloseTo(0.5)
  })

  it('returns 0.6 at altitude 5°', () => {
    expect(getAltitudePenalty(5)).toBeCloseTo(0.6)
  })

  it('returns 0.7 at altitude 10°', () => {
    expect(getAltitudePenalty(10)).toBeCloseTo(0.7)
  })

  it('returns 0.85 at altitude 20°', () => {
    expect(getAltitudePenalty(20)).toBeCloseTo(0.85)
  })

  it('returns 1.0 at altitude 30°', () => {
    expect(getAltitudePenalty(30)).toBe(1.0)
  })

  it('returns 1.0 for altitude above 30°', () => {
    expect(getAltitudePenalty(50)).toBe(1.0)
    expect(getAltitudePenalty(90)).toBe(1.0)
  })
})
