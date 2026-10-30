import { request } from '@jetlinks-web/core'
import { recordOf, rowsOf, textOf } from '../../shared/apiResult'

interface AlgorithmSummary { total: number; edgeEnabled?: number; edgeDisabled?: number }

/** 算法页以场景及目标组合标识算法；重复返回的同一目标不能重复计数。 */
export function saasAlgorithmKeys(scenes: Record<string, unknown>[]): Set<string> {
  const keys = new Set<string>()
  for (const scene of scenes) {
    const sceneId = textOf(scene.id)
    if (!sceneId || (scene.children !== undefined && !Array.isArray(scene.children))) throw new Error('Invalid algorithm scene')
    for (const item of (scene.children ?? []) as unknown[]) {
      const target = textOf(recordOf(item).value)
      if (!target) throw new Error('Invalid algorithm target')
      keys.add(JSON.stringify([sceneId, target]))
    }
  }
  return keys
}

/** 边端至少一路开启的有效场景目标算作已启用算法，不能把通道数相加当作算法数。 */
export function countSaasEnabledAlgorithms(keys: ReadonlySet<string>, coverage: Record<string, unknown>[]): number {
  const enabled = new Set<string>()
  for (const row of coverage) {
    const sceneId = textOf(row.sceneId)
    const target = textOf(recordOf(row.taskTarget).value || row.taskTarget)
    const count = row.channelCount
    if (!sceneId || !target || typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
      throw new Error('Invalid algorithm coverage')
    }
    const key = JSON.stringify([sceneId, target])
    if (keys.has(key) && count > 0) enabled.add(key)
  }
  return enabled.size
}

/** 总数与边端启用状态独立加载；边端接口失败时仍保留已确认总数，状态显示未知。 */
export async function loadSaasAlgorithmSummary(includeEdge: boolean): Promise<AlgorithmSummary> {
  const [scenes, coverage] = await Promise.allSettled([
    request.post('/ai/scene/tree/_query/no-paging', { paging: false }, { hiddenError: true }).then(rowsOf),
    includeEdge
      ? request.get('/ai/edge/task/coverage/scene/_counts', {}, { hiddenError: true }).then(rowsOf)
      : Promise.resolve(undefined),
  ])
  if (scenes.status === 'rejected') throw scenes.reason
  const keys = saasAlgorithmKeys(scenes.value)
  if (includeEdge && !keys.size) return { total: 0, edgeEnabled: 0, edgeDisabled: 0 }
  if (coverage.status === 'rejected' || !coverage.value) return { total: keys.size }
  try {
    const edgeEnabled = countSaasEnabledAlgorithms(keys, coverage.value)
    return { total: keys.size, edgeEnabled, edgeDisabled: keys.size - edgeEnabled }
  } catch {
    return { total: keys.size }
  }
}
