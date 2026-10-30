import type { ProjectApplication } from '../../../views/application-center/ProjectApplication/types'
import type { CardAvatarData } from '@jetlinks-web-core/components/CardBox/types'
export type HomeFeature = 'QuickActions' | 'Applications' | 'Resources' | 'Quotas' | 'Operations' | 'Announcements' | 'AnnouncementUnread' | 'QuickGuide' | 'DeviceAccess' | 'Visualization' | 'AiCenter' | 'RuleEngine' | 'Collection' | 'SaasResources' | 'SaasToday' | 'SaasQuotas' | 'SaasApplications'
export interface HomeChart {
  maxItems?: number
  titleKey?: string
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
  descriptionKey?: string
  group?: string
  subgroup?: string
  icon?: string
  value?: number
  yesterday?: number
  statuses?: { labelKey: string; value?: number; tone?: 'success' | 'error' | 'default' }[]
  online?: number
  offline?: number
  limit?: number | null
  unit?: string
  unitKey?: string
  date?: string
  target?: HomeTarget
  notification?: Record<string, unknown>
  failed?: boolean
  application?: ProjectApplication
  applicationAvatar?: CardAvatarData
  isNew?: boolean
  readState?: 'read' | 'unread'
  announcementType?: { value: string; text: string; color: string }
}
