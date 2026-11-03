import { parseStoredLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
import type { PrivateOverviewAccess } from '../../../../visDashboard/Base/Private/services/access'
import { privateOverviewLayoutMode, type PrivateOverviewWidget } from './layout'

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
    kpi: 4, access: access.applications ? 9 : 8, applications: 9, trend: 9, assets: 10, monitor: 10,
    alarms: mode === 'compact' || mode === 'stacked' ? 18 : Math.max(18, oldMainRows),
  }
  storage.setItem(key, JSON.stringify(saved.map(item => {
    const current = defaults.get(item.i)!
    // 改过宽度或高度的卡片沿用个人尺寸，其余卡片由网格在缩短后自然紧凑排列。
    return item.w === current.gridItem.w && item.h === oldHeights[current.panel]
      ? { ...item, h: Math.min(item.h, current.gridItem.h) } : item
  })))
}
