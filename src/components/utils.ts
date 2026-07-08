/**
 * Maps a score (0-100) to a color string.
 * Consistent color-scale used across map markers, cards, and detail views.
 */
export function scoreToColor(score?: number): string {
  if (score === undefined) return '#9e9e9e'
  if (score < 25) return '#d32f2f'
  if (score < 50) return '#f57c00'
  if (score < 75) return '#66bb6a'
  return '#2e7d32'
}

/**
 * Converts azimuth in degrees to cardinal direction.
 */
export function azimuthToCardinal(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8
  return directions[index]!
}
