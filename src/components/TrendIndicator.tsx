import { getLastScore } from '../data/last-scores-store'

interface TrendIndicatorProps {
  currentScore: number
  pointId: string
}

export function TrendIndicator({ currentScore, pointId }: TrendIndicatorProps) {
  const last = getLastScore(pointId)

  if (!last) {
    return <span className="text-xs text-gray-300">—</span>
  }

  const delta = currentScore - last.score

  if (delta === 0) {
    return <span className="text-xs text-gray-400">=</span>
  }

  if (delta > 0) {
    return (
      <span className="text-xs text-green-600 font-medium">
        ▲ +{delta}
      </span>
    )
  }

  return (
    <span className="text-xs text-red-600 font-medium">
      ▼ {delta}
    </span>
  )
}
