export type ApplicationStatus = 'enabled' | 'disabled'
export type ResourceStatus = 'online' | 'offline' | 'muted'
export type PermissionAction = 'view' | 'edit' | 'delete'

export interface ApplicationTemplate {
  id: string
  nameKey: string
  descriptionKey: string
  detailKey: string
  icon: string
  disabled?: boolean
}

export interface ProjectApplication {
  id: string
  name: string
  description: string
  templateId: string
  status: ApplicationStatus
  createdAt: string
  icon?: string
  defaultLanguage: 'zh-CN' | 'en-US'
  domain: string
  allowDirectDevice: boolean
}

export interface ProjectApplicationDraft {
  name: string
  description: string
  templateId: string
  icon?: string
}

export interface ApplicationResource {
  id: string
  name: string
  serial: string
  category: string
  status: ResourceStatus
  group: string
  gateway: string
  area?: string
  supportsPtz?: boolean
}

export interface UsageMetric {
  id: string
  labelKey: string
  current: number
  limit: number
  unit?: string
}

export interface UsageService {
  id: string
  nameKey: string
  editionKey: string
  icon: string
  metrics: UsageMetric[]
  noteKey?: string
}

export interface ApplicationUser {
  id: string
  name: string
  username: string
  phone: string
  email?: string
  roleId: string
  enabled: boolean
}

export interface ApplicationUserDraft {
  name: string
  username: string
  phone: string
  email: string
  roleId: string
}

export interface MenuPermissionNode {
  key: string
  titleKey: string
  children?: MenuPermissionNode[]
}

export interface ApplicationRole {
  id: string
  name: string
  description: string
  builtIn: boolean
  permissions: Record<string, PermissionAction[]>
}

export interface ApplicationRoleDraft {
  name: string
  description: string
}

export interface ApplicationDetailState {
  devices: ApplicationResource[]
  cameras: ApplicationResource[]
  users: ApplicationUser[]
  roles: ApplicationRole[]
  usage: UsageService[]
}

export interface ApplicationFilters {
  keyword: string
  status?: ApplicationStatus
  templateId?: string
}

export interface ResourcePickerGroupMode {
  label: string
  value: 'category' | 'group' | 'gateway'
}

export interface ResourcePickerData {
  title: string
  subtitle: string
  hint?: string
  resources: ApplicationResource[]
  boundIds: string[]
  groupModes: ResourcePickerGroupMode[]
  showArea?: boolean
}
