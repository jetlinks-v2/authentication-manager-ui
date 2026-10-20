import type { ApplicationTemplate, ProjectApplication } from './types'

type ApplicationConfiguration = Record<string, unknown>
type ApplicationConfigurationFields = Pick<
  ProjectApplication,
  'defaultLanguage' | 'timezone' | 'domain' | 'provider' | 'redirectUri'
>

export const normalizeExternalApplicationUrl = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

/** 初始配置不复制模板跳转地址，实例覆盖值仅在编辑时保存。 */
export const buildInitialApplicationConfiguration = (template?: ApplicationTemplate) => {
  return {
    layoutVariant: template?.layoutVariant || 'application',
    layout: template?.layout || 'side',
    defaultLanguage: 'zh-CN',
    timezone: 'Asia/Shanghai',
    customDomain: '',
  }
}

/** 保存与跳转共用协议边界，拒绝浏览器会自动补全的相对或缺少双斜杠的地址。 */
export const isHttpExternalApplicationUrl = (value: unknown): value is string => {
  const url = normalizeExternalApplicationUrl(value)
  if (!/^https?:\/\//i.test(url)) return false
  try {
    const address = new URL(url)
    return ['http:', 'https:'].includes(address.protocol) && !!address.hostname && !address.username && !address.password
  } catch {
    return false
  }
}

/** 保留未知配置，仅更新应用设置页负责的 configuration 字段。 */
export const buildApplicationConfiguration = (
  current: ApplicationConfiguration | undefined,
  application: ApplicationConfigurationFields,
) => {
  if (application.provider === 'third-party') {
    return { ...current, redirectUri: normalizeExternalApplicationUrl(application.redirectUri) }
  }
  return {
    ...current,
    defaultLanguage: application.defaultLanguage,
    timezone: application.timezone,
    customDomain: application.domain,
  }
}
