import { parseStoredLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
import type { ResourceCapabilities } from '../../../visDashboard/ResourceCenter/services/capabilities'
import type { ResourceKind } from '../../../visDashboard/ResourceCenter/shared'
import type { ResourceLayoutMode } from './resourceDashboardLayout'

export interface ResourceLayoutProfile {
  scope: string
  saas: boolean
  mode: ResourceLayoutMode
  capabilities: ResourceCapabilities
  widgets: readonly ResourceKind[]
}

/** 按账号/运行范围、部署和最终组件集合隔离缓存，任意显示条件变化均不覆盖另一份个人布局。 */
export function resourceLayoutStorageKey(profile: ResourceLayoutProfile) {
  const widgets = [...new Set(profile.widgets)].sort().join(',')
  const version = profile.saas ? 'v6' : 'v7'
  return `resource-center-dashboard-${version}:${encodeURIComponent(profile.scope)}:${profile.saas ? 'saas' : 'private'}:${profile.mode}:${widgets}`
}

/** SaaS 迁移同集合旧桌面布局；私有化改用等宽默认值，所有旧记录保留。 */
export function migrateResourceLayout(storage: Storage, key: string, ids: readonly string[], profile: ResourceLayoutProfile) {
  // 私有化 v7 已改为同行等宽；保留旧几何记录，但不把旧比例迁入新的默认布局。
  if (!profile.saas) return
  if (profile.mode !== 'wide' || storage.getItem(key) !== null) return
  const expected = new Set(ids)
  for (const legacyKey of ['resource-center-dashboard-v5', 'resource-center-dashboard-v4']) {
    let layout
    try {
      layout = parseStoredLayout(JSON.parse(storage.getItem(legacyKey) || 'null'))
    } catch { continue }
    if (!layout || layout.length !== ids.length || new Set(layout.map(item => item.i)).size !== ids.length) continue
    if (!layout.every(item => expected.has(item.i))) continue
    const next = legacyKey.endsWith('-v4')
      ? layout.map(item => item.i === 'resourceCenterVideoPlaybackTrend'
        ? { ...item, h: Math.min(item.h, 14) } : item)
      : layout
    storage.setItem(key, JSON.stringify(next))
    return
  }
}
