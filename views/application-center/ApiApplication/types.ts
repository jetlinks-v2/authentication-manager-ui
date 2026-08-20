import type {
  AccessLog,
  ApiApplication,
  ApiGroup,
  ApiGroupGrant,
  ApiSpec,
  BusinessApplication,
} from '@authentication-manager-ui/api/application-center/apiApplication'

export type { AccessLog, ApiApplication, ApiGroup, ApiGroupGrant, ApiSpec, BusinessApplication }

export interface ConditionFilterPayload {
  terms?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface ApiApplicationForm {
  name: string
  description?: string
  businessApplicationIds: string[]
}

export interface DebugRequest {
  method: string
  path: string
  query: string
  headers: string
  body: string
}
