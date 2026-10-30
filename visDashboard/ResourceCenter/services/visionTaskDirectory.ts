import { request } from '@jetlinks-web/core'
import { rowsOf, textOf } from '../../Base/shared/apiResult'

interface VisionGateway { id: string; online: boolean }
export interface VisionTaskDirectory {
  byGateway: Map<string, Record<string, unknown>[]>
  incomplete: boolean
  failed: boolean
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
        // EdgeAiTaskController 没有默认领域过滤，沿用 AI 任务列表的 ComputerVision 范围。
        const tasks = rowsOf(await request.post(`/edge/device/${encodeURIComponent(gateway.id)}/_/ai/task/edge/detail/_query/no-paging`, {
          paging: false, terms: [{ column: 'domain', termType: 'eq', value: 'ComputerVision' }],
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
