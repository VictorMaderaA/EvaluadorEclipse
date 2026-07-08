const STORAGE_KEY = 'eclipse-last-scores'

interface LastScore {
  score: number
  timestamp: string
}

/**
 * Obtiene el último score conocido de un punto.
 */
export function getLastScore(pointId: string): LastScore | null {
  const all = getAllLastScores()
  return all[pointId] ?? null
}

/**
 * Guarda el score actual como "último conocido" para un punto.
 */
export function saveLastScore(pointId: string, score: number): void {
  const all = getAllLastScores()
  all[pointId] = { score, timestamp: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // localStorage no disponible
  }
}

/**
 * Devuelve todos los últimos scores guardados.
 */
export function getAllLastScores(): Record<string, LastScore> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as Record<string, LastScore>
  } catch {
    return {}
  }
}
