import globalI18n from '@jetlinks-web-core/locales'

export type AnnouncementLocalizedText = Record<string, string>

export interface AnnouncementI18n {
  title?: AnnouncementLocalizedText
  summary?: AnnouncementLocalizedText
  content?: AnnouncementLocalizedText
}

export type AnnouncementI18nField = keyof AnnouncementI18n
type AnnouncementTextRecord = { i18nMessages?: unknown } & Partial<Record<AnnouncementI18nField, unknown>>

const isRecord = (value: unknown): value is Record<string, any> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : ''
    if (text) return text
  }
  return ''
}

const currentLocale = () => {
  return String(globalI18n.global.locale.value || 'zh')
    .replace('_', '-')
    .toLowerCase()
}

const normalizeTextMap = (value: unknown) => {
  if (!isRecord(value)) return undefined
  const entries = Object.entries(value)
    .filter(([locale]) => locale === 'zh' || locale === 'en')
    .map(([locale, text]) => [locale, typeof text === 'string' ? text.trim() : ''] as const)
    .filter(([, text]) => Boolean(text))
  return entries.length ? Object.fromEntries(entries) : undefined
}

/** 只保留有内容的中英文，避免把空语言写回 `i18nMessages`。 */
export const normalizeAnnouncementI18n = (value: unknown): AnnouncementI18n => {
  if (!isRecord(value)) return {}
  const normalized: AnnouncementI18n = {}
  const fields: AnnouncementI18nField[] = ['title', 'summary', 'content']
  fields.forEach((field) => {
    const messages = normalizeTextMap(value[field])
    if (messages) normalized[field] = messages
  })
  return normalized
}

/** `i18nMessages` 是平台一等字段：字段 -> 语言 -> 文本，与菜单实体保持一致。 */
export const getAnnouncementI18n = (i18nMessages: unknown): AnnouncementI18n => {
  return isRecord(i18nMessages) ? i18nMessages as AnnouncementI18n : {}
}

export const resolveLocalizedText = (
  messages: unknown,
  locale = currentLocale(),
): string => {
  if (!isRecord(messages)) return ''
  const normalizedLocale = String(locale || '').replace('_', '-').toLowerCase()
  if (!normalizedLocale) return ''
  const language = normalizedLocale.split('-')[0]
  return firstText(messages[normalizedLocale], messages[language])
}

/**
 * 状态文案（已发布/未发布）按目标语言从本地语言包解析。
 * 后端 `state.text` 是单语快照（BulletinState 仍是硬编码中文），因此只作兜底。
 */
export const resolveAnnouncementStateLabel = (
  state: unknown,
  locale?: string,
): string => {
  const value = String(state ?? '').trim()
  if (!value) return ''
  const language = String(locale || currentLocale()).replace('_', '-').split('-')[0]
  if (!language) return ''
  try {
    const messages = globalI18n.global.getLocaleMessage(language) as Record<string, unknown>
    const localized = messages?.[`Announcement.status.${value}`]
    return typeof localized === 'string' ? localized : ''
  } catch {
    return ''
  }
}

/** 当前 locale 优先，缺失时只回退旧顶层字段，不跨语言取值。 */
export const resolveAnnouncementText = (
  record: AnnouncementTextRecord | undefined,
  field: AnnouncementI18nField,
  locale?: string,
): string => {
  if (!record) return ''
  const localized = resolveLocalizedText(getAnnouncementI18n(record.i18nMessages)[field], locale)
  return localized || firstText(record[field])
}

/** 旧消费方字段使用中文优先、英文兜底。 */
export const resolveCompatibilityText = (
  messages: unknown,
  fallback = '',
): string => {
  return firstText(
    isRecord(messages) ? messages.zh : '',
    isRecord(messages) ? messages.en : '',
    fallback,
  )
}

export const buildAnnouncementI18nFields = (draft: {
  i18nMessages?: unknown
  title?: unknown
  summary?: unknown
  content?: unknown
}) => {
  const i18n = normalizeAnnouncementI18n(draft.i18nMessages)
  return {
    i18nMessages: Object.keys(i18n).length > 0 ? i18n : undefined,
    title: resolveCompatibilityText(i18n.title, firstText(draft.title)),
    summary: resolveCompatibilityText(i18n.summary, firstText(draft.summary)),
    content: resolveCompatibilityText(i18n.content, firstText(draft.content)),
  }
}

export const updateAnnouncementLocaleText = (
  i18n: unknown,
  field: AnnouncementI18nField,
  locale: unknown,
  value: unknown,
) => {
  const normalized = normalizeAnnouncementI18n(i18n)
  const language = String(locale || '').replace('_', '-').split('-')[0].toLowerCase()
  if (language !== 'zh' && language !== 'en') return normalized
  const messages = { ...(normalized[field] ?? {}) }
  const text = firstText(value)
  if (text) {
    messages[language] = text
  } else {
    delete messages[language]
  }
  if (Object.keys(messages).length) {
    normalized[field] = messages
  } else {
    delete normalized[field]
  }
  return normalized
}

export const mergeLegacyAnnouncementI18n = (
  i18n: unknown,
  legacy: { title?: unknown; summary?: unknown; content?: unknown },
) => {
  const normalized = normalizeAnnouncementI18n(i18n)

  const resolveLegacyChinese = (messages: AnnouncementLocalizedText | undefined, value: unknown) => {
    const text = firstText(value)
    if (!text || messages?.zh) return ''
    const equalsExistingTranslation = Object.entries(messages ?? {})
      .some(([locale, localized]) => locale !== 'zh' && localized === text)
    return equalsExistingTranslation ? '' : text
  }

  const title = resolveLegacyChinese(normalized.title, legacy.title)
  if (title) normalized.title = { ...(normalized.title ?? {}), zh: title }
  const summary = resolveLegacyChinese(normalized.summary, legacy.summary)
  if (summary) normalized.summary = { ...(normalized.summary ?? {}), zh: summary }
  const content = resolveLegacyChinese(normalized.content, legacy.content)
  if (content) normalized.content = { ...(normalized.content ?? {}), zh: content }
  return normalized
}
