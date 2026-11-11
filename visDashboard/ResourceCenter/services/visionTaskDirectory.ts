import { request } from '@jetlinks-web/core'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'

interface VisionGateway { id: string; online: boolean }
export interface VisionTaskDirectory {
  byGateway: Map<string, Record<string, unknown>[]>
  incomplete: boolean
  failed: boolean
}

/** 新版详情将真实任务放在 task 中；仅操作记录不计入目录，云端来源名称仍取外层字段。 */
export function visionTaskDetailsOf(response: unknown): Record<string, unknown>[] {
  return rowsOf(response).filter(detail => detail.task != null).map(detail => ({
    ...recordOf(detail.task), cloudChannelName: detail.cloudChannelName,
  }))
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
        // 组合详情也包含待创建操作，目录只统计 ComputerVision 范围内的真实任务。
        const tasks = visionTaskDetailsOf(await request.post(`/edge/device/${encodeURIComponent(gateway.id)}/_/ai/task/edge/detail/_query/no-paging`, {
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
