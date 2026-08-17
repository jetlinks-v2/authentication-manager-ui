export type ApplicationStatus = 'enabled' | 'disabled'
export type ResourceStatus = string

export interface ApplicationTemplate {
  id: string
  name: string
  code: string
  description: string
  icon?: string
  status: ApplicationStatus
  statusText: string
  sortIndex: number
  disabled: boolean
}

export interface ProjectApplication {
  id: string
  projectId: string
  name: string
  description: string
  templateId: string
  status: ApplicationStatus
  statusText: string
  createdAt: string
  icon?: string
  defaultLanguage: string
  domain: string
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
  product: string
  productId: string
  category: string
  groupId: string
  status: ResourceStatus
  statusText: string
  group: string
  gateway: string
  gatewayId: string
  groups?: ApplicationResourceGroup[]
}

export interface ApplicationResourceGroup {
  id: string
  name: string
}

export interface ApplicationCameraResource extends ApplicationResource {
  deviceId: string
  channelId: string
  area: string
  supportsPtz: boolean
  previewUrl?: string
}

export interface ApplicationUser {
  id: string
  name: string
  username: string
  phone: string
  email: string
  roleId: string
  roleIds: string[]
  orgIds: string[]
  positionIds: string[]
  enabled: boolean
}

export interface ApplicationUserDraft {
  name: string
  username: string
  phone: string
  email: string
  roleId: string
  password: string
  confirmPassword: string
}

export interface ApplicationUserCandidate {
  id: string
  name: string
  username: string
  phone: string
  status: string
  statusText: string
  enabled: boolean
  type?: string
  typeText?: string
}

export interface ApplicationRole {
  id: string
  name: string
  description: string
  status: ApplicationStatus
  statusText: string
}

export interface ApplicationRoleDraft {
  name: string
  description: string
}

export interface ApplicationDetailState {
  devices: ApplicationResource[]
  cameras: ApplicationCameraResource[]
  users: ApplicationUser[]
  roles: ApplicationRole[]
}

export interface ApplicationFilters {
  keyword: string
  status?: ApplicationStatus
  templateId?: string
}

export interface ResourcePickerQuery {
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
}

export interface UserPickerQuery {
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
}

export interface UserPickerPage {
  data: ApplicationUserCandidate[]
  total: number
  pageIndex: number
  pageSize: number
}

export interface ResourcePickerPage<T extends ApplicationResource = ApplicationResource> {
  data: T[]
  total: number
  pageIndex: number
  pageSize: number
}

export interface ResourcePickerGateway {
  id: string
  name: string
  provider: string
  channelNumber: number
  status: ResourceStatus
  statusText: string
}

export interface ResourcePickerData {
  type: 'device' | 'camera'
  title: string
  subtitle: string
  hint?: string
  loadResources: (query: ResourcePickerQuery, gatewayId?: string) => Promise<ResourcePickerPage>
  loadGateways?: () => Promise<ResourcePickerGateway[]>
  boundIds: string[]
}
