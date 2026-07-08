import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAllPoints,
  getCatalogPoints,
  getCustomPoints,
  addCustomPoint,
  removeCustomPoint,
} from '../points-store'

describe('points-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getCatalogPoints', () => {
    it('returns catalog points with correct count', () => {
      const points = getCatalogPoints()
      expect(points.length).toBeGreaterThanOrEqual(5)
      expect(points.length).toBeLessThanOrEqual(10)
    })

    it('all catalog points have source "catalog"', () => {
      const points = getCatalogPoints()
      for (const p of points) {
        expect(p.source).toBe('catalog')
      }
    })

    it('all catalog points have required fields', () => {
      const points = getCatalogPoints()
      for (const p of points) {
        expect(p.id).toBeTruthy()
        expect(p.name).toBeTruthy()
        expect(p.region).toBeTruthy()
        expect(p.coordinates.lat).toBeTypeOf('number')
        expect(p.coordinates.lon).toBeTypeOf('number')
        expect(p.elevation).toBeTypeOf('number')
      }
    })
  })

  describe('getCustomPoints', () => {
    it('returns empty array when no custom points', () => {
      expect(getCustomPoints()).toEqual([])
    })
  })

  describe('getAllPoints', () => {
    it('returns catalog points when no custom points exist', () => {
      const all = getAllPoints()
      const catalog = getCatalogPoints()
      expect(all.length).toBe(catalog.length)
    })

    it('includes both catalog and custom points', () => {
      addCustomPoint({
        name: 'Test Point',
        region: 'Test Region',
        coordinates: { lat: 40.0, lon: -3.0 },
        elevation: 1000,
      })

      const all = getAllPoints()
      const catalog = getCatalogPoints()
      expect(all.length).toBe(catalog.length + 1)
    })
  })

  describe('addCustomPoint', () => {
    it('returns point with generated id and source "custom"', () => {
      const point = addCustomPoint({
        name: 'Mi punto',
        region: 'Castilla',
        coordinates: { lat: 41.0, lon: -3.5 },
        elevation: 900,
      })

      expect(point.id).toMatch(/^custom-/)
      expect(point.source).toBe('custom')
      expect(point.name).toBe('Mi punto')
    })

    it('persists in localStorage', () => {
      addCustomPoint({
        name: 'Persistido',
        region: 'León',
        coordinates: { lat: 42.0, lon: -5.0 },
        elevation: 1100,
      })

      const stored = localStorage.getItem('eclipse-custom-points')
      expect(stored).not.toBeNull()

      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Persistido')
    })

    it('can add multiple points', () => {
      addCustomPoint({ name: 'A', region: 'R', coordinates: { lat: 40, lon: -3 }, elevation: 500 })
      addCustomPoint({ name: 'B', region: 'R', coordinates: { lat: 41, lon: -4 }, elevation: 600 })

      const custom = getCustomPoints()
      expect(custom).toHaveLength(2)
    })
  })

  describe('removeCustomPoint', () => {
    it('removes point by id', () => {
      const point = addCustomPoint({
        name: 'Para borrar',
        region: 'Test',
        coordinates: { lat: 40.0, lon: -3.0 },
        elevation: 800,
      })

      removeCustomPoint(point.id)

      const custom = getCustomPoints()
      expect(custom).toHaveLength(0)
    })

    it('does not affect other points', () => {
      const p1 = addCustomPoint({ name: 'Keep', region: 'R', coordinates: { lat: 40, lon: -3 }, elevation: 500 })
      const p2 = addCustomPoint({ name: 'Remove', region: 'R', coordinates: { lat: 41, lon: -4 }, elevation: 600 })

      removeCustomPoint(p2.id)

      const custom = getCustomPoints()
      expect(custom).toHaveLength(1)
      expect(custom[0]!.id).toBe(p1.id)
    })

    it('does not affect catalog points', () => {
      const catalog = getCatalogPoints()
      removeCustomPoint(catalog[0]!.id) // try to remove a catalog point

      // Catalog unchanged
      expect(getCatalogPoints().length).toBe(catalog.length)
    })
  })
})
