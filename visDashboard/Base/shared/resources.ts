import { isSaaS } from '@jetlinks-web-core/utils/consts'
import type { HomeFeature, HomeRow } from './types'
import { HOME_TARGETS } from './navigation'
import { getDashboardModules, type DashboardModules } from '../../useDashboardModules'

/** 资源项、健康统计与快捷操作共用模块准入；业务零值仍按原有空态展示。 */
export const resourceRowAvailable = (row: Pick<HomeRow, 'id'>, modules: DashboardModules = getDashboardModules()) => {
  if (row.id === 'model') return modules.model
  if (row.id === 'gateway') return modules.edge
  if (row.id === 'collector') return modules.collection
  if (row.id === 'card') return modules.networkCards
  if (['algorithm', 'visionAlarm', 'alarm'].includes(row.id)) return modules.vision
  if (row.id === 'coverage') return modules.vision && modules.edge
  return true
}

/** 复合卡有任一独立能力即可保留；智能体不依赖视觉任务，SaaS 沿用不展示智能体的约定。 */
export function homeFeatureAvailable(feature: HomeFeature, modules: DashboardModules, saas = isSaaS): boolean {
  if (feature === 'Collection') return modules.collection || modules.networkCards
  if (feature === 'AiCenter') return !saas || modules.vision
  return true
}

/** 单一采集能力使用对应标题，避免标题仍承诺已隐藏的另一种资源。 */
export function homeTitleKey(feature: HomeFeature, modules: DashboardModules): string {
  return feature === 'Collection' && !(modules.collection && modules.networkCards)
    ? modules.collection ? 'collector' : 'card'
    : feature
}

/** 私有化按实际项交错均分网格；SaaS 保留素材、作品两列分组。 */
export function visualizationGroups(rows: HomeRow[]): HomeRow[][] {
  const assets = rows.filter(row => row.subgroup === 'assets')
  const screens = rows.filter(row => row.subgroup === 'screens')
  if (isSaaS) return [assets, screens]
  return Array.from({ length: Math.max(assets.length, screens.length) }, (_, index) => [assets[index], screens[index]])
    .flat().filter((row): row is HomeRow => Boolean(row)).map(row => [row])
}
export const RESOURCE_ROWS: HomeRow[] = [
  { id: 'devices', group: 'access', subgroup: 'devices', value: 24 },
  { id: 'video', group: 'access', subgroup: 'devices', value: 18 },
  { id: 'gateway', group: 'access', subgroup: 'devices', value: 10 },
  { id: 'collector', group: 'access', subgroup: 'collection', value: 6 },
  { id: 'card', group: 'access', subgroup: 'collection', value: 42 },
  { id: 'screen', group: 'visualization', subgroup: 'screens', value: 12 },
  { id: 'template', group: 'visualization', subgroup: 'screens', value: 18 },
  { id: 'image', group: 'visualization', subgroup: 'assets', value: 356 },
  { id: 'component', group: 'visualization', subgroup: 'assets', value: 48 },
  { id: 'model', group: 'visualization', subgroup: 'assets', value: 26 },
  { id: 'agent', group: 'intelligence', subgroup: 'ai', value: 9 },
  { id: 'algorithm', group: 'intelligence', subgroup: 'ai', value: 16 },
  { id: 'coverage', group: 'intelligence', subgroup: 'ai', value: 45 },
  { id: 'scene', group: 'intelligence', subgroup: 'rules', value: 14 },
]
// 采集器与物联网卡在运行时按能力筛选；仅保留原有 SaaS 不展示智能体的约定。
.filter(row => !isSaaS || row.id !== 'agent')
.map(row => ({ ...row, labelKey: row.id, descriptionKey: `${row.id}Desc`, target: HOME_TARGETS[row.id], icon: row.id }))
