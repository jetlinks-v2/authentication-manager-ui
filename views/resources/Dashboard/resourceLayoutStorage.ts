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
  return `resource-center-dashboard-v6:${encodeURIComponent(profile.scope)}:${profile.saas ? 'saas' : 'private'}:${profile.mode}:${widgets}`
}

/** 只迁移同一组件集合的旧桌面布局；保留原记录，缺项/多项及窄屏均使用新的默认布局。 */
export function migrateResourceLayout(storage: Storage, key: string, ids: readonly string[], profile: ResourceLayoutProfile) {
  if (profile.mode !== 'wide' || storage.getItem(key) !== null) return
  // 旧私有化固定包含两项模块；精简后的9组件与SaaS重名，不能把旧12列坐标迁入24列。
  if (!profile.saas && (!profile.capabilities.collection || !profile.capabilities.networkCards)) return
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
        ? { ...item, h: Math.min(item.h, profile.saas ? 14 : 7) } : item)
      : layout
    storage.setItem(key, JSON.stringify(next))
    return
  }
}
