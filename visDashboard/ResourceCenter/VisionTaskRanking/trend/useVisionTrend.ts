import { computed, onScopeDispose, reactive, ref, shallowRef, watch, type Ref } from 'vue'
import type { Subscription } from 'rxjs'
import { createMonitorQueryClient } from '../../monitoring/client'
import { emptyRuntimeState, type RuntimeErrorCode, type RuntimeState } from '../../monitoring/state'
import { rejectRuntimeState, realtimeRetryAt } from '../../monitoring/state'
import { appendVisionTrend, projectVisionReview, projectVisionTrend, visionTrendRestarted } from './snapshot'
import { loadVisionTrendTasks, observeVisionTrend } from './service'
import type { VisionReviewSnapshot, VisionTrendGateway, VisionTrendInterval, VisionTrendMetric, VisionTrendPoint, VisionTrendSnapshot, VisionTrendTask } from './types'

/** 当前节点先读取真实任务目录，再为选中任务采样；三个指标共用一个受控采集流。 */
export function useVisionTrend(gateways: Readonly<Ref<VisionTrendGateway[]>>, enabled: Readonly<Ref<boolean>>, identity: Readonly<Ref<string>>) {
  // 宿主提供账号/API范围与可见性，范围变化立即失效旧订阅。
  const scope = { key: identity, active: enabled, read: () => identity.value, sync: () => identity.value }
  const gatewayId = ref(''), taskId = ref(''), interval = ref<VisionTrendInterval>(2), metric = ref<VisionTrendMetric>('latency')
  const gateway = computed(() => gateways.value.find(item => item.id === gatewayId.value))
  const collection = reactive<RuntimeState<VisionTrendPoint[]>>(emptyRuntimeState())
  const tasks = shallowRef<VisionTrendTask[]>([])
  const latest = shallowRef<VisionTrendSnapshot>(), review = shallowRef<VisionReviewSnapshot>()
  const cvPoints = shallowRef<VisionTrendPoint[]>(), reviewPoints = shallowRef<VisionTrendPoint[]>()
  const reviewError = ref<RuntimeErrorCode>(), reviewLoading = ref(false)
  const state = computed<RuntimeState<VisionTrendPoint[]>>(() => {
    const data = metric.value === 'pending' ? reviewPoints.value : cvPoints.value
    return { ...collection, data, loading: collection.loading || metric.value === 'pending' && reviewLoading.value,
      error: collection.error ?? (metric.value === 'pending' ? reviewError.value : undefined),
      updatedAt: data?.at(-1)?.time }
  })
  let revision = 0, disposed = false, catalogLoaded = false, cvInterrupted = true, reviewInterrupted = true
  let subscription: Subscription | undefined, timer: ReturnType<typeof setTimeout> | undefined
  let sourceStartedAt: number | undefined

  /** 页面重新进入时仅观察本次会话，不恢复之前页面或源端的历史。 */
  function clearHistory() {
    latest.value = undefined; review.value = undefined; sourceStartedAt = undefined
    cvPoints.value = undefined; reviewPoints.value = undefined; reviewError.value = undefined
  }

  /** 取消流与重试，并隔离迟到的任务目录、节点发现和采样结果。 */
  function stop() {
    revision++
    subscription?.unsubscribe(); subscription = undefined
    clearTimeout(timer); timer = undefined
    collection.loading = false; reviewLoading.value = false
    cvInterrupted = true; reviewInterrupted = true
  }

  /** 复判沿用其生成时间；同一缓存快照不能随 CV 心跳重复延长曲线。 */
  function appendReview() {
    if (!latest.value || !review.value || !taskId.value) return
    const point = projectVisionReview(latest.value, review.value, taskId.value)
    if (sourceStartedAt !== undefined && point.time < sourceStartedAt) return
    if (reviewPoints.value?.length && point.time <= reviewPoints.value.at(-1)!.time) return
    reviewPoints.value = appendVisionTrend(reviewPoints.value ?? [], point, interval.value * 1000, reviewInterrupted)
    reviewInterrupted = false
  }

  /** 同一任务刷新保留有断点的曲线；任务目录只在首次、切换节点或手动刷新时重读。 */
  function refresh(reloadTasks = false) {
    scope.sync(); stop()
    if (disposed || !scope.active.value || !gateway.value) return
    if (!gateway.value.online) { rejectRuntimeState(collection, { code: 'unavailable' }, Date.now()); return }
    const version = revision, identity = scope.read(), target = gateway.value
    const current = () => !disposed && version === revision && identity === scope.read() && scope.active.value && gateway.value?.online === true
    const client = createMonitorQueryClient(current)
    collection.loading = true; reviewError.value = undefined
    reviewLoading.value = metric.value === 'pending'
    function failed(error: unknown) {
      if (!current()) return
      stop(); rejectRuntimeState(collection, error, Date.now())
      collection.retryAt = realtimeRetryAt(error, collection.failures, Date.now())
      if (collection.error === 'forbidden' || collection.error === 'identity') {
        clearHistory()
      }
      if (collection.retryAt !== Infinity) timer = setTimeout(() => refresh(), Math.max(0, collection.retryAt - Date.now()))
    }
    function start() {
      if (!current()) return
      if (!tasks.value.length) { collection.loading = false; reviewLoading.value = false; return }
      const candidate = observeVisionTrend(client, target, interval.value, metric.value === 'pending').subscribe({
        next(sample) {
          if (!current()) return
          if (sample.kind === 'review') {
            reviewLoading.value = false; reviewError.value = sample.error
            if (sample.snapshot) { review.value = sample.snapshot; appendReview() }
            else { review.value = undefined; reviewInterrupted = true }
            return
          }
          const snapshot = sample.snapshot, previous = latest.value
          if (previous && snapshot.collectedAt <= previous.collectedAt) return
          latest.value = snapshot
          sourceStartedAt ??= snapshot.collectedAt
          const restarted = !!previous && visionTrendRestarted(previous, snapshot, taskId.value)
          cvPoints.value = appendVisionTrend(cvPoints.value ?? [], projectVisionTrend(snapshot, taskId.value), interval.value * 1000, cvInterrupted || restarted)
          cvInterrupted = false
          // 复判绑定改变时废弃旧绑定的值；同批次后续复判记录会填充新绑定。
          const bindings = (value: VisionTrendSnapshot) => JSON.stringify(value.bindings.filter(binding => binding.taskId === taskId.value))
          if (previous && bindings(previous) !== bindings(snapshot)) { review.value = undefined; reviewPoints.value = undefined }
          if (restarted) reviewInterrupted = true
          if (!previous && review.value) appendReview()
          Object.assign(collection, { loading: false, error: undefined, failures: 0, retryAt: 0 })
        }, error: failed, complete: () => failed(new Error('CV collection stream ended')),
      })
      if (current() && !candidate.closed) subscription = candidate
      else candidate.unsubscribe()
    }
    if (!catalogLoaded || reloadTasks) {
      void loadVisionTrendTasks(client, target).then(value => {
        if (!current()) return
        tasks.value = value; catalogLoaded = true
        // 目录顺序就是下拉顺序，默认第一项；不创建“全部任务”，也不以 ID 代替名称。
        if (!value.some(task => task.value === taskId.value)) taskId.value = value[0]?.value ?? ''
        start()
      }).catch(failed)
    } else start()
  }

  watch(gateways, values => {
    if (!values.some(item => item.id === gatewayId.value)) gatewayId.value = values.find(item => item.online)?.id || values[0]?.id || ''
  }, { immediate: true })
  watch([scope.key, gatewayId], () => {
    stop(); clearHistory(); taskId.value = ''; tasks.value = []; catalogLoaded = false
    Object.assign(collection, emptyRuntimeState(), { error: undefined })
    refresh()
  }, { immediate: true, flush: 'sync' })
  watch([scope.active, () => gateway.value?.online, interval, () => metric.value === 'pending'], ([active], previous) => {
    if (active && previous?.[0] === false) {
      clearHistory()
      Object.assign(collection, emptyRuntimeState(), { error: undefined })
    }
    refresh()
  }, { flush: 'sync' })
  watch(taskId, () => {
    cvPoints.value = latest.value && taskId.value ? [projectVisionTrend(latest.value, taskId.value)] : undefined
    reviewPoints.value = undefined; reviewInterrupted = true
    appendReview()
  }, { flush: 'sync' })
  onScopeDispose(() => { disposed = true; stop() })
  return { gatewayId, taskId, interval, metric, gateway, tasks, state, refresh: () => refresh(true), active: scope.active }
}
