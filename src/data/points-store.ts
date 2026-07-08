import catalogData from './points-catalog.json'
import type { ObservationPoint } from '../config/types'

const STORAGE_KEY = 'eclipse-custom-points'

const catalogPoints: ObservationPoint[] = catalogData as ObservationPoint[]

/**
 * Devuelve todos los puntos: catálogo base + custom del usuario.
 */
export function getAllPoints(): ObservationPoint[] {
  return [...catalogPoints, ...getCustomPoints()]
}

/**
 * Devuelve solo los puntos del catálogo base (inmutables).
 */
export function getCatalogPoints(): ObservationPoint[] {
  return catalogPoints
}

/**
 * Devuelve solo los puntos custom del usuario (desde localStorage).
 */
export function getCustomPoints(): ObservationPoint[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as ObservationPoint[]
  } catch {
    return []
  }
}

/**
 * Añade un punto custom. Genera id y marca source.
 * Devuelve el punto creado con id y source asignados.
 */
export function addCustomPoint(
  point: Omit<ObservationPoint, 'id' | 'source'>,
): ObservationPoint {
  const newPoint: ObservationPoint = {
    ...point,
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    source: 'custom',
  }

  const current = getCustomPoints()
  current.push(newPoint)
  saveCustomPoints(current)

  return newPoint
}

/**
 * Elimina un punto custom por id. No afecta al catálogo base.
 */
export function removeCustomPoint(id: string): void {
  const current = getCustomPoints()
  const filtered = current.filter(p => p.id !== id)
  saveCustomPoints(filtered)
}

function saveCustomPoints(points: ObservationPoint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
  } catch {
    // localStorage lleno o no disponible
  }
}
