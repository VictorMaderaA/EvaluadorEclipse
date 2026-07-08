import { useMemo } from 'react'
import type { EclipseConfig } from '../config/eclipse-config'
import { getSelectedDateTime } from '../config/eclipse-config'

interface TimeSliderProps {
  config: EclipseConfig
  selectedTime: Date
  onTimeChange: (time: Date) => void
}

export function TimeSlider({ config, selectedTime, onTimeChange }: TimeSliderProps) {
  const { startTime, endTime, stepMs } = useMemo(() => {
    if (config.mode === 'eclipse') {
      const center = getSelectedDateTime(config)
      if (center) {
        return {
          startTime: new Date(center.getTime() - config.windowBefore * 60 * 1000),
          endTime: new Date(center.getTime() + config.windowAfter * 60 * 1000),
          stepMs: 15 * 60 * 1000, // 15 min step
        }
      }
    }
    // Default: 72h mode
    const now = new Date()
    now.setMinutes(0, 0, 0) // Round to hour
    return {
      startTime: now,
      endTime: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      stepMs: 60 * 60 * 1000, // 1h step
    }
  }, [config])

  const totalSteps = Math.floor((endTime.getTime() - startTime.getTime()) / stepMs)
  const currentStep = Math.round((selectedTime.getTime() - startTime.getTime()) / stepMs)
  const clampedStep = Math.max(0, Math.min(totalSteps, currentStep))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = Number(e.target.value)
    const newTime = new Date(startTime.getTime() + step * stepMs)
    onTimeChange(newTime)
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{formatTime(startTime)}</span>
        <span className="text-sm font-medium text-gray-900">{formatTime(selectedTime)}</span>
        <span className="text-xs text-gray-500">{formatTime(endTime)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={totalSteps}
        value={clampedStep}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  )
}
