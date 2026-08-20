<template>
  <j-page-container>
    <div class="api-application-page">
      <div class="page-head">
        <div>
          <h1>{{ $t('ApiApplication.title') }}</h1>
          <p>{{ $t('ApiApplication.subtitle') }}</p>
        </div>
        <a-button type="primary" @click="createOpen = true">
          <template #icon><AIcon type="PlusOutlined" /></template>
          {{ $t('ApiApplication.actions.create') }}
        </a-button>
      </div>
      <ConditionFilter :columns="filterColumns" target="api-applications" @change="handleSearch" />
      <a-alert v-if="error" type="error" show-icon :message="$t('ApiApplication.loadFailed')" class="error-alert" />
      <j-pro-table
        ref="tableRef"
        mode="TABLE"
        :columns="columns"
        :request="requestPage"
        :params="queryParams"
        :default-params="{ sorts: [{ name: 'createTime', order: 'desc' }] }"
        :scroll="{ x: 1080 }"
      >
        <template #name="slotProps">
          <div class="app-name"><span class="app-icon"><AIcon type="ApiOutlined" /></span><div><strong>{{ slotProps.name }}</strong><small>{{ slotProps.description || '-' }}</small></div></div>
        </template>
        <template #id="slotProps">
          <a-typography-text copyable :content="slotProps.id">{{ slotProps.id }}</a-typography-text>
        </template>
        <template #secret="slotProps">
          <span class="secret-value">{{ secretFor(slotProps) }}</span>
          <a-button type="link" size="small" @click="revealSecret(slotProps)"><AIcon :type="secretMap[slotProps.id] ? 'CopyOutlined' : 'EyeOutlined'" /></a-button>
        </template>
        <template #createTime="slotProps">{{ formatTime(slotProps.createTime) }}</template>
        <template #state="slotProps">
          <JBadgeStatus :status="stateValue(slotProps.state)" :text="stateText(slotProps.state)" :status-names="{ enabled: 'processing', disabled: 'error' }" />
        </template>
        <template #action="slotProps">
          <a-space :size="4">
            <a-button type="link" size="small" @click="openPermission(slotProps)"><AIcon type="SafetyCertificateOutlined" /></a-button>
            <a-button type="link" size="small" @click="openDebug(slotProps)"><AIcon type="ApiOutlined" /></a-button>
            <a-button type="link" size="small" @click="openLogs(slotProps)"><AIcon type="FileSearchOutlined" /></a-button>
            <a-dropdown>
              <a-button type="link" size="small"><AIcon type="MoreOutlined" /></a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="status" @click="toggleStatus(slotProps)">{{ stateValue(slotProps.state) === 'disabled' ? $t('ApiApplication.actions.enable') : $t('ApiApplication.actions.disable') }}</a-menu-item>
                  <a-menu-item key="delete" danger @click="deleteApplication(slotProps)">{{ $t('ApiApplication.actions.delete') }}</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </template>
      </j-pro-table>
    </div>
    <CreateDialog
      v-model:open="createOpen"
      :business-applications="businessApplications"
      :loading-options="loadingOptions"
      :create="create"
      :load-options="loadOptions"
      @created="reload"
    />
    <PermissionDrawer v-model:open="permissionOpen" :application="selectedApplication" @saved="reload" />
    <DebugDrawer v-model:open="debugOpen" :application="selectedApplication" />
    <LogDrawer v-model:open="logsOpen" :application="selectedApplication" />
  </j-page-container>
</template>

<script setup lang="ts" name="ApiApplication">
import { ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryApiApplications } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ConditionFilterChangePayload, ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import type { ApiApplication } from './types'
import { createApiApplicationTerms, useApiApplication } from './useApiApplication'
import CreateDialog from './components/CreateDialog.vue'
import PermissionDrawer from './components/PermissionDrawer.vue'
import DebugDrawer from './components/DebugDrawer.vue'
import LogDrawer from './components/LogDrawer.vue'

const { t: $t } = useI18n()
const tableRef = ref<any>()
const queryParams = ref<{ terms: Array<Record<string, unknown>> }>({ terms: [] })
const createOpen = ref(false)
const permissionOpen = ref(false)
const debugOpen = ref(false)
const logsOpen = ref(false)
const selectedApplication = ref<ApiApplication>()
const secretMap = ref<Record<string, string>>({})
const error = ref(false)
const {
  businessApplications,
  loadingOptions,
  create,
  loadOptions,
  toggle,
  remove,
  reveal,
  enumValue,
} = useApiApplication()

