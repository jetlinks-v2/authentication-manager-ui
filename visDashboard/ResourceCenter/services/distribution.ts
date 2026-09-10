import { request } from '@jetlinks-web/core'
import { queryOverviewDeviceIds } from '../../../api/overview'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'
import type { Datum, DeviceKind } from '../shared'

/** 展开空间树保留直属统计维度，不将子空间数量叠加到父空间。 */
export function flattenSpaces(rows: Record<string, unknown>[]): { id: string; name: string }[] {
  const spaces = new Map<string, { id: string; name: string }>()
  const visit = (items: Record<string, unknown>[]) => {
    for (const row of items) {
      const id = textOf(row.id)
      if (id) spaces.set(id, { id, name: textOf(row.name) || id })
      if (Array.isArray(row.children)) visit(row.children.map(recordOf))
    }
  }
  visit(rows)
  return [...spaces.values()]
}

/** 同空间目标去重；视频通道以边缘节点、设备、通道组合标识，避免不同网关的通道 ID 相撞。 */
export function mapDistribution(spaces: { id: string; name: string }[], bindings: Record<string, unknown>[], kind: DeviceKind, deviceIds = new Set<string>()): Datum[] {
  const buckets = new Map<string, Set<string>>()
  for (const row of bindings) {
    const spaceId = textOf(row.spaceId), device = textOf(row.deviceId), edge = textOf(row.edgeDeviceId)
    const channel = textOf(row.channelRecordId) || textOf(row.channelId)
    let target = ''
    if (kind === 'video' && channel) target = JSON.stringify([edge, device, channel])
    if (kind === 'iot' && !channel && deviceIds.has(device)) target = device
    if (kind === 'edge') target = deviceIds.has(edge) ? edge : deviceIds.has(device) ? device : ''
    if (!spaceId || !target) continue
    if (!buckets.has(spaceId)) buckets.set(spaceId, new Set())
    buckets.get(spaceId)!.add(target)
  }
  return spaces.map(space => ({ ...space, value: buckets.get(space.id)?.size || 0 }))
}

/** 分批查询空间绑定，统计全部已授权空间；限制仅作用于展示，不截断取数。 */
export async function loadDistribution(kind: DeviceKind): Promise<Datum[]> {
  const spaces = flattenSpaces(rowsOf(await request.post('/space/_query/tree', {
    paging: false, sorts: [{ name: 'sortIndex', order: 'asc' }],
  }, { hiddenError: true })))
  if (!spaces.length) return []
  const ids = kind === 'video' ? new Set<string>() : await queryOverviewDeviceIds(kind)
  const bindings: Record<string, unknown>[] = []
  for (let index = 0; index < spaces.length; index += 100) {
    bindings.push(...rowsOf(await request.post('/space/data-bind/_query/no-paging', {
      paging: false, terms: [{ column: 'spaceId', termType: 'in', value: spaces.slice(index, index + 100).map(space => space.id) }],
    }, { hiddenError: true })))
  }
  return mapDistribution(spaces, bindings, kind, ids)
}
