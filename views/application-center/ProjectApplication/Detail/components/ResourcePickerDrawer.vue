<template>
  <JlDrawerShell
    :open="open"
    :width="860"
    icon="AppstoreAddOutlined"
    :title="data.title"
    :sub="data.subtitle"
    @update:open="emits('update:open', $event)"
  >
    <a-spin :spinning="gatewayLoading">
      <div
        v-if="open"
        class="resource-picker"
        :class="{ 'resource-picker--with-gateways': data.type === 'camera' }"
      >
        <aside v-if="data.type === 'camera'" class="resource-picker__gateways">
          <strong>{{ $t('ProjectApplication.resource.byGateway') }}</strong>
          <a-alert v-if="gatewayError" type="error" show-icon :message="gatewayError" />
          <div
            v-for="gateway in gateways"
            :key="gateway.id"
            class="resource-picker__gateway"
            :class="{ active: activeGatewayId === gateway.id }"
          >
            <a-checkbox :checked="selectedGatewayIds.includes(gateway.id)" :aria-label="gateway.name" @change="toggleGateway(gateway.id, $event)" />
            <button type="button" @click="selectGateway(gateway.id)">
              <span><b>{{ gateway.name }}</b><small>{{ gateway.provider || gateway.id }}</small></span>
              <MetaChip :tone="gateway.status === 'online' ? 'ok' : 'warn'">{{ gateway.channelNumber }}</MetaChip>
            </button>
          </div>
          <CloudEmpty
            v-if="!gatewayLoading && !gatewayError && !gateways.length"
            :description="$t('ProjectApplication.camera.gatewayEmpty')"
          />
        </aside>

        <section class="resource-picker__main">
          <template v-if="canLoadResources">
            <div class="resource-picker__toolbar">
              <ConditionFilter
                v-model="filterTerms"
                class="resource-picker__filter"
                :fields="filterFields"
                :common-fields="commonFields"
                :placeholder="$t('ProjectApplication.resource.searchPlaceholder')"
                @change="handleSearch"
              />
              <div v-if="data.type === 'device'" class="resource-picker__selection">
                <a-checkbox :checked="allVisibleSelected" @change="toggleAll">
                  {{ $t('ProjectApplication.resource.selectAll') }}
                </a-checkbox>
                <span>{{ $t('ProjectApplication.resource.selected', { selected: selectedIds.length, total }) }}</span>
              </div>
            </div>
            <p v-if="data.hint" class="resource-picker__hint">{{ data.hint }}</p>
            <a-alert v-if="loadError" type="error" show-icon :message="loadError" />

            <ResourcePickerTable
              :key="tableKey"
              :type="data.type"
              :load-resources="data.loadResources"
              :gateway-id="activeGatewayId"
              :query-terms="queryTerms"
              :selected-ids="selectedIds"
              :selectable="data.type === 'device'"
              @toggle="toggleResources"
              @clear="selectedIds = []"
              @loaded="handleLoaded"
              @error="handleLoadError"
            />
          </template>
          <CloudEmpty v-else :description="$t('ProjectApplication.camera.selectGateway')" />
        </section>
      </div>
    </a-spin>

    <template #foot>
      <StickyActionBar position="inline">
        <a-button @click="emits('update:open', false)">{{ $t('ProjectApplication.common.cancel') }}</a-button>
        <a-button type="primary" :disabled="!confirmationIds.length" @click="confirm">
          {{ data.type === 'camera'
            ? $t('ProjectApplication.camera.bindGateway')
            : $t('ProjectApplication.resource.bindCount', { count: selectedIds.length }) }}
        </a-button>
      </StickyActionBar>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts" name="ProjectApplicationResourcePickerDrawer">
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ConditionFilterChangePayload,
  ConditionFilterCommonField,
  ConditionFilterField,
  ConditionFilterTerm,
} from '@jetlinks-web-core/components/ConditionFilter'
import type { ApplicationResource, ResourcePickerData, ResourcePickerGateway } from '../../types'
import ResourcePickerTable from './ResourcePickerTable.vue'

