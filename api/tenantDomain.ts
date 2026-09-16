import { request } from '@jetlinks-web/core'

export type ProjectTenantDomainCertificateMode = 'uploaded' | 'automatic'
export type ProjectTenantDomainState =
  | 'pending_dns'
  | 'awaiting_upload'
  | 'issuing'
  | 'awaiting_certificate'
  | 'registering'
  | 'ready'
  | 'failed'
  | 'deleting'

export interface ProjectTenantDomain {
  domain: string
  certificateMode: ProjectTenantDomainCertificateMode
  state: ProjectTenantDomainState
}

export interface ProjectTenantDomainWorkflow {
  domain: string
  state: ProjectTenantDomainState
  cnameValidated: boolean
  certificateUploaded: boolean
  effectivenessTested: boolean
}

export interface ProjectTenantDomainCapability {
  enabled: boolean
  providerAvailable: boolean
  cnameTarget?: string
  supportedCertificateModes: ProjectTenantDomainCertificateMode[]
}

export interface ProjectTenantDomainSaveRequest {
  domain: string
  certificateMode: ProjectTenantDomainCertificateMode
}

const unwrapResult = <T,>(response: { result?: T } | undefined): T | undefined => response?.result

export const getProjectTenantDomain = () => request.get('/tenant/domain')

/** 删除当前项目租户的自定义域名及其运行时绑定。 */
export const deleteProjectTenantDomain = () => request.remove('/tenant/domain')

export const getProjectTenantDomainWorkflow = () => request.get('/tenant/domain/_workflow')

export const getProjectTenantDomainCapability = () => request.get('/tenant/domain/capability')

export const saveProjectTenantDomain = (data: ProjectTenantDomainSaveRequest) => request.put('/tenant/domain', data)

export const validateProjectTenantDomainCname = (domain: string) => (
  request.post('/tenant/domain/_validate-cname', { domain })
)

export const testProjectTenantDomain = () => request.post('/tenant/domain/_test')

export const uploadProjectTenantDomainCertificate = (certificate: File, privateKey: File) => {
  const form = new FormData()
  form.append('certificate', certificate, certificate.name)
  form.append('privateKey', privateKey, privateKey.name)
  return request.post('/tenant/domain/_upload', form)
}

export { unwrapResult as unwrapProjectTenantDomainResult }
