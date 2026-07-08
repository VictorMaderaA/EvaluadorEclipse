import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export interface TimelineDataPoint {
  time: string
  score: number
}

interface TimelineChartProps {
  data: TimelineDataPoint[]
  currentTimeIndex?: number
}

export function TimelineChart({ data, currentTimeIndex }: TimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[150px] flex items-center justify-center text-xs text-gray-400">
        Sin datos temporales disponibles
      </div>
    )
  }

  const currentTime = currentTimeIndex !== undefined ? data[currentTimeIndex]?.time : undefined

  return (
    <div className="h-[150px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            tickFormatter={formatTimeLabel}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickCount={5}
          />
          <Tooltip
            content={<CustomTooltip />}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          {currentTime && (
            <ReferenceLine
              x={currentTime}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatTimeLabel(value: string): string {
  try {
    const date = new Date(value)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return value
  }
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null

  const score = payload[0]?.value ?? 0
  let timeStr = label ?? ''
  try {
    const date = new Date(timeStr)
    timeStr = date.toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    // keep original
  }

  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs">{timeStr}</p>
      <p className="font-bold" style={{ color: score >= 50 ? '#2e7d32' : '#d32f2f' }}>
        {score}/100
      </p>
    </div>
  )
}
