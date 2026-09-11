import type { ProjectApplication } from '../../../views/application-center/ProjectApplication/types'
export type HomeFeature = 'QuickActions' | 'Applications' | 'Resources' | 'Quotas' | 'Operations' | 'Announcements' | 'QuickGuide'
export interface HomeChart {
  displayStyle: string
  fontSize: number
  showIcon: boolean
  showDescription: boolean
  showProgress: boolean
  showDate: boolean
  navigation: boolean
}
export interface HomeConfig { chart: HomeChart; refreshTime: number }
export interface HomeInfo { componentProps?: Record<string, unknown> }
export interface HomeTarget {
  menus: string[]
  params?: Record<string, string>
  query?: Record<string, string>
}
export interface HomeRow {
  id: string
  label?: string
  labelKey?: string
  description?: string
  group?: string
  subgroup?: string
  icon?: string
  value?: number
  online?: number
  offline?: number
  limit?: number | null
  unit?: string
  date?: string
  target?: HomeTarget
  notification?: Record<string, unknown>
  failed?: boolean
  application?: ProjectApplication
}
