import type { VisionReviewSnapshot, VisionTrendPoint, VisionTrendSnapshot, VisionTrendSource } from './types'
import { appendRealtimeWindow } from '../../monitoring/window'
export const recordOf = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const numberOf = (value: unknown): number | null => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}
const fields = {
  'cv.task.inference.latency.avg': 'average',
  'cv.task.inference.latency.p95': 'p95',
  'cv.task.inference.success.5m': 'count',
  'cv.task.running_time': 'runningTime',
  'cv.task.inference.success.total': 'success',
} as const

/** 仅接纳当前活动任务及明确 notFound 的来源，缺失来源也保留，避免汇总悄悄少算。 */
export function parseVisionTrendSnapshot(value: unknown): VisionTrendSnapshot {
  const raw = recordOf(value), collectedAt = numberOf(raw.collectedAt)
  if (!collectedAt || !Number.isSafeInteger(collectedAt) || !Array.isArray(raw.tasks)
    || !Array.isArray(raw.samples) || !Array.isArray(raw.notFound)
    || raw.tasks.length + raw.notFound.length > 1024 || raw.samples.length > 25000) throw new Error('Invalid CV snapshot')
  const sources = new Map<string, VisionTrendSource>()
  for (const entry of [...raw.tasks, ...raw.notFound.map(task_key => ({ task_key }))]) {
    const task = recordOf(entry), key = task.task_key
    if (typeof key !== 'string' || !key.trim()) throw new Error('Invalid CV source identity')
    const parts = key.split('/')
    if (parts.length < 3 || parts.some(part => !part)) throw new Error('Invalid CV source identity')
    sources.set(key, { key, taskId: parts[0], average: null, p95: null, count: null, success: null, runningTime: null,
      firstInferenceTime: numberOf(task.first_inference_time) })
  }
  const seen = new Map<string, number | null>()
  for (const entry of raw.samples) {
    const sample = recordOf(entry), point = String(sample.point)
    if (!Object.hasOwn(fields, point)) continue
    const labels = recordOf(sample.labels)
    if (![labels.taskId, labels.modelId, labels.sourceId].every(value => typeof value === 'string' && value.trim())) throw new Error('Invalid CV labels')
    const key = [labels.taskId, labels.modelId, labels.sourceId].join('/'), source = sources.get(key)
    if (!source || source.taskId !== labels.taskId) throw Object.assign(new Error('CV source mismatch'), { code: 'identity' })
    if (numberOf(sample.timestamp) !== collectedAt) throw new Error('Mixed CV sample timestamps')
    const field = fields[point as keyof typeof fields], value = numberOf(sample.value)
    if (['count', 'success'].includes(field) && value !== null && !Number.isSafeInteger(value)) throw new Error('Invalid CV sample count')
    const identity = `${key}:${point}`
    if (seen.has(identity) && seen.get(identity) !== value) throw new Error('Conflicting CV sample')
    seen.set(identity, value)
    source[field] = value
  }
  const bindings = Array.isArray(raw.reviewTaskBindings) ? raw.reviewTaskBindings.map(recordOf)
    .filter((binding): binding is { taskId: string; skillId: string } => typeof binding.taskId === 'string' && !!binding.taskId && typeof binding.skillId === 'string' && !!binding.skillId)
    .map(({ taskId, skillId }) => ({ taskId, skillId })) : []
  return { collectedAt, sources: [...sources.values()], bindings }
}

