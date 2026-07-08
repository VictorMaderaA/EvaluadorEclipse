import { scoreToColor } from './utils'
import { TrendIndicator } from './TrendIndicator'

interface PointCardProps {
  pointId: string
  name: string
  region: string
  score?: number
  isSelected: boolean
  onClick: () => void
}

export function PointCard({ pointId, name, region, score, isSelected, onClick }: PointCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{region}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {score !== undefined && (
            <TrendIndicator currentScore={score} pointId={pointId} />
          )}
          <span
            className="text-lg font-bold min-w-[2.5rem] text-right"
            style={{ color: scoreToColor(score) }}
          >
            {score ?? '—'}
          </span>
        </div>
      </div>
    </button>
  )
}
