import { map, type Observable } from 'rxjs'
import type { MonitorQueryClient } from '../../monitoring/client'
import { parseVisionReviewSnapshot, parseVisionTrendSnapshot, recordOf } from './snapshot'
import { VISION_REVIEW_BEAN, VISION_TREND_BEAN, type VisionTrendGateway, type VisionTrendInterval, type VisionTrendSample, type VisionTrendTask } from './types'
import { currentMBeanValues, observeMBeans } from '../../monitoring/stream'

/** 视觉卡片只声明当前 MBean 与业务投影，采集、期限和释放与网关三指标共用。 */
export function observeVisionTrend(client: MonitorQueryClient, target: VisionTrendGateway, interval: VisionTrendInterval, includeReview = false): Observable<VisionTrendSample> {
  return observeMBeans(client, monitorBasePath(target), [
    { id: 'vision-trend', name: VISION_TREND_BEAN, attributes: ['Metrics'] },
    ...(includeReview ? [{ id: 'vision-review', name: VISION_REVIEW_BEAN, attributes: ['Metrics'] }] : []),
  ], interval).pipe(map(sample => {
    const review = sample.queryId === 'vision-review'
    const values = currentMBeanValues(sample, 'MonitorMetric', review ? 'AgentRuntimeReview' : 'ZLMediaAiTask', ['Metrics'])
    if (review) {
      if (!values) return { kind: 'review', error: sample.status === 'error' ? 'failed' : 'unsupported' }
      try { return { kind: 'review', snapshot: parseVisionReviewSnapshot(values.Metrics) } }
      catch { return { kind: 'review', error: 'failed' } }
    }
    if (!values) throw sample.status === 'error' ? new Error('CV monitor failed') : Object.assign(new Error('CV monitor unsupported'), { code: 'unsupported' })
    return { kind: 'cv', snapshot: parseVisionTrendSnapshot(values.Metrics) }
  }))
}

/** 组合详情的任务身份和名称都在 task 内；按目录顺序返回，纯操作记录不作为任务选项。 */
export async function loadVisionTrendTasks(client: MonitorQueryClient, target: VisionTrendGateway): Promise<VisionTrendTask[]> {
  const value = await client.post(monitorBasePath(target) + '/ai/task/edge/detail/_query/no-paging', {
    paging: false, terms: [{ column: 'domain', termType: 'eq', value: 'ComputerVision' }],
  })
  if (!Array.isArray(value)) throw new Error('Invalid CV task directory')
  const tasks = new Map<string, VisionTrendTask>()
  for (const detail of value) {
    const task = recordOf(recordOf(detail).task)
    if (typeof task.id !== 'string' || !task.id.trim() || typeof task.name !== 'string' || !task.name.trim()) continue
    tasks.set(task.id, { value: task.id, label: task.name })
  }
  return [...tasks.values()]
}

/** 边端直接访问本机，云端保持指定网关的代理与权限边界。 */
export const monitorBasePath = (target: VisionTrendGateway) => target.local ? '' : '/edge/device/' + encodeURIComponent(target.id) + '/_'
