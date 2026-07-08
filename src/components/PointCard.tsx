import { scoreToColor } from './utils'

interface PointCardProps {
  name: string
  region: string
  score?: number
  trend?: 'up' | 'down' | 'stable'
  isSelected: boolean
  onClick: () => void
}

const trendIcons = { up: '▲', down: '▼', stable: '=' } as const

export function PointCard({ name, region, score, trend, isSelected, onClick }: PointCardProps) {
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
          {trend && (
            <span className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
              {trendIcons[trend]}
            </span>
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
