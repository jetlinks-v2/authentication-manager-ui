import type { ResourcePageAccess, ResourcePageCell } from './resourcePage.types'

/** 依实际能力拼行；筛掉缺失项后补齐行宽，避免仅物联留下视频卡片空洞。 */
export function buildResourcePageLayout(access: ResourcePageAccess, nodeCount?: number): ResourcePageCell[] {
  const cells: ResourcePageCell[] = []
  const sparse = access.iot && !access.edge && !access.networkCards && !access.networkPools && !access.collection
  if (sparse) {
    if (access.iot) {
      cells.push({ id: 'message', panels: ['message'], span: 3 }, { id: 'online', panels: ['online'], span: 3 })
    }
    if (access.map) cells.push({ id: 'map', panels: ['map'], span: 6, offline: true })
    return cells
  }
  if (access.iot) cells.push({ id: 'message', panels: ['message'], span: access.map ? 4 : 6 })
  if (access.map) cells.push({ id: 'map', panels: ['map'], span: access.iot ? 2 : 6,
    ...(!access.iot ? { offline: true } : {}) })
  let collectionStack = false
  if (access.edge) {
    // 少节点表格较矮，采集两卡改为独立一行，避免把节点表格拉出大片空白。
    const stackCollection = access.collection && !(access.iot && nodeCount !== undefined && nodeCount <= 3)
    const companion = access.video && access.vision ? 'vision' : stackCollection ? 'collection' : access.iot ? 'online' : undefined
    cells.push({ id: 'gateway', panels: ['gateway'], span: companion ? 3 : 6 })
    if (companion === 'collection') {
      collectionStack = true
      cells.push({ id: 'collection', panels: ['points', 'protocols'], span: 3 })
    } else if (companion) cells.push({ id: companion, panels: [companion], span: 3 })
  }
  // 流量池有独立菜单授权，不能从物联卡管理权限推导；单侧可见时占满行。
  if (access.networkCards) cells.push({ id: 'traffic', panels: ['traffic'], span: access.networkPools ? 3.5 : 6 })
  if (access.networkPools) cells.push({ id: 'pools', panels: ['pools'], span: access.networkCards ? 2.5 : 6 })
  if (access.collection && !collectionStack) {
    cells.push({ id: 'points', panels: ['points'], span: 3 }, { id: 'protocols', panels: ['protocols'], span: 3 })
  }
  return cells
}
