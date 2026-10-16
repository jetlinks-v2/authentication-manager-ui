import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { wsClient } from '@jetlinks-web/core'
import { downloadFileByUrl, randomString } from '@jetlinks-web/utils'
import type { Subscription } from 'rxjs'
import { formatRuntimeLogEvent, type RuntimeLiveLogEntry } from './runtimeLogEvent'
import {
  downloadRuntimeLog,
  getRuntimeLogNodes,
  getRuntimeLogProviders,
  getRuntimeLogResources,
  readRuntimeLog,
  runtimeLogErrorMessage,
  type RuntimeLogEntry,
  type RuntimeLogFilter,
  type RuntimeLogNode,
  type RuntimeLogProvider,
  type RuntimeLogResource,
} from '@authentication-manager-ui/api/runtimeLog'

export type { RuntimeLiveLogEntry } from './runtimeLogEvent'

type StreamState = 'stopped' | 'waiting' | 'receiving' | 'complete' | 'error'

/** 管理文件日志读取和 Java 实时订阅，切换资源、页签或离开页面时隔离旧请求并释放订阅。 */
export const useRuntimeLog = () => {
  const { t } = useI18n()
  const nodes = ref<RuntimeLogNode[]>([])
  const providers = ref<RuntimeLogProvider[]>([])
  const resources = ref<RuntimeLogResource[]>([])
  const nodeId = ref<string>()
  const providerId = ref<string>()
  const resourceId = ref<string>()
  const nodeLoading = ref(false)
  const providerLoading = ref(false)
  const resourceLoading = ref(false)
  const reading = ref(false)
  const downloading = ref(false)
  const error = ref('')
  const lines = ref<string[]>([])
  const hasRead = ref(false)
  const lineCount = ref<number | undefined>(500)
  const keyword = ref('')
  const levels = ref<string[]>([])
  const regex = ref('')
  const reloadKey = ref(0)
  const liveEntries = ref<RuntimeLiveLogEntry[]>([])
  const streamState = ref<StreamState>('stopped')
  const streamError = ref('')
  let streamSubscription: Subscription | undefined
  let sequence = 0
  let streamVersion = 0
  let readVersion = 0
  let disposed = false

  const resource = computed(() => resources.value.find(item => item.id === resourceId.value))
  const canRead = computed(() => !!resource.value?.operations?.includes('readWindow'))
  const canSubscribe = computed(() => !!resource.value?.operations?.includes('subscribe'))
  const canDownload = computed(() => !!resource.value?.operations?.includes('download'))
  const streamActive = computed(() => streamState.value === 'waiting' || streamState.value === 'receiving')
  const loading = computed(() => nodeLoading.value || providerLoading.value || resourceLoading.value)
  const validLineCount = computed(() => Number.isSafeInteger(lineCount.value)
    && Number(lineCount.value) >= 1 && Number(lineCount.value) <= 5000)
  const text = computed(() => lines.value.join('\n'))
  const supportsFilter = (name: string) => (canRead.value || canSubscribe.value)
    && !!resource.value?.filters?.includes(name)
  const nodeOptions = computed(() => nodes.value.map(item => ({
    value: item.id,
    label: item.alias ? `${item.alias} (${item.id})` : item.id,
  })))
  const providerOptions = computed(() => providers.value.map(item => ({ value: item.id, label: item.name })))
  const resourceOptions = computed(() => resources.value.map(item => ({
    value: item.id,
    label: item.displayName || item.name,
  })))

  const stopStream = () => {
    streamVersion++
    streamSubscription?.unsubscribe()
    streamSubscription = undefined
    streamState.value = 'stopped'
  }
  const resetContent = () => {
    stopStream()
    readVersion++
    reading.value = false
    lines.value = []
    hasRead.value = false
    liveEntries.value = []
    streamError.value = ''
    error.value = ''
  }

  watch(reloadKey, async (_, __, onCleanup) => {
    let active = true
    onCleanup(() => { active = false })
    nodes.value = []
    nodeId.value = undefined
    nodeLoading.value = true
    resetContent()
    try {
      const result = await getRuntimeLogNodes()
      if (!active) return
      nodes.value = result
      nodeId.value = result.find(item => item.current)?.id || result[0]?.id
    } catch (cause) {
      const message = await runtimeLogErrorMessage(cause, t('runtimeLog.loadFailed'))
      if (active) error.value = message
    } finally {
      if (active) nodeLoading.value = false
    }
  }, { immediate: true })

  watch(nodeId, async (id, _, onCleanup) => {
    let active = true
    onCleanup(() => { active = false })
    providers.value = []
    providerId.value = undefined
    providerLoading.value = false
    resetContent()
    if (!id) return
    providerLoading.value = true
    try {
      const result = await getRuntimeLogProviders(id)
      if (!active) return
      providers.value = result
      providerId.value = result[0]?.id
    } catch (cause) {
      const message = await runtimeLogErrorMessage(cause, t('runtimeLog.loadFailed'))
      if (active) error.value = message
    } finally {
      if (active) providerLoading.value = false
    }
  })

  watch(providerId, async (id, _, onCleanup) => {
    let active = true
    onCleanup(() => { active = false })
    resources.value = []
    resourceId.value = undefined
    resourceLoading.value = false
    resetContent()
    const selectedProvider = providers.value.find(item => item.id === id)
    const selectedNode = nodeId.value
    if (!selectedProvider || !selectedNode) return
    resourceLoading.value = true
    try {
      const result = await getRuntimeLogResources(selectedNode, selectedProvider)
      if (!active) return
      // runtime 是 Java 的订阅资源，不属于文件树，由页面单独提供入口。
      const live: RuntimeLogResource[] = id === 'java' ? [{
        serverId: selectedNode,
        providerId: id,
        id: 'runtime',
        name: t('runtimeLog.liveResource'),
        directory: false,
        operations: ['subscribe'],
        filters: ['keyword', 'levels', 'regex'],
        current: false,
        compressed: false,
        seekable: false,
      }] : []
      resources.value = [...result, ...live]
      resourceId.value = result.find(item => item.current && item.operations?.includes('readWindow'))?.id
        || result.find(item => item.operations?.includes('readWindow'))?.id
        || live[0]?.id
        || result[0]?.id
    } catch (cause) {
      const message = await runtimeLogErrorMessage(cause, t('runtimeLog.loadFailed'))
      if (active) error.value = message
    } finally {
      if (active) resourceLoading.value = false
    }
  })

  const filterValue = (): RuntimeLogFilter => {
    const filter: RuntimeLogFilter = {}
    if (supportsFilter('keyword') && keyword.value) filter.keyword = keyword.value
    if (supportsFilter('levels') && levels.value.length) filter.levels = [...levels.value]
    if (supportsFilter('regex') && regex.value) filter.regex = regex.value
    return filter
  }

  const startStream = (selected: RuntimeLogResource, filter: RuntimeLogFilter) => {
    stopStream()
    liveEntries.value = []
    streamError.value = ''
    streamState.value = 'waiting'
    const version = streamVersion
    const id = `runtime-log-${randomString(16)}`
    const topic = `/system/log/${nodeId.value}/${providerId.value}/${selected.id}`
    // wsClient 管理本机 /messaging 连接；取消此订阅时不关闭其他页面共享的连接。
    const subscription = wsClient.getWebSocket(id, topic, { filter }).subscribe({
      next: (frame) => {
        if (version !== streamVersion || disposed) return
        const entry = frame.payload as RuntimeLogEntry | undefined
        if (!entry) return
        const value = formatRuntimeLogEvent(entry)
        liveEntries.value = [...liveEntries.value, { id: ++sequence, ...value }].slice(-500)
        streamState.value = 'receiving'
      },
      error: async (cause: unknown) => {
        const message = await runtimeLogErrorMessage(cause, t('runtimeLog.connectionLost'))
        // 旧订阅的错误翻译可能晚于新订阅，只更新仍然有效的会话。
        if (version !== streamVersion || disposed) return
        streamError.value = message
        streamState.value = 'error'
        streamSubscription = undefined
      },
      complete: () => {
        if (version !== streamVersion || disposed) return
        streamState.value = 'complete'
        streamSubscription = undefined
      },
    })
    if (version === streamVersion && (streamState.value === 'waiting' || streamState.value === 'receiving')) {
      streamSubscription = subscription
    } else subscription.unsubscribe()
  }

  const query = async () => {
    const selected = resource.value
    if (!selected || !nodeId.value || !providerId.value) return
    const filter = filterValue()
    if (canSubscribe.value) {
      error.value = ''
      startStream(selected, filter)
      return
    }
    if (!canRead.value || !validLineCount.value) return
    const version = ++readVersion
    reading.value = true
    error.value = ''
    lines.value = []
    hasRead.value = false
    try {
      // _readWindow 返回物理行字符串；Provider 过滤只改变正文，不改变继续位置。
      const result = await readRuntimeLog(nodeId.value, providerId.value, selected.id, Number(lineCount.value), filter)
      if (version !== readVersion || disposed) return
      lines.value = result.lines || []
      hasRead.value = true
    } catch (cause) {
      const message = await runtimeLogErrorMessage(cause, t('runtimeLog.readFailed'))
      if (version === readVersion && !disposed) error.value = message
    } finally {
      if (version === readVersion && !disposed) reading.value = false
    }
  }

  watch(resource, () => {
    resetContent()
    keyword.value = ''
    levels.value = []
    regex.value = ''
    if (canRead.value && !canSubscribe.value) void query()
  })

  const download = async () => {
    const selected = resource.value
    if (!selected || !nodeId.value || !providerId.value || !canDownload.value || downloading.value) return
    downloading.value = true
    error.value = ''
    try {
      const file = await downloadRuntimeLog(nodeId.value, providerId.value, selected)
      if (disposed) return
      const url = URL.createObjectURL(file.blob)
      downloadFileByUrl(url, file.name)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      const message = await runtimeLogErrorMessage(cause, t('runtimeLog.downloadFailed'))
      if (!disposed) error.value = message
    } finally {
      if (!disposed) downloading.value = false
    }
  }

  onBeforeUnmount(() => {
    disposed = true
    readVersion++
    stopStream()
  })

  return {
    nodeId, providerId, resourceId, nodeOptions, providerOptions, resourceOptions,
    loading, nodeLoading, providerLoading, resourceLoading, reading, downloading, error,
    resource, canRead, canSubscribe, canDownload, supportsFilter, lineCount, validLineCount,
    keyword, levels, regex, lines, text, hasRead, query, download,
    liveEntries, streamState, streamError, streamActive, stopStream,
    refreshResources: () => { reloadKey.value++ },
  }
}