/** 与任务详情相同，均值按近五分钟成功次数加权；分位数仅取来源最大值，绝不平均 P95。 */
export function projectVisionTrend(snapshot: VisionTrendSnapshot, taskId: string): VisionTrendPoint {
  const sources = snapshot.sources.filter(source => source.taskId === taskId)
  const active = sources.filter(source => source.count !== 0)
  let average: number | null = null
  if (sources.length === 1) average = sources[0].count === 0 ? null : sources[0].average
  else if (sources.length && sources.every(source => source.count !== null) && active.every(source => source.average !== null)) {
    const count = active.reduce((sum, source) => sum + source.count!, 0)
    if (count > 0 && Number.isSafeInteger(count)) average = active.reduce((sum, source) => sum + source.average! * source.count! / count, 0)
  }
  const p95 = active.length && active.every(source => source.p95 !== null) ? Math.max(...active.map(source => source.p95!)) : null
  // 累计成功数按当前任务来源求和，保持原累计值；不能用五分钟次数替代或再次差分。
  const success = sources.length && sources.every(source => source.success !== null)
    ? sources.reduce((sum, source) => sum + source.success!, 0) : null
  return { time: snapshot.collectedAt, average: average !== null && Number.isFinite(average) ? average : null, p95, sources: sources.length,
    success: success !== null && Number.isSafeInteger(success) ? success : null, pending: null }
}

/** 仅解析有明确任务或 Skill 维度的复判积压；节点全局队列不能冒充当前任务。 */
export function parseVisionReviewSnapshot(value: unknown): VisionReviewSnapshot {
  const raw = recordOf(value), collectedAt = numberOf(raw.collectedAt)
  if (!collectedAt || !Number.isSafeInteger(collectedAt) || !Array.isArray(raw.samples) || raw.samples.length > 25000) throw new Error('Invalid review snapshot')
  const pending: VisionReviewSnapshot['pending'] = []
  for (const entry of raw.samples) {
    const sample = recordOf(entry)
    if (sample.point !== 'review.dimension.pending') continue
    const labels = recordOf(sample.labels), value = numberOf(sample.value), time = numberOf(sample.timestamp)
    if (value === null || !Number.isSafeInteger(value) || !time || !Number.isSafeInteger(time)) throw new Error('Invalid review backlog')
    const taskId = typeof labels.taskId === 'string' ? labels.taskId : ''
    const skillId = labels.dimensionType === 'skill' && typeof labels.dimensionId === 'string' ? labels.dimensionId : ''
    if (taskId || skillId) pending.push({ taskId, skillId, value, time })
  }
  return { collectedAt, pending }
}

/** Skill 维度必须唯一且独占绑定当前任务；共享或多重绑定保持缺失，绝不混入其他任务。 */
export function projectVisionReview(cv: VisionTrendSnapshot, review: VisionReviewSnapshot, taskId: string): VisionTrendPoint {
  let matches = review.pending.filter(sample => !!taskId && sample.taskId === taskId)
  if (!matches.length && taskId) {
    const skills = [...new Set(cv.bindings.filter(binding => binding.taskId === taskId).map(binding => binding.skillId))]
    if (skills.length === 1 && !cv.bindings.some(binding => binding.skillId === skills[0] && binding.taskId !== taskId)) {
      matches = review.pending.filter(sample => !sample.taskId && sample.skillId === skills[0])
    }
  }
  const match = matches.length === 1 ? matches[0] : undefined
  return { time: match?.time ?? review.collectedAt, average: null, p95: null, sources: 0, success: null, pending: match?.value ?? null }
}

/** 来源变化、运行时间回退或首帧身份变化均分段，避免任务重启前后被画成连续观测。 */
export function visionTrendRestarted(before: VisionTrendSnapshot, after: VisionTrendSnapshot, taskId: string): boolean {
  const previous = before.sources.filter(source => source.taskId === taskId)
  const current = after.sources.filter(source => source.taskId === taskId)
  const byKey = new Map(previous.map(source => [source.key, source]))
  return previous.length !== current.length || current.some(source => {
    const old = byKey.get(source.key)
    return !old || old.firstInferenceTime !== source.firstInferenceTime
      || (old.runningTime !== null && source.runningTime !== null && source.runningTime < old.runningTime)
  })
}

/** 本页只保存最近一分钟、最多 61 点；断线和暂停插入空值，旧样本不覆盖新样本。 */
export function appendVisionTrend(points: VisionTrendPoint[], point: VisionTrendPoint, intervalMs: number, interrupted = false): VisionTrendPoint[] {
  return appendRealtimeWindow(points, point, intervalMs, {
    time: value => value.time,
    gap: time => ({ time, average: null, p95: null, sources: 0, success: null, pending: null }),
  }, interrupted)
}
