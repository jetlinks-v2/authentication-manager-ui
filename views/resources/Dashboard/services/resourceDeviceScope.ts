import { buildOverviewDeviceTerms, type OverviewDeviceTerm } from '../../../../api/overview'
import type { ResourcePageAccess } from '../resourcePage.types'

type ResourceDeviceTerm = OverviewDeviceTerm | { type?: 'and' | 'or'; terms: ResourceDeviceTerm[] }

export interface ResourceDeviceScope {
  terms: ResourceDeviceTerm[]
  listType: 'device' | 'video' | 'gateway' | 'all'
}

/** 地图与最近离线共享当前可见的设备分类；外层分组确保分类 OR 不会绕过离线/ID 条件。 */
export function buildResourceDeviceScope(access: ResourcePageAccess): ResourceDeviceScope {
  const kinds = (['iot', 'video', 'edge'] as const).filter(kind => access[kind])
  const terms: ResourceDeviceTerm[] = kinds.length
    ? [{ terms: kinds.map((kind, index) => ({ type: index ? 'or' : 'and', terms: buildOverviewDeviceTerms(kind) })) }]
    : [{ column: 'id', termType: 'in', value: [] }]
  const listTypes = { iot: 'device', video: 'video', edge: 'gateway' } as const
  return { terms, listType: kinds.length === 1 ? listTypes[kinds[0]] : 'all' }
}
