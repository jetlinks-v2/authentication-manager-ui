import { request } from '@jetlinks-web/core'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'

interface VisionGateway { id: string; online: boolean }
export interface VisionTaskDirectory {
  byGateway: Map<string, Record<string, unknown>[]>
  incomplete: boolean
  failed: boolean
}

/** 解包真实任务并保留外层来源信息；纯操作记录不计入目录，存量扁平详情仍沿用原身份。 */
export function visionTasksOf(response: unknown): Record<string, unknown>[] {
  return rowsOf(response).flatMap(detail => {
    if (!('task' in detail) && !('operation' in detail)) return [detail]
    if (detail.task === null || detail.task === undefined) return []
    const { task, ...metadata } = detail
    return [{ ...metadata, ...recordOf(task) }]
  })
}

/** 少量节点才查询完整目录；离线/失败表示未知，不能当作没有任务。 */
export async function loadVisionTaskDirectory(
  gateways: readonly VisionGateway[], isCurrent: () => boolean,
): Promise<VisionTaskDirectory> {
  const result: VisionTaskDirectory = {
    byGateway: new Map(), incomplete: gateways.some(gateway => !gateway.online), failed: false,
  }
  const online = gateways.filter(gateway => gateway.online)
  let cursor = 0
  if (!isCurrent()) throw new Error('Task directory query cancelled')
  await Promise.all(Array.from({ length: Math.min(3, online.length) }, async () => {
    while (cursor < online.length && isCurrent()) {
      const gateway = online[cursor++]
      try {
        // 与 AI 任务列表一样限定真实视觉任务，组合详情接口的筛选字段属于 task。
        const tasks = visionTasksOf(await request.post(`/edge/device/${encodeURIComponent(gateway.id)}/_/ai/task/edge/detail/_query/no-paging`, {
          paging: false, terms: [
            { column: 'task.domain', termType: 'eq', value: 'ComputerVision' },
            { column: 'task.id', termType: 'notnull', value: '' },
          ],
        }, { hiddenError: true, timeout: 15000 }))
        if (!isCurrent()) return
        if (tasks.some(task => !textOf(task.id).trim())) {
          result.incomplete = true
          result.failed = true
        }
        result.byGateway.set(gateway.id, [...new Map(tasks.filter(task => textOf(task.id).trim())
          .map(task => [textOf(task.id), task])).values()])
      } catch (error) {
        if (!isCurrent()) throw error
        result.incomplete = true
        result.failed = true
      }
    }
  }))
  if (!isCurrent()) throw new Error('Task directory query cancelled')
  return result
}
