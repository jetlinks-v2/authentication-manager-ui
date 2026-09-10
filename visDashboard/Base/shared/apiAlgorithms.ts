import { request } from '@jetlinks-web/core'
import { rowsOf, recordOf, textOf } from './apiResult'
const enumValue = (value: unknown) => textOf(recordOf(value).value || value)
/** 与算法中心一致：只将边端状态已确认的 enabled 绑定计入；执行中/未知结果不冒充精确统计。 */
export const summarizeAlgorithms = (records: Record<string, unknown>[]) => {
  const algorithms = new Set<string>(), channels = new Set<string>()
  for (const row of records) {
    const status = enumValue(row.status)
    if (['submittable', 'pending', 'running'].includes(status) || row.edgeTaskStatusQueried !== true || enumValue(row.state) !== 'normal') throw new Error('Algorithm binding state not confirmed')
    const info = recordOf(row.info)
    if (enumValue(info.state) !== 'enabled') continue
    const sceneId = textOf(info.sceneId || row.sceneId), taskTarget = textOf(info.taskTarget || row.taskTarget)
    const gatewayId = textOf(row.gatewayId), channelId = textOf(info.cloudChannelId || row.cloudChannelId)
    if (!sceneId || !taskTarget || !gatewayId || !channelId) throw new Error('Incomplete algorithm binding')
    algorithms.add(JSON.stringify([sceneId, taskTarget]))
    channels.add(JSON.stringify([gatewayId, channelId]))
  }
  return { algorithm: algorithms.size, coverage: channels.size }
}
const loadBindingMetrics = async () => summarizeAlgorithms(rowsOf(await request.post(
  '/ai/edge/task/operation/execution/detail/_query/no-paging',
  { paging: false, terms: [], sorts: [{ name: 'lastSubmitTime', order: 'desc' }] },
  { hiddenError: true },
)))

/** 算法对应场景的直属子项，父场景及更深层配置节点不计入数量。 */
export const countSceneAlgorithms = (scenes: Record<string, unknown>[]): number => scenes.reduce(
  (total, scene) => total + (Array.isArray(scene.children) ? scene.children.length : 0), 0,
)

/** 算法数量与覆盖通道独立查询，单项失败不吞掉另一项的有效统计。 */
export const loadAlgorithmMetrics = async (): Promise<{ algorithm?: number; coverage?: number }> => {
  const [algorithm, coverage] = await Promise.allSettled([
    request.post('/ai/scene/tree/_query/no-paging', { paging: false }, { hiddenError: true })
      .then(response => countSceneAlgorithms(rowsOf(response))),
    loadBindingMetrics().then(result => result.coverage),
  ])
  return {
    algorithm: algorithm.status === 'fulfilled' ? algorithm.value : undefined,
    coverage: coverage.status === 'fulfilled' ? coverage.value : undefined,
  }
}
