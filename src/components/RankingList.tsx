import { useMemo } from 'react'
import type { PointWithScore } from '../views/MapView'
import { PointCard } from './PointCard'

interface RankingListProps {
  points: PointWithScore[]
  selectedPointId?: string | null
  onSelectPoint: (pointId: string) => void
}

export function RankingList({ points, selectedPointId, onSelectPoint }: RankingListProps) {
  const sorted = useMemo(
    () => [...points].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [points],
  )

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Ranking</h2>
        <p className="text-xs text-gray-500">{points.length} puntos evaluados</p>
      </div>
      <div className="flex gap-2 px-4 pb-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2e7d32]"></span> ≥75 Excelente</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#66bb6a]"></span> 50-74 Bueno</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f57c00]"></span> 25-49 Regular</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#d32f2f]"></span> &lt;25 Malo</span>
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
