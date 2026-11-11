import { parseStoredLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
import type { ResourcePageWidget } from './resourcePageCanvas'

function readScopedLayout(storage: Storage, key: string, ids: readonly string[], columns: number) {
  let layout
  try {
    layout = parseStoredLayout(JSON.parse(storage.getItem(key) || 'null'))
  } catch { return }
  const expected = new Set(ids)
  if (!layout || layout.length !== expected.size || new Set(layout.map(item => item.i)).size !== expected.size) return
  if (!layout.every(item => expected.has(item.i) && [item.x, item.y, item.w, item.h].every(Number.isInteger)
    && item.x >= 0 && item.y >= 0 && item.w > 0 && item.h > 0 && item.x + item.w <= columns)) return
  return layout
}

/** 合并同范围的地图/离线列表坐标，保留其他卡片及旧记录；分散或冲突时将组合卡放到底部。 */
export function migrateResourceDistributionLayout(
  storage: Storage, key: string, legacyKey: string, widgets: readonly ResourcePageWidget[], mapOnlyLegacyKey?: string,
) {
  const distribution = widgets.find(item => item.kind === 'distribution')
  if (!distribution || key === legacyKey) return
  try {
    if (storage.getItem(key) !== null) return
    const previousIds = widgets.flatMap(item => item.kind === 'distribution'
      ? ['resource-panel-map', 'resource-panel-offline'] : [item.id])
    // SaaS 早期只有独立地图；与已分开的地图/离线列表一样，只复制同账号作用域的坐标。
    const previous = readScopedLayout(storage, legacyKey, previousIds, 24)
      || (mapOnlyLegacyKey ? readScopedLayout(storage, mapOnlyLegacyKey,
        previousIds.filter(id => id !== 'resource-panel-offline'), 24) : undefined)
    if (!previous) return
    const map = previous.find(item => item.i === 'resource-panel-map')!
    const offline = previous.find(item => item.i === 'resource-panel-offline')
    const others = previous.filter(item => item !== map && item !== offline)
    const x = Math.min(map.x, offline?.x ?? map.x), y = Math.min(map.y, offline?.y ?? map.y)
    const bounds = { x, y, w: Math.max(map.x + map.w, offline ? offline.x + offline.w : 0) - x,
      h: Math.max(map.y + map.h, offline ? offline.y + offline.h : 0) - y }
    // 单地图不足以容纳组合内容时只扩充新卡，冲突则把新卡放到其他卡片之后。
    if (!offline) bounds.h = Math.max(bounds.h, distribution.gridItem.minH ?? 1)
    const adjacent = !offline || (map.y === offline.y && (map.x + map.w === offline.x || offline.x + offline.w === map.x))
      || (map.x === offline.x && map.w === offline.w && (map.y + map.h === offline.y || offline.y + offline.h === map.y))
    const overlaps = others.some(item => bounds.x < item.x + item.w && bounds.x + bounds.w > item.x
      && bounds.y < item.y + item.h && bounds.y + bounds.h > item.y)
    const fits = bounds.w >= (distribution.gridItem.minW ?? 1) && bounds.h >= (distribution.gridItem.minH ?? 1)
      && bounds.h <= (distribution.gridItem.maxH ?? 72)
    const geometry = adjacent && !overlaps && fits ? bounds : {
      x: 0, y: Math.max(0, ...others.map(item => item.y + item.h)), w: 24, h: distribution.gridItem.h,
    }
    storage.setItem(key, JSON.stringify([...others, { i: distribution.id, ...geometry }]))
  } catch {
    // 存储不可用或达到容量上限时继续使用默认布局，不删除原个人布局。
  }
}
