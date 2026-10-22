import { normalizeGridItem, parseStoredLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'
import type { ResourceCapabilities } from '../../../visDashboard/ResourceCenter/services/capabilities'
import type { ResourceKind } from '../../../visDashboard/ResourceCenter/shared'
import { resourceDeviceMapType, type ResourceLayoutMode } from './resourceDashboardLayout'

export interface ResourceLayoutProfile {
  scope: string
  saas: boolean
  mode: ResourceLayoutMode
  capabilities: ResourceCapabilities
  widgets: readonly ResourceKind[]
  deviceMap?: boolean
}

/** 按账号/运行范围、部署和最终组件集合隔离缓存，任意显示条件变化均不覆盖另一份个人布局。 */
export function resourceLayoutStorageKey(profile: ResourceLayoutProfile) {
  const widgets = [...new Set([...profile.widgets, ...(profile.deviceMap ? [resourceDeviceMapType] : [])])].sort().join(',')
  const version = profile.saas ? 'v6' : 'v7'
  return `resource-center-dashboard-${version}:${encodeURIComponent(profile.scope)}:${profile.saas ? 'saas' : 'private'}:${profile.mode}:${widgets}`
}

/** 新增地图时复制同范围旧坐标并追加到底部；已有新布局优先，原记录全部保留。 */
export function migrateResourceLayout(
  storage: Storage, key: string, ids: readonly string[], profile: ResourceLayoutProfile,
  deviceMapGrid?: Partial<DashboardGridItem>,
) {
  if (storage.getItem(key) !== null) return
  if (profile.deviceMap) {
    if (!deviceMapGrid || !ids.includes(resourceDeviceMapType)) return
    const previousProfile = { ...profile, deviceMap: false }
    const previousKey = resourceLayoutStorageKey(previousProfile)
    const previousIds = ids.filter(id => id !== resourceDeviceMapType)
    migrateResourceLayout(storage, previousKey, previousIds, previousProfile)
    let layout
    try {
      layout = parseStoredLayout(JSON.parse(storage.getItem(previousKey) || 'null'))
    } catch { return }
    const expected = new Set(previousIds)
    const columns = profile.saas ? 12 : 24
    if (!layout || layout.length !== expected.size || new Set(layout.map(item => item.i)).size !== expected.size) return
    if (!layout.every(item => expected.has(item.i) && [item.x, item.y, item.w, item.h].every(Number.isInteger)
      && item.x >= 0 && item.y >= 0 && item.w > 0 && item.h > 0 && item.x + item.w <= columns)) return
    const bottom = Math.max(0, ...layout.map(item => item.y + item.h))
    const { x, y, w, h } = normalizeGridItem({ ...deviceMapGrid, x: 0, y: bottom, w: columns }, columns)
    storage.setItem(key, JSON.stringify([...layout, { i: resourceDeviceMapType, x, y, w, h }]))
    return
  }
  // 私有化 v7 已改为同行等宽；保留旧几何记录，但不把旧比例迁入新的默认布局。
  if (!profile.saas) return
  if (profile.mode !== 'wide') return
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
