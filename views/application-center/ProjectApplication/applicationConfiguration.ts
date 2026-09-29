import type { ApplicationOpenMode, ApplicationTemplate, ProjectApplication } from './types'

type ApplicationConfiguration = Record<string, unknown>
type ApplicationConfigurationFields = Pick<
  ProjectApplication,
  'defaultLanguage' | 'timezone' | 'domain' | 'openMode' | 'externalUrl'
>

export const normalizeApplicationOpenMode = (value: unknown): ApplicationOpenMode =>
  value === 'external' ? 'external' : 'runtime'

export const normalizeExternalApplicationUrl = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

/** 新建应用只继承模板声明的打开方式；上游地址属于应用实例配置。 */
export const buildInitialApplicationConfiguration = (template?: ApplicationTemplate) => {
  return {
    layoutVariant: template?.layoutVariant || 'application',
    layout: template?.layout || 'side',
    defaultLanguage: 'zh-CN',
    timezone: 'Asia/Shanghai',
    customDomain: '',
    openMode: normalizeApplicationOpenMode(template?.openMode),
    externalUrl: '',
  }
}

/** 将后端 configuration 中的打开配置映射为页面模型。 */
export const normalizeApplicationOpenConfiguration = (configuration?: ApplicationConfiguration) => ({
  openMode: normalizeApplicationOpenMode(configuration?.openMode),
  externalUrl: normalizeExternalApplicationUrl(configuration?.externalUrl),
})

/** 保存与跳转共用协议边界，拒绝浏览器会自动补全的相对或缺少双斜杠的地址。 */
export const isHttpExternalApplicationUrl = (value: unknown): value is string => {
  const url = normalizeExternalApplicationUrl(value)
  if (!/^https?:\/\//i.test(url)) return false
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

/** 保留未知配置，仅更新应用设置页负责的 configuration 字段。 */
export const buildApplicationConfiguration = (
  current: ApplicationConfiguration | undefined,
  application: ApplicationConfigurationFields,
) => {
  return {
    ...current,
    defaultLanguage: application.defaultLanguage,
    timezone: application.timezone,
    customDomain: application.domain,
    openMode: application.openMode,
    externalUrl: normalizeExternalApplicationUrl(application.externalUrl),
  }
}
