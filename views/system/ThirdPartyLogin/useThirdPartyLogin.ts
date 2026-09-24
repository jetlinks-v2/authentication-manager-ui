import { computed, onMounted, ref } from 'vue'
import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import {
  createThirdPartyApplication,
  deleteThirdPartyApplication,
  getThirdPartyApplication,
  getSystemPaths,
  queryThirdPartyApplications,
  updateThirdPartyApplication,
  updateThirdPartyApplicationState,
  type ThirdPartyApplication,
} from '@authentication-manager-ui/api/system/thirdPartyLogin'
import {
  filterConfigs,
  fromApplication,
  isSupportedApplication,
  toApplicationPayload,
  type LoginConfig,
  type LoginConfigDraft,
  type LoginMethod,
  type MethodFilter,
} from './model'

export function useThirdPartyLogin() {
  const records = ref<LoginConfig[]>([])
  const selectedMethod = ref<MethodFilter>('all')
  const filterTerms = ref<ConditionFilterTerm[]>([])
  const drawerOpen = ref(false)
  const editing = ref<LoginConfig>()
  const editingApplication = ref<ThirdPartyApplication>()
  const creatingMethod = ref<LoginMethod>('wechat')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(false)
  const callbackBasePath = ref('')

  const visibleRecords = computed(() => filterConfigs(records.value, selectedMethod.value, filterTerms.value))
  const countFor = (method: MethodFilter) => method === 'all'
    ? records.value.length
    : records.value.filter(item => item.method === method).length

  /** 从应用管理读取并筛选当前后端已支持的第三方 SSO 应用。 */
  async function loadRecords() {
    loading.value = true
    error.value = false
    try {
      const response = await queryThirdPartyApplications()
      records.value = response.result.data
        .filter(isSupportedApplication)
        .map(item => fromApplication(item))
        .filter((item): item is LoginConfig => Boolean(item))
    } catch (reason) {
      error.value = true
      throw reason
    } finally {
      loading.value = false
    }
  }

  async function loadCallbackBasePath() {
    const response = await getSystemPaths()
    callbackBasePath.value = response.result['base-path']?.replace(/\/+$/, '') || ''
  }

  function openCreate() {
    editing.value = undefined
    editingApplication.value = undefined
    creatingMethod.value = selectedMethod.value === 'all' ? 'wechat' : selectedMethod.value
    drawerOpen.value = true
  }

  /** 编辑前读取完整详情，保存时保留页面没有承载的既有应用配置。 */
  async function openEdit(record: LoginConfig) {
    loading.value = true
    try {
      const response = await getThirdPartyApplication(record.id)
      const config = fromApplication(response.result, true)
      if (!config) return
      editingApplication.value = response.result
      editing.value = config
      drawerOpen.value = true
    } finally {
      loading.value = false
    }
  }

  /** 新增或更新现有应用 SSO 配置，成功后刷新服务端列表。 */
  async function save(draft: LoginConfigDraft): Promise<boolean> {
    saving.value = true
    try {
      const payload = toApplicationPayload(draft, editingApplication.value)
      if (editing.value) {
        await updateThirdPartyApplication(editing.value.id, payload)
      } else {
        await createThirdPartyApplication(payload)
      }
      drawerOpen.value = false
      editing.value = undefined
      editingApplication.value = undefined
      await loadRecords()
      return true
    } finally {
      saving.value = false
    }
  }

  /** 删除应用后重新读取列表，避免保留服务端已失效的数据。 */
  async function remove(record: LoginConfig) {
    await deleteThirdPartyApplication(record.id)
    await loadRecords()
  }

  /** 启停直接复用应用管理的 state 局部更新语义。 */
  async function updateEnabled(id: string, enabled: boolean) {
    await updateThirdPartyApplicationState(id, enabled ? 'enabled' : 'disabled')
    await loadRecords()
  }

  onMounted(() => {
    void loadRecords().catch(() => undefined)
    void loadCallbackBasePath().catch(() => undefined)
  })

  return {
    records, selectedMethod, filterTerms, visibleRecords, drawerOpen, editing, creatingMethod,
    loading, saving, error, callbackBasePath,
    countFor, loadRecords, openCreate, openEdit, save, remove, updateEnabled,
  }
}
