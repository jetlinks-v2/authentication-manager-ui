import { request } from '@jetlinks-web/core'
import i18n from '@jetlinks-web-core/locales'
import {
  buildOverviewDeviceTerms,
  type OverviewDeviceTerm,
} from '../../../api/overview'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'
import type { Datum, DeviceKind } from '../shared'

type Space = { id: string; name: string }
type SpaceScope = Space & { spaceIds: string[] }
type SummaryRequest = { id: string; query: { pageIndex: number; pageSize: number; sorts: object[]; terms: OverviewDeviceTerm[] } }

export const UNBOUND_AREA_ID = '__iot-unbound-area__'
const areaSummaryId = (spaceId: string) => `area:${spaceId}`

/** 展开空间树保留直属统计维度，不将子空间数量叠加到父空间。 */
export function flattenSpaces(rows: Record<string, unknown>[]): Space[] {
  const spaces = new Map<string, Space>()
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

/** 一级区域包含自身及全部子区域，与设备列表区域侧栏的选择和统计口径一致。 */
export function buildRootSpaceScopes(rows: Record<string, unknown>[]): SpaceScope[] {
  const collectIds = (row: Record<string, unknown>): string[] => {
    const ids = [textOf(row.id)].filter(Boolean)
    if (Array.isArray(row.children)) {
      for (const child of row.children) ids.push(...collectIds(recordOf(child)))
    }
    return [...new Set(ids)]
  }
  return rows.map((row) => {
    const id = textOf(row.id)
    return { id, name: textOf(row.name) || id, spaceIds: collectIds(row) }
  }).filter(scope => Boolean(scope.id))
}

/** 复用设备列表的聚合查询：一级区域统计子树，最后追加未绑定区域。 */
export function buildDeviceDistributionRequests(
  scopes: SpaceScope[],
  allSpaceIds: string[],
  baseTerms: OverviewDeviceTerm[],
): SummaryRequest[] {
  const query = (terms: OverviewDeviceTerm[]) => ({
    pageIndex: 0,
    pageSize: 0,
    sorts: [{ name: 'createTime', order: 'desc' }],
    terms: [...baseTerms, ...terms],
  })
  return [
    ...scopes.map(scope => ({
      id: areaSummaryId(scope.id),
      query: query([{
        column: 'id',
        termType: 'space-bind$device',
        value: scope.spaceIds.length === 1 ? scope.spaceIds[0] : scope.spaceIds,
      }]),
    })),
    {
      id: UNBOUND_AREA_ID,
      query: query(allSpaceIds.length ? [{
        column: 'id',
        termType: 'space-bind$not$device',
        value: allSpaceIds.length === 1 ? allSpaceIds[0] : allSpaceIds,
      }] : []),
    },
  ]
}

/** 将聚合响应映射为与设备列表一致的一级区域和未绑定区域分布。 */
export function mapDeviceDistribution(
  scopes: SpaceScope[],
  summaries: Record<string, unknown>[],
  unboundName: string,
): Datum[] {
  const counts = new Map<string, number>()
  for (const row of summaries) {
    const id = textOf(row.id)
    const count = Number(row.deviceCount ?? row.total)
    if (!id || !Number.isFinite(count) || count < 0) continue
    counts.set(id, count)
  }
  return [
    ...scopes.map(scope => ({ id: scope.id, name: scope.name, value: counts.get(areaSummaryId(scope.id)) ?? 0 })),
    { id: UNBOUND_AREA_ID, name: unboundName, value: counts.get(UNBOUND_AREA_ID) ?? 0 },
  ]
}

/** 视频设备保留原有口径：按空间绑定记录统计，并在同一空间内按通道归属去重。 */
export function mapVideoDistribution(
  spaces: Space[],
  bindings: Record<string, unknown>[],
): Datum[] {
  const buckets = new Map<string, Set<string>>()
  for (const row of bindings) {
    const spaceId = textOf(row.spaceId)
    const channel = textOf(row.channelRecordId) || textOf(row.channelId)
    if (!spaceId || !channel) continue
    const target = JSON.stringify([textOf(row.edgeDeviceId), textOf(row.deviceId), channel])
    if (!buckets.has(spaceId)) buckets.set(spaceId, new Set())
    buckets.get(spaceId)!.add(target)
  }
  return spaces.map(space => ({ ...space, value: buckets.get(space.id)?.size ?? 0 }))
}

/** 分批查询空间绑定，统计全部已授权空间；限制仅作用于展示，不截断取数。 */
export async function loadDistribution(kind: DeviceKind): Promise<Datum[]> {
  const tree = rowsOf(await request.post('/space/_query/tree', {
    paging: false, sorts: [{ name: 'sortIndex', order: 'asc' }],
  }, { hiddenError: true }))
  const spaces = flattenSpaces(tree)

  if (kind !== 'video') {
    const scopes = buildRootSpaceScopes(tree)
    const summaries = rowsOf(await request.post(
      '/device/group/device/_summary/_batch',
      buildDeviceDistributionRequests(scopes, spaces.map(space => space.id), buildOverviewDeviceTerms(kind)),
      { hiddenError: true },
    ))
    return mapDeviceDistribution(scopes, summaries, i18n.global.t('resourceDashboard.unboundArea'))
  }

  if (!spaces.length) return []
  const bindings: Record<string, unknown>[] = []
  for (let index = 0; index < spaces.length; index += 100) {
    bindings.push(...rowsOf(await request.post('/space/data-bind/_query/no-paging', {
      paging: false, terms: [{ column: 'spaceId', termType: 'in', value: spaces.slice(index, index + 100).map(space => space.id) }],
    }, { hiddenError: true })))
  }
  return mapVideoDistribution(spaces, bindings)
}
