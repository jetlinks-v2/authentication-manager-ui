<template>
  <JlDrawerShell
    :open="open"
    :width="760"
    icon="ApiOutlined"
    :title="$t('ApiApplication.debug.title')"
    :sub="application?.name"
    @update:open="emit('update:open', $event)"
  >
    <a-alert v-if="!availableSpecs.length" type="warning" show-icon :message="$t('ApiApplication.debug.noPermission')" />
    <a-form v-else layout="vertical" @submit.prevent="send">
      <a-form-item :label="$t('ApiApplication.debug.api')">
        <a-select v-model:value="selectedSpecId" :options="specOptions" show-search option-filter-prop="label" />
      </a-form-item>
      <div class="request-line">
        <a-select v-model:value="request.method" :options="methodOptions" />
        <a-input v-model:value="request.path" :placeholder="$t('ApiApplication.debug.pathPlaceholder')" />
      </div>
      <a-form-item :label="$t('ApiApplication.debug.query')">
        <a-input v-model:value="request.query" placeholder="pageIndex=0&pageSize=20" />
      </a-form-item>
      <a-form-item :label="$t('ApiApplication.debug.headers')">
        <a-textarea v-model:value="request.headers" :rows="3" placeholder="Content-Type: application/json" />
      </a-form-item>
      <a-form-item v-if="hasBody" :label="$t('ApiApplication.debug.body')">
        <a-textarea v-model:value="request.body" :rows="6" placeholder="{}" />
      </a-form-item>
      <a-button type="primary" html-type="submit" :loading="sending" :disabled="!selectedSpecId">
        <template #icon><AIcon type="SendOutlined" /></template>
        {{ $t('ApiApplication.debug.send') }}
      </a-button>
    </a-form>
    <div v-if="response" class="response-panel">
      <div class="response-head">
        <a-tag :color="response.status >= 400 ? 'error' : 'success'">{{ response.status }}</a-tag>
        <span>{{ response.duration }} ms</span>
        <a-button type="link" size="small" @click="copy(response.body)">{{ $t('ApiApplication.debug.copyResponse') }}</a-button>
      </div>
      <div class="response-headers"><b>{{ $t('ApiApplication.debug.responseHeaders') }}</b><pre>{{ response.headers }}</pre></div>
      <pre>{{ response.body }}</pre>
    </div>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import CryptoJS from 'crypto-js'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import { queryApiGrants, queryApiGroups } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication, ApiGroup, ApiSpec } from '../types'

const props = defineProps<{ open: boolean; application?: ApiApplication }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()
const { t: $t } = useI18n()
const groups = ref<ApiGroup[]>([])
const grantedOperationIds = ref<string[]>([])
const selectedSpecId = ref('')
const sending = ref(false)
const response = ref<{ status: number; duration: number; headers: string; body: string }>()
const request = reactive({ method: 'GET', path: '', query: '', headers: '', body: '' })
const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(value => ({ label: value, value }))
const hasBody = computed(() => !['GET', 'DELETE'].includes(request.method))

const allSpecs = computed<ApiSpec[]>(() => groups.value.flatMap(group =>
  (group.operations || [])
    .filter(operation => grantedOperationIds.value.includes(operation.id))
    .flatMap(operation => operation.apiDetail || [])))
const availableSpecs = computed(() => allSpecs.value.filter((spec, index, list) => list.findIndex(item => item.id === spec.id) === index))
const specOptions = computed(() => availableSpecs.value.map(spec => ({
  label: `${spec.method || 'GET'} ${spec.path || ''}${spec.summary ? ` - ${spec.summary}` : ''}`,
  value: spec.id,
})))

const load = async () => {
  if (!props.application?.id) return
  const [groupResponse, grantResponse] = await Promise.all([
    queryApiGroups({ paging: false }),
    queryApiGrants(props.application.id),
  ])
  groups.value = (groupResponse as any).result || groupResponse || []
  const grants = (grantResponse as any).result || grantResponse || []
  grantedOperationIds.value = grants.flatMap((grant: any) => grant.operationIds || [])
  if (!selectedSpecId.value && availableSpecs.value[0]) selectSpec(availableSpecs.value[0])
}

watch(() => [props.open, props.application?.id], ([open]) => {
  if (open) {
    selectedSpecId.value = ''
    response.value = undefined
    void load()
  }
}, { immediate: true })
watch(selectedSpecId, id => { const spec = availableSpecs.value.find(item => item.id === id); if (spec) selectSpec(spec) })

const selectSpec = (spec: ApiSpec) => {
  selectedSpecId.value = spec.id
  request.method = spec.method || 'GET'
  request.path = spec.path || ''
  request.query = ''
  request.body = ''
  response.value = undefined
}

const parseHeaders = (value: string) => value.split('\n').reduce<Record<string, string>>((headers, line) => {
  const index = line.indexOf(':')
  if (index > 0) headers[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  return headers
}, {})

const signedPayload = (timestamp: string) => {
  const secret = props.application?.apiServer?.secureKey || ''
  if (['GET', 'DELETE'].includes(request.method)) {
    const params = new URLSearchParams(request.query)
    const sorted = Array.from(params.entries()).sort(([left], [right]) => left.localeCompare(right))
    return `${sorted.map(([key, value]) => `${key}=${value}`).join('&')}${timestamp}${secret}`
  }
  return `${request.body || ''}${timestamp}${secret}`
}

const send = async () => {
  if (!props.application?.id || !request.path) return
  sending.value = true
  const started = Date.now()
  const timestamp = String(Date.now())
  const query = request.query ? `?${request.query}` : ''
  try {
    const result = await fetch(`${request.path}${query}`, {
      method: request.method,
      headers: {
        ...parseHeaders(request.headers),
        'X-Client-Id': props.application.id,
        'X-Timestamp': timestamp,
        'X-Sign': CryptoJS.MD5(signedPayload(timestamp)).toString(),
      },
      body: hasBody.value ? request.body : undefined,
    })
    const body = await result.text()
    response.value = {
      status: result.status,
      duration: Date.now() - started,
      headers: Array.from(result.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n'),
      body,
    }
  } catch (error) {
    response.value = { status: 0, duration: Date.now() - started, headers: '', body: String(error) }
  } finally {
    sending.value = false
  }
}

const copy = async (value: string) => {
  await navigator.clipboard?.writeText(value)
  onlyMessage($t('ApiApplication.message.copied'))
}
</script>

<style scoped>
.request-line { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: var(--space-2); }
.response-panel { margin-top: var(--space-4); border: 1px solid var(--line); background: var(--bg-sunken); }
.response-head { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); border-bottom: 1px solid var(--line); }
.response-head span { color: var(--ink-4); font-size: var(--fs-12); }
pre { max-height: 20rem; margin: 0; padding: var(--space-3); overflow: auto; white-space: pre-wrap; word-break: break-word; }
.response-headers { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); }
.response-headers b { display: block; margin-bottom: var(--space-1); color: var(--ink-3); font-size: var(--fs-12); }
.response-headers pre { max-height: 8rem; padding: 0; }
</style>
