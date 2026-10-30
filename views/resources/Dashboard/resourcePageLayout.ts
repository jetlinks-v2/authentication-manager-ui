import type { ResourcePageAccess, ResourcePageCell } from './resourcePage.types'

/** 依实际能力拼行；筛掉缺失项后补齐行宽，避免仅物联留下视频卡片空洞。 */
export function buildResourcePageLayout(access: ResourcePageAccess): ResourcePageCell[] {
  const cells: ResourcePageCell[] = []
  const sparse = !access.edge && !access.networkCards && !access.collection
  if (sparse) {
    if (access.iot) {
      cells.push({ id: 'message', panels: ['message'], span: 3 }, { id: 'online', panels: ['online'], span: 3 })
    }
    if (access.map) cells.push({ id: 'map', panels: ['map'], span: 6, offline: access.iot })
    return cells
  }
  if (access.iot) cells.push({ id: 'message', panels: ['message'], span: access.map ? 4 : 6 })
  if (access.map) cells.push({ id: 'map', panels: ['map'], span: access.iot ? 2 : 6 })
  let collectionStack = false
  if (access.edge) {
    const companion = access.video && access.vision ? 'vision' : access.collection ? 'collection' : access.iot ? 'online' : undefined
    cells.push({ id: 'gateway', panels: ['gateway'], span: companion ? 3 : 6 })
    if (companion === 'collection') {
      collectionStack = true
      cells.push({ id: 'collection', panels: ['points', 'protocols'], span: 3 })
    } else if (companion) cells.push({ id: companion, panels: [companion], span: 3 })
  }
  if (access.networkCards) {
    cells.push({ id: 'traffic', panels: ['traffic'], span: 4 }, { id: 'pools', panels: ['pools'], span: 2 })
  }
  if (access.collection && !collectionStack) {
    cells.push({ id: 'points', panels: ['points'], span: 3 }, { id: 'protocols', panels: ['protocols'], span: 3 })
  }
  return cells
}
