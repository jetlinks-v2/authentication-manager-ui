import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { queryDebugApiResources } from '@authentication-manager-ui/api/application-center/applicationDebug'
import type { DebugApiResource } from '@authentication-manager-ui/api/application-center/applicationDebug'
import { applicationError, responseBody } from '../applicationUtils'
import { buildDebugApiDocument, docObject } from './apiDebugDocument'
import type { DocObject } from './apiDebugDocument'
import type { DebugApi } from './accessDebugUtils'

export const useApiDebugDocument = (context: { api: DebugApi }) => {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref('')
  const components = shallowRef<DocObject>({})
  // 同一服务的多个接口复用一次模型查询；失败保留到显式重试，不自动重发。
  const resources = new Map<string, Promise<DebugApiResource[]>>()
  let generation = 0
  const operation = computed(() => {
    if (!context.api.specification) return { status: 'empty', value: {} as DocObject }
    if (context.api.provider !== 'swagger') return { status: 'unsupported', value: {} as DocObject }
    try {
      const value = JSON.parse(context.api.specification)
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
      return { status: 'ready', value: value as DocObject }
    } catch { return { status: 'invalid', value: {} as DocObject } }
  })
  const load = async (retry = false) => {
    const current = ++generation
    components.value = {}; error.value = ''; loading.value = false
    const api = context.api
    if (operation.value.status !== 'ready' || !api.specification?.includes('"$ref"')) return
    const id = api.appId || 'NotBelongApplication'
    loading.value = true
    try {
      if (retry) resources.delete(id)
      if (!resources.has(id)) resources.set(id, queryDebugApiResources(id).then(response => responseBody<DebugApiResource[]>(response)))
      const result = await resources.get(id)!
      if (current !== generation) return
      const resource = result.find(item => item.id === id && item.type === 'openApiExpands')
      const groups = resource ? docObject(JSON.parse(resource.resource)) : {}
      components.value = api.group ? docObject(groups[api.group]) : {}
    } catch (cause) { if (current === generation) error.value = applicationError(cause, t) }
    finally { if (current === generation) loading.value = false }
  }
  const document = computed(() => buildDebugApiDocument(operation.value.value, components.value))
  const description = computed(() => context.api.apiDoc || document.value.description || context.api.description || '')
  const notice = computed(() => {
    if (operation.value.status !== 'ready') return t(`ThirdPartyApplication.debug.doc.${operation.value.status}`)
    if (!loading.value && document.value.unresolved.length) return t('ThirdPartyApplication.debug.doc.unresolved')
    return ''
  })
  const columns = computed(() => [
    { title: t('ThirdPartyApplication.debug.parameterName'), key: 'name', width: '40%' },
    { title: t('ThirdPartyApplication.debug.doc.description'), key: 'description' },
  ])
  watch(() => context.api, () => { void load() }, { immediate: true })
  onBeforeUnmount(() => { generation++; resources.clear() })
  return { loading, error, document, description, notice, columns, retry: () => load(true) }
}
