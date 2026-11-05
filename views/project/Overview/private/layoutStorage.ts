import { parseStoredLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
import type { PrivateOverviewAccess } from '../../../../visDashboard/Base/Private/services/access'
import { buildPrivateOverviewLayout, privateOverviewLayoutMode, privateOverviewLayoutStorageKey, type PrivateOverviewWidget } from './layout'

/** 收紧旧默认尺寸，保留用户调整的宽高和排列；旧缓存留作备份，迁移只执行一次。 */
export function migratePrivateOverviewHeights(storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string, width: number, access: PrivateOverviewAccess, widgets: readonly PrivateOverviewWidget[]) {
  if (storage.getItem(key) !== null) return
  const oldKey = key.replace(':canvas:v2:', ':canvas:v1:')
  let saved
  try { saved = parseStoredLayout(JSON.parse(storage.getItem(oldKey) || 'null')) } catch { return }
  const defaults = new Map(widgets.map(item => [item.id, item]))
  if (!saved || saved.length !== defaults.size || new Set(saved.map(item => item.i)).size !== defaults.size) return
  if (!saved.every(item => defaults.has(item.i) && [item.x, item.y, item.w, item.h].every(Number.isInteger)
    && item.x >= 0 && item.y >= 0 && item.w > 0 && item.h > 0 && item.x + item.w <= 24)) return
  const mode = privateOverviewLayoutMode(width)
  const hasAssets = access.iot || access.video
  const oldMainRows = (access.message || access.ai ? 9 : 0) + (hasAssets ? 10 : 0)
    + (access.runtime && !(mode === 'large' && hasAssets) ? 10 : 0)
  const oldHeights = {
    kpi: 4, recent: 5, access: access.applications ? 9 : 8, applications: 9, 'my-applications': 10, account: 10, trend: 9, assets: 10, monitor: 10,
    alarms: mode === 'compact' || mode === 'stacked' ? 18 : Math.max(18, oldMainRows),
  }
  storage.setItem(key, JSON.stringify(saved.map(item => {
    const current = defaults.get(item.i)!
    // 改过宽度或高度的卡片沿用个人尺寸，其余卡片由网格在缩短后自然紧凑排列。
    return item.w === current.gridItem.w && item.h === oldHeights[current.panel]
      ? { ...item, h: Math.min(item.h, current.gridItem.h) } : item
  })))
}

/** 迁移指标规则或最近访问变更前的个人布局，新增卡片放在已有卡片之后。 */
export function migratePrivateOverviewRecent(storage: Pick<Storage, 'getItem' | 'setItem'>,
  scope: string, width: number, access: PrivateOverviewAccess, showAccess: boolean,
  widgets: readonly PrivateOverviewWidget[]) {
  const key = privateOverviewLayoutStorageKey(scope, width, widgets)
  if (storage.getItem(key) !== null) return
  const oldLayouts = [
    buildPrivateOverviewLayout(access, showAccess, width, true, true, false),
    buildPrivateOverviewLayout(access, showAccess, width, false, false, false),
  ]
  for (const previous of oldLayouts) {
    const oldKey = privateOverviewLayoutStorageKey(scope, width, previous)
    if (oldKey === key) continue
    migratePrivateOverviewHeights(storage, oldKey, width, access, previous)
    let saved
    try { saved = parseStoredLayout(JSON.parse(storage.getItem(oldKey) || 'null')) } catch { continue }
    const defaults = new Map(previous.map(item => [item.id, item.gridItem]))
    if (!saved || saved.length !== defaults.size || new Set(saved.map(item => item.i)).size !== defaults.size) continue
    if (!saved.every(item => defaults.has(item.i) && [item.x, item.y, item.w, item.h].every(Number.isInteger)
      && item.x >= 0 && item.y >= 0 && item.w > 0 && item.h > 0 && item.x + item.w <= 24)) continue
    const unchanged = saved.every(item => {
      const original = defaults.get(item.i)!
      return item.x === original.x && item.y === original.y && item.w === original.w && item.h === original.h
    })
    if (unchanged) return
    const currentIds = new Set(widgets.map(item => item.id))
    const retained = saved.filter(item => currentIds.has(item.i))
    const retainedIds = new Set(retained.map(item => item.i))
    let bottom = Math.max(0, ...retained.map(item => item.y + item.h))
    const added = widgets.filter(item => !retainedIds.has(item.id)).map(item => {
      const { w, h } = item.gridItem
      const entry = { i: item.id, x: 0, y: bottom, w, h }
      bottom += h
      return entry
    })
    storage.setItem(key, JSON.stringify([...retained, ...added]))
    return
  }
}

/** 只收紧未移动或缩放过的旧默认设备卡，已经调整的个人布局保持原样。 */
export function migratePrivateAssetHeight(storage: Pick<Storage, 'getItem' | 'setItem'>,
  scope: string, width: number, access: PrivateOverviewAccess, showAccess: boolean,
  widgets: readonly PrivateOverviewWidget[]) {
  const current = widgets.find(item => item.panel === 'assets')
  if (!current || current.gridItem.h >= 9) return
  const key = privateOverviewLayoutStorageKey(scope, width, widgets)
  const marker = `${key}:asset-height-v1`
  if (storage.getItem(marker) !== null) return
  const previous = buildPrivateOverviewLayout(access, showAccess, width, true, false)
    .find(item => item.panel === 'assets')
  const raw = storage.getItem(key)
  if (previous && raw) {
    let saved
    try { saved = parseStoredLayout(JSON.parse(raw)) } catch { return }
    const item = saved?.find(entry => entry.i === current.id)
    const original = previous.gridItem
    if (saved && item && item.x === original.x && item.y === original.y
      && item.w === original.w && item.h === original.h) {
      storage.setItem(key, JSON.stringify(saved.map(entry => entry === item ? { ...entry, h: current.gridItem.h } : entry)))
    }
  }
  // 首次无缓存也标记完成，后续手动放大不会被误判为旧默认尺寸。
  storage.setItem(marker, '1')
}
