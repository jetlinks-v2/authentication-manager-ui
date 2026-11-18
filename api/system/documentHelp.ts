import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import { getDocumentHelpSettings, type DocumentHelpSettings } from '@jetlinks-web-core/api/document'
import { hasDocumentHelpContent } from '@jetlinks-web-core/utils/documentHelpContent'
export type { DocumentHelpConfiguration } from '@jetlinks-web-core/api/document'
import type { DocumentHelpConfiguration } from '@jetlinks-web-core/api/document'

const options = { projectContext: false, tenantDomain: false, hiddenError: true }
const configurationRequest = request as {
  post(url: string, body: DocumentHelpSettings, requestOptions: typeof options): Promise<AxiosResponseRewrite<unknown>>
}
const configured = (settings: DocumentHelpSettings) => Object.values(settings).filter(hasDocumentHelpContent)

export const getDocumentHelpConfigurations = async () => {
  const response = await getDocumentHelpSettings()
  return { ...response, result: configured(response.result || {}) }
}

export const saveDocumentHelpConfiguration = async (configuration: DocumentHelpConfiguration) => {
  const response = await getDocumentHelpSettings()
  if (!response.success) return { ...response, result: configuration }
  const settings = { ...response.result }
  // 保留既有条目键，兼容已保存配置；新点位使用可辨识的联合标识。
  const key = Object.keys(settings).find(key => settings[key].code === configuration.code && settings[key].key === configuration.key)
    || JSON.stringify([configuration.code, configuration.key])
  if (hasDocumentHelpContent(configuration)) settings[key] = configuration
  else delete settings[key]
  const saved = await configurationRequest.post('/system/config/document-help', settings, options)
  return { ...saved, result: configuration }
}

export interface DocumentHelpPoint { code: string; key: string }
export interface DocumentHelpBatchState { enabled: boolean; allConfigured?: boolean; points?: DocumentHelpPoint[] }
export const updateDocumentHelpEnabled = async (state: DocumentHelpBatchState) => {
  const response = await getDocumentHelpSettings()
  if (!response.success) return { ...response, result: [] as DocumentHelpConfiguration[] }
  const settings = { ...response.result }
  // 一次保存整份 Map，批量启禁只更改状态，不改说明，也不创建未配置条目。
  Object.entries(settings).forEach(([key, item]) => {
    if (hasDocumentHelpContent(item) && (state.allConfigured || state.points?.some(point => point.code === item.code && point.key === item.key))) {
      settings[key] = { ...item, enabled: state.enabled }
    }
  })
  const saved = await configurationRequest.post('/system/config/document-help', settings, options)
  return { ...saved, result: configured(settings) }
}
