import { describe, it, expect } from 'vitest'
import { generateGrid, evaluateGrid, gridToGeoJSON } from '../grid-engine'
import type { GridBounds } from '../grid-engine'
import type { ForecastData } from '../../config/types'

// ~40km × ~40km area centered near Madrid
const testBounds: GridBounds = {
  south: 40.2,
  north: 40.56, // ~0.36° ≈ 40km
  west: -3.9,
  east: -3.43,  // ~0.47° ≈ 40km at lat 40°
}

const clearForecast: ForecastData = {
  cloudCover: 10,
  cloudCoverLow: 0,
  cloudCoverMid: 5,
  cloudCoverHigh: 5,
  visibility: 40000,
  time: '2026-07-08T12:00',
}

describe('generateGrid', () => {
  it('generates ~16 cells for 40×40km area with 10km cells', () => {
    const cells = generateGrid(testBounds, 10)
    // Should be approximately 4×4 = 16, allow ±4 for rounding
    expect(cells.length).toBeGreaterThanOrEqual(12)
    expect(cells.length).toBeLessThanOrEqual(20)
  })

  it('each cell has 4 bounds and a centroid', () => {
    const cells = generateGrid(testBounds, 10)
    for (const cell of cells) {
      expect(cell.bounds).toHaveLength(4)
      expect(cell.centroid.lat).toBeTypeOf('number')
      expect(cell.centroid.lon).toBeTypeOf('number')
    }
  })

  it('centroids are within the bounding box', () => {
    const cells = generateGrid(testBounds, 10)
    for (const cell of cells) {
      expect(cell.centroid.lat).toBeGreaterThanOrEqual(testBounds.south)
      expect(cell.centroid.lat).toBeLessThanOrEqual(testBounds.north)
      expect(cell.centroid.lon).toBeGreaterThanOrEqual(testBounds.west)
      expect(cell.centroid.lon).toBeLessThanOrEqual(testBounds.east)
    }
  })

  it('cells have no initial score', () => {
    const cells = generateGrid(testBounds, 10)
    for (const cell of cells) {
      expect(cell.score).toBeUndefined()
    }
  })

  it('respects custom cell size', () => {
    const bigCells = generateGrid(testBounds, 20)
    const smallCells = generateGrid(testBounds, 5)
    expect(bigCells.length).toBeLessThan(smallCells.length)
  })
})

describe('evaluateGrid', () => {
  it('assigns scores to cells with forecast', () => {
    const cells = generateGrid(testBounds, 20) // fewer cells for test speed
    const forecasts = cells.map(() => clearForecast)
    const elevations = cells.map(() => 800)
    const primary = cells.map(() => 10)
    const secondary = cells.map(() => 12)

    const evaluated = evaluateGrid(cells, forecasts, elevations, primary, secondary, 45)

    for (const cell of evaluated) {
      expect(cell.score).toBeTypeOf('number')
      expect(cell.score).toBeGreaterThanOrEqual(0)
      expect(cell.score).toBeLessThanOrEqual(100)
    }
  })

  it('leaves score undefined for cells without forecast', () => {
    const cells = generateGrid(testBounds, 20)
    const forecasts: (ForecastData | null)[] = cells.map((_, i) => (i === 0 ? null : clearForecast))
    const elevations = cells.map(() => 800)
    const primary = cells.map(() => 10)
    const secondary = cells.map(() => 12)

    const evaluated = evaluateGrid(cells, forecasts, elevations, primary, secondary, 45)

    expect(evaluated[0]!.score).toBeUndefined()
    expect(evaluated[1]!.score).toBeTypeOf('number')
  })

  it('uses simplified score (no corridor)', () => {
    const cells = generateGrid(testBounds, 20)
    const forecasts = cells.map(() => clearForecast)
    const elevations = cells.map(() => 800)
    const primary = cells.map(() => 10)
    const secondary = cells.map(() => 12)

    const evaluated = evaluateGrid(cells, forecasts, elevations, primary, secondary, 45)

    // With clear forecast + good elevation + high confidence, score should be high
    expect(evaluated[0]!.score).toBeGreaterThan(70)
  })
})

describe('gridToGeoJSON', () => {
  it('produces FeatureCollection type', () => {
    const cells = generateGrid(testBounds, 20)
    const geojson = gridToGeoJSON(cells)

    expect(geojson.type).toBe('FeatureCollection')
    expect(geojson.features.length).toBe(cells.length)
  })

  it('features have Polygon geometry', () => {
    const cells = generateGrid(testBounds, 20)
    const geojson = gridToGeoJSON(cells)

    for (const feature of geojson.features) {
      expect(feature.type).toBe('Feature')
      expect(feature.geometry.type).toBe('Polygon')
    }
  })

  it('coordinates use [lon, lat] order (GeoJSON standard)', () => {
    const cells = generateGrid(testBounds, 20)
    const geojson = gridToGeoJSON(cells)

    const firstCoord = geojson.features[0]!.geometry.coordinates[0]![0]!
    // First coordinate should be [lon, lat] — lon is negative for Spain
    expect(firstCoord[0]).toBeLessThan(0)  // longitude (west of Greenwich)
    expect(firstCoord[1]).toBeGreaterThan(30)  // latitude (Spain ~37-43)
  })

  it('polygon ring is closed (first point = last point)', () => {
    const cells = generateGrid(testBounds, 20)
    const geojson = gridToGeoJSON(cells)

    for (const feature of geojson.features) {
      const ring = feature.geometry.coordinates[0]!
      expect(ring).toHaveLength(5) // 4 corners + closing point
      expect(ring[0]).toEqual(ring[4]) // closed ring
    }
  })

  it('properties include score and centroid', () => {
    const cells = generateGrid(testBounds, 20)
    cells[0]!.score = 75
    const geojson = gridToGeoJSON(cells)

    expect(geojson.features[0]!.properties.score).toBe(75)
    expect(geojson.features[0]!.properties.centroid).toHaveProperty('lat')
    expect(geojson.features[0]!.properties.centroid).toHaveProperty('lon')
  })
})
