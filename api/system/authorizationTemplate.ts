import { request } from '@jetlinks-web/core'

type QueryParams = Record<string, any>
type TemplatePayload = Record<string, any>

export const queryAuthorizationTemplate_api = (data: QueryParams) => request.post('/authorization/template/_query', data)

export const queryAuthorizationTemplateNoPaging_api = (data: QueryParams) => request.post('/authorization/template/_query/no-paging', data)

export const detailAuthorizationTemplate_api = (id: string) => request.get(`/authorization/template/${id}`)

export const addAuthorizationTemplate_api = (data: TemplatePayload) => request.post('/authorization/template', data)

export const updateAuthorizationTemplate_api = (data: TemplatePayload) => request.patch('/authorization/template', data)

export const deleteAuthorizationTemplate_api = (id: string) => request.remove(`/authorization/template/${id}`)