const filterColumns: ConditionFilterField[] = [
  { dataIndex: 'name', title: $t('ApiApplication.columns.name'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'id', title: $t('ApiApplication.columns.appKey'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'state', title: $t('ApiApplication.columns.status'), search: { type: 'select', options: [{ label: $t('ApiApplication.status.enabled'), value: 'enabled' }, { label: $t('ApiApplication.status.disabled'), value: 'disabled' }] } },
]

const columns = [
  { title: $t('ApiApplication.columns.name'), dataIndex: 'name', key: 'name', scopedSlots: true, width: 240, fixed: 'left' },
  { title: $t('ApiApplication.columns.appKey'), dataIndex: 'id', key: 'id', scopedSlots: true, width: 230 },
  { title: $t('ApiApplication.columns.appSecret'), key: 'secret', scopedSlots: true, width: 210 },
  { title: $t('ApiApplication.columns.createTime'), dataIndex: 'createTime', key: 'createTime', scopedSlots: true, width: 180 },
  { title: $t('ApiApplication.columns.status'), dataIndex: 'state', key: 'state', scopedSlots: true, width: 110 },
  { title: $t('ApiApplication.columns.action'), key: 'action', scopedSlots: true, fixed: 'right', width: 170 },
]

const requestPage = (params: Record<string, unknown>) => queryApiApplications({
  ...params,
  terms: [
    ...createApiApplicationTerms(),
    ...(params.terms as Array<Record<string, unknown>> || queryParams.value.terms),
  ],
})

const handleSearch = ({ filter }: ConditionFilterChangePayload) => {
  queryParams.value = { terms: filter.terms as Array<Record<string, unknown>> }
  tableRef.value?.reload()
}

const reload = () => tableRef.value?.reload()
const formatTime = (value?: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
const stateValue = (state: unknown) => enumValue(state) || 'enabled'
const stateText = (state: unknown) => {
  const value = stateValue(state)
  return value === 'disabled' ? $t('ApiApplication.status.disabled') : $t('ApiApplication.status.enabled')
}
const secretFor = (application: ApiApplication) => secretMap.value[application.id] || '****************'

const revealSecret = async (application: ApiApplication) => {
  if (secretMap.value[application.id]) {
    await navigator.clipboard?.writeText(secretMap.value[application.id])
    onlyMessage($t('ApiApplication.message.copied'))
    return
  }
  const value = await reveal(application.id)
  const secret = value?.apiServer?.secureKey
  if (secret) {
    secretMap.value = { ...secretMap.value, [application.id]: secret }
    await navigator.clipboard?.writeText(secret)
    onlyMessage($t('ApiApplication.message.secretCopied'))
  }
}

const openPermission = (application: ApiApplication) => { selectedApplication.value = application; permissionOpen.value = true }
const openLogs = (application: ApiApplication) => { selectedApplication.value = application; logsOpen.value = true }
const openDebug = async (application: ApiApplication) => {
  selectedApplication.value = { ...application, ...(await reveal(application.id)) }
  debugOpen.value = true
}
const toggleStatus = async (application: ApiApplication) => {
  await toggle(application)
  reload()
}
const deleteApplication = async (application: ApiApplication) => {
  if (stateValue(application.state) !== 'disabled') {
    onlyMessage($t('ApiApplication.message.disableBeforeDelete'), 'warning')
    return
  }
  await remove(application)
  reload()
}
</script>

<style scoped>
.api-application-page { min-height: 100%; padding: var(--space-4); background: var(--bg); }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-3); }
.page-head h1 { margin: 0; color: var(--ink-1); font-size: var(--fs-20); }
.page-head p { margin: 0.25rem 0 0; color: var(--ink-4); font-size: var(--fs-12); }
.error-alert { margin: var(--space-3) 0; }
.app-name { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.app-icon { display: grid; width: 2rem; height: 2rem; place-items: center; flex: 0 0 auto; border-radius: var(--r-2); color: var(--accent); background: var(--accent-soft); }
.app-name strong, .app-name small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-name small { max-width: 170px; color: var(--ink-4); font-size: var(--fs-12); }
.secret-value { color: var(--ink-3); letter-spacing: 0.08em; }
@media (max-width: 720px) { .api-application-page { padding: var(--space-2); } .page-head { align-items: flex-start; flex-direction: column; } }
</style>
