import { request } from '@jetlinks-web/core'

export interface DirectApplicationForm { name: string; description: string }
const api = request as { post<T>(url: string, body: unknown): Promise<T> }
// 保存接口只返回完成信号；创建后重新查列表，不拼装或猜测 applicationId。
export const createDirectApplication = (form: DirectApplicationForm) => api.post<void>('/application/_save', [{
  application: { name: form.name.trim(), description: form.description.trim(),
    provider: 'api-application', integrationModes: [], state: 'disabled' },
  grants: [],
}])
