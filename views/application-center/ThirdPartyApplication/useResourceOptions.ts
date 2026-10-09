import { computed, onBeforeUnmount, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDeviceList_api } from '@authentication-manager-ui/api/system/department'
import { responseBody } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import type { ResourceGrant } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { integrationError } from './integrationUtils'

/** 指定设备复用当前项目的资产查询；其他类型未确认查询契约，不伪造资源选项。 */
export const useResourceOptions = (grant: MaybeRefOrGetter<ResourceGrant>, runtimeReady: MaybeRefOrGetter<boolean>) => {
  const { t } = useI18n()
  const rows = ref<Array<{ id: string; name?: string }>>([])
  const loading = ref(false)
  const error = ref('')
  const page = ref(0)
  const total = ref(0)
  let search = ''
  let sequence = 0
  const supported = computed(() => toValue(grant).type === 'device')
  const enabled = computed(() => supported.value && toValue(runtimeReady) && toValue(grant).mode === 'selected')
  const options = computed(() => {
    const result = rows.value.map(row => ({ value: row.id, label: row.name || row.id }))
    for (const id of toValue(grant).resourceIds) if (!result.some(item => item.value === id)) result.push({ value: id, label: id })
    return result
  })
  const load = async (value = '', append = false) => {
    const id = ++sequence
    if (!enabled.value) { rows.value = []; total.value = 0; error.value = ''; loading.value = false; return }
    if (!append) { rows.value = []; page.value = 0; total.value = 0 }
    const nextPage = append ? page.value + 1 : 0
    search = value; loading.value = true; error.value = ''
    try {
      const response = await getDeviceList_api({ pageIndex: nextPage, pageSize: 20,
        sorts: [{ name: 'name', order: 'asc' }], terms: value ? [{ column: 'name', termType: 'like', value: '%' + value + '%' }] : [] })
      if (id !== sequence) return
      const result = responseBody(response) as { data: Array<{ id: string; name?: string }>; total: number }
      if (!Array.isArray(result.data)) throw new Error('ThirdPartyApplication.project.invalidResponse')
      rows.value = [...new Map([...rows.value, ...result.data].map(row => [row.id, row])).values()]
      page.value = nextPage
      total.value = result.total
    } catch (cause) { if (id === sequence) error.value = integrationError(cause, t) }
    finally { if (id === sequence) loading.value = false }
  }
  const more = () => { if (!loading.value) void load(search, true) }
  watch([enabled, () => toValue(grant).type], () => { void load() }, { immediate: true })
  onBeforeUnmount(() => { sequence++ })
  return { supported, options, loading, error, load, more, hasMore: computed(() => rows.value.length < total.value) }
}
