import { AIcon } from '@jetlinks-web/components'
import { h, type VNode } from 'vue'

/** 平台内置公告类型与统一图标语义；类型只表达内容主题，不承担紧急程度或颜色等级。 */
export const BULLETIN_TYPE_ICONS: Record<string, string> = {
  default: 'NotificationOutlined',
  maintenance: 'ToolOutlined',
  incident: 'WarningOutlined',
  release: 'RocketOutlined',
  security: 'SafetyCertificateOutlined',
  policy: 'FileTextOutlined',
}

export const DEFAULT_BULLETIN_TYPE_ICON = 'NotificationOutlined'

export const BULLETIN_TYPE_COLORS: Record<string, string> = {
  default: 'var(--jet-theme-primary)',
  maintenance: '#fa8c16',
  incident: '#f5222d',
  release: '#1677ff',
  security: '#722ed1',
  policy: '#52c41a',
}

export const resolveBulletinTypeColor = (type?: unknown): string => {
  const value = type && typeof type === 'object'
    ? (type as { value?: unknown }).value
    : type
  return BULLETIN_TYPE_COLORS[String(value ?? '').trim()] || BULLETIN_TYPE_COLORS.default
}

/** 兼容枚举对象、字符串与历史异常值，未知类型统一回退默认公告图标。 */
export const resolveBulletinTypeIcon = (type?: unknown): string => {
  const value = type && typeof type === 'object'
    ? (type as { value?: unknown }).value
    : type
  return BULLETIN_TYPE_ICONS[String(value ?? '').trim()] || DEFAULT_BULLETIN_TYPE_ICON
}

/** 右上角轻提示需要可渲染节点，统一复用 AIcon 保证与页面图标一致。 */
export const createBulletinTypeIconNode = (type?: unknown): VNode => {
  return h(AIcon, { type: resolveBulletinTypeIcon(type) })
}
