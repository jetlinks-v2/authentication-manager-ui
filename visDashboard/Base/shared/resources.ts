import { isSaaS } from '@jetlinks-web-core/utils/consts'
import type { HomeRow } from './types'
import { HOME_TARGETS } from './navigation'
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
// 私有化能力在资源入口统一筛选，SaaS 不展示该分组，也不触发对应统计。
.filter(row => !isSaaS || row.subgroup !== 'collection')
.map(row => ({ ...row, labelKey: row.id, target: HOME_TARGETS[row.id], icon: row.id }))