interface CheckboxEvent { target: { checked: boolean } }

const props = defineProps({
  open: { type: Boolean, default: false },
  data: { type: Object as PropType<ResourcePickerData>, required: true },
})
const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', ids: string[]): void
}>()
const { t: $t } = useI18n()
const commonFields: ConditionFilterCommonField[] = ['name', 'serial']
const filterTerms = ref<ConditionFilterTerm[]>([])
const submittedTerms = ref<ConditionFilterTerm[]>([])
const gateways = ref<ResourcePickerGateway[]>([])
const activeGatewayId = ref('')
const selectedGatewayIds = ref<string[]>([])
const currentResources = ref<ApplicationResource[]>([])
const selectedIds = ref<string[]>([])
const total = ref(0)
const tableKey = ref(0)
const gatewayLoading = ref(false)
const gatewayError = ref('')
const loadError = ref('')
let gatewaySequence = 0

const canLoadResources = computed(() => props.data.type === 'device' || Boolean(activeGatewayId.value))
const confirmationIds = computed(() => props.data.type === 'camera'
  ? selectedGatewayIds.value
  : selectedIds.value)
const allVisibleSelected = computed(() => props.data.type === 'device'
  && Boolean(currentResources.value.length)
  && currentResources.value.every(item => selectedIds.value.includes(item.id)))
