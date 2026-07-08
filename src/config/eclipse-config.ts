export interface EclipseConfig {
  mode: '72h' | 'eclipse'
  eclipseDate: string
  eclipseTime: string
  windowBefore: number
  windowAfter: number
}

export const DEFAULT_ECLIPSE_CONFIG: EclipseConfig = {
  mode: '72h',
  eclipseDate: '',
  eclipseTime: '',
  windowBefore: 60,
  windowAfter: 15,
}
