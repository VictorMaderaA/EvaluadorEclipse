import type { PointWithScore } from '../views/MapView'
import { PointCard } from './PointCard'

interface RankingListProps {
  points: PointWithScore[]
  selectedPointId?: string | null
  onSelectPoint: (pointId: string) => void
}

export function RankingList({ points, selectedPointId, onSelectPoint }: RankingListProps) {
  const sorted = [...points].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Ranking</h2>
        <p className="text-xs text-gray-500">{points.length} puntos evaluados</p>
      </div>
      <div>
        {sorted.map(({ point, score }) => (
          <PointCard
            key={point.id}
            pointId={point.id}
            name={point.name}
            region={point.region}
            score={score}
            isSelected={point.id === selectedPointId}
            onClick={() => onSelectPoint(point.id)}
          />
        ))}
      </div>
    </div>
  )
}