const filterFields = computed<ConditionFilterField[]>(() => [
  { dataIndex: 'name', title: $t('ProjectApplication.resource.name'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'serial', title: $t('ProjectApplication.resource.serial'), search: { type: 'string', defaultTermType: 'like' } },
])
const queryTerms = computed<Array<Record<string, unknown>>>(() => {
  const serialColumn = props.data.type === 'camera' ? 'channelId' : 'id'
  const terms = mapTerms(submittedTerms.value, serialColumn).map(item => ({ ...item }))
  if (props.data.type === 'device' && props.data.boundIds.length) {
    terms.push({ column: 'id', termType: 'nin', value: [...props.data.boundIds] })
  }
  return terms
})

watch(() => props.open, (open) => {
  if (!open) {
    gatewaySequence += 1
    return
  }
  resetPicker()
  if (props.data.type === 'camera') void loadGateways()
}, { immediate: true })

function cloneTerms(terms: ConditionFilterTerm[] = []): ConditionFilterTerm[] {
  return terms.map(item => ({
    ...item,
    value: Array.isArray(item.value) ? [...item.value] : item.value,
    terms: Array.isArray(item.terms)
      ? cloneTerms(item.terms as ConditionFilterTerm[]) as ConditionFilterTerm['terms']
      : item.terms,
  }))
}

function mapTerms(terms: ConditionFilterTerm[], serialColumn: string): ConditionFilterTerm[] {
  return cloneTerms(terms).map(item => ({
    ...item,
    column: item.column === 'serial' ? serialColumn : item.column,
    terms: Array.isArray(item.terms)
      ? mapTerms(item.terms as ConditionFilterTerm[], serialColumn) as ConditionFilterTerm['terms']
      : item.terms,
  }))
}

function resetPicker() {
  gatewaySequence += 1
  filterTerms.value = []
  submittedTerms.value = []
  gateways.value = []
  activeGatewayId.value = ''
  selectedGatewayIds.value = []
  currentResources.value = []
  selectedIds.value = []
  total.value = 0
  tableKey.value += 1
  gatewayError.value = ''
  loadError.value = ''
}

async function loadGateways() {
  const sequence = ++gatewaySequence
  gatewayLoading.value = true
  try {
    const values = await props.data.loadGateways?.()
    if (sequence === gatewaySequence) {
      const boundGatewayIds = new Set(props.data.boundIds)
      gateways.value = (values || []).filter(item => !boundGatewayIds.has(item.id))
    }
  } catch {
    if (sequence === gatewaySequence) gatewayError.value = $t('ProjectApplication.resource.loadFailed')
  } finally {
    if (sequence === gatewaySequence) gatewayLoading.value = false
  }
}

function selectGateway(gatewayId: string) {
  if (activeGatewayId.value === gatewayId) return
  activeGatewayId.value = gatewayId
  currentResources.value = []
  total.value = 0
  loadError.value = ''
  tableKey.value += 1
}

function toggleGateway(gatewayId: string, event: CheckboxEvent) {
  selectGateway(gatewayId)
  const current = new Set(selectedGatewayIds.value)
  event.target.checked ? current.add(gatewayId) : current.delete(gatewayId)
  selectedGatewayIds.value = [...current]
}

function handleSearch(payload?: ConditionFilterChangePayload) {
  submittedTerms.value = cloneTerms(payload?.terms ?? filterTerms.value)
  currentResources.value = []
  total.value = 0
  loadError.value = ''
  tableKey.value += 1
}

function handleLoaded(resources: ApplicationResource[], pageTotal: number) {
  currentResources.value = resources
  total.value = pageTotal
  loadError.value = ''
}

function handleLoadError() {
  currentResources.value = []
  total.value = 0
  loadError.value = $t('ProjectApplication.resource.loadFailed')
}

function toggleResources(ids: string[], selected: boolean) {
  const current = new Set(selectedIds.value)
  ids.forEach(id => selected ? current.add(id) : current.delete(id))
  selectedIds.value = [...current]
}

function toggleAll(event: CheckboxEvent) {
  toggleResources(currentResources.value.map(item => item.id), event.target.checked)
}

function confirm() {
  // 视频通道权限继承网关设备资产：勾选的左侧网关是提交对象，右侧通道只用于预览。
  emits('confirm', [...new Set(confirmationIds.value)])
  emits('update:open', false)
}
</script>

<style scoped>
.resource-picker { display: grid; min-height: 28rem; grid-template-columns: minmax(0, 1fr); border: 1px solid var(--line); border-radius: var(--r-3); overflow: hidden; }
.resource-picker--with-gateways { grid-template-columns: 13rem minmax(0, 1fr); }
.resource-picker__gateways { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2); border-right: 1px solid var(--line); }
.resource-picker__gateways > strong { padding: var(--space-1) var(--space-2); color: var(--ink-3); font-size: var(--fs-12); }
.resource-picker__gateway { display: flex; align-items: center; gap: var(--space-2); padding-left: var(--space-2); border-radius: var(--r-2); color: var(--ink-2); }
.resource-picker__gateway:hover,
.resource-picker__gateway.active { background: var(--bg-sunken); color: var(--ink-1); }
.resource-picker__gateway > button { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2) var(--space-2) var(--space-2) 0; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: left; }
.resource-picker__gateways button > span { display: grid; min-width: 0; gap: var(--space-1); }
.resource-picker__gateways b,
.resource-picker__gateways small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-picker__gateways small { color: var(--ink-4); font-size: var(--fs-12); }
.resource-picker__main { display: flex; min-width: 0; flex-direction: column; gap: var(--space-3); padding: var(--space-3); }
.resource-picker__toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); }
.resource-picker__filter { min-width: 0; }
.resource-picker__selection { display: inline-flex; align-items: center; gap: var(--space-3); color: var(--ink-4); font-size: var(--fs-12); white-space: nowrap; }
.resource-picker__hint { margin: 0; color: var(--ink-3); font-size: var(--fs-12); }
@media (max-width: 44rem) {
  .resource-picker--with-gateways { grid-template-columns: 1fr; }
  .resource-picker__gateways { border-right: 0; border-bottom: 1px solid var(--line); }
  .resource-picker__toolbar { grid-template-columns: 1fr; }
}
</style>
