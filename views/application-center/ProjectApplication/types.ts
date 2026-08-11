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
  category: string
  status: ResourceStatus
  statusText: string
  group: string
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
  users: ApplicationUser[]
  roles: ApplicationRole[]
}

export interface ApplicationFilters {
  keyword: string
  status?: ApplicationStatus
  templateId?: string
}

export interface ResourcePickerGroupMode {
  label: string
  value: 'category' | 'group'
}

export interface ResourcePickerData {
  title: string
  subtitle: string
  hint?: string
  resources: ApplicationResource[]
  boundIds: string[]
  groupModes: ResourcePickerGroupMode[]
}
