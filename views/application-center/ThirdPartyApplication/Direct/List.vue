<template>
  <j-page-container>
    <div class="direct-page">
      <div class="page-head">
        <div><h1>{{ $t('ThirdPartyApplication.title') }}</h1><p>{{ $t('ThirdPartyApplication.direct.subtitle') }}</p></div>
        <a-button type="primary" @click="openCreate"><template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ThirdPartyApplication.direct.create') }}</a-button>
      </div>
      <ConditionFilter :columns="filterColumns" target="third-party-direct" @change="search" />
      <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
      <j-pro-table ref="tableRef" mode="TABLE" :columns="columns" :request="query" :params="filters" :scroll="{ x: 800 }">
        <template #name="row"><a-button type="link" @click="openDetail(row)">{{ row.name }}</a-button></template>
        <template #state="row"><a-badge :status="apiState(row) === 'enabled' ? 'success' : 'default'" :text="$t('ApiApplication.status.' + apiState(row))" /></template>
        <template #createTime="row">{{ formatTime(row.createTime) }}</template>
        <template #action="row"><a-button type="link" @click="openDetail(row)">{{ $t('ThirdPartyApplication.detail') }}</a-button></template>
      </j-pro-table>
    </div>
    <a-modal v-model:open="createOpen" :title="$t('ThirdPartyApplication.direct.create')" :confirm-loading="saving"
      :closable="!saving" :mask-closable="!saving" :cancel-button-props="{ disabled: saving }"
      :ok-button-props="{ disabled: !form.name.trim() }" @ok="save">
      <a-alert v-if="createError" type="error" show-icon :message="createError" />
      <a-form layout="vertical">
        <a-form-item :label="$t('ThirdPartyApplication.name')" required><a-input v-model:value="form.name" :disabled="saving" /></a-form-item>
        <a-form-item :label="$t('ThirdPartyApplication.description')"><a-textarea v-model:value="form.description" :rows="3" :disabled="saving" /></a-form-item>
      </a-form>
      <a-alert type="info" show-icon :message="$t('ThirdPartyApplication.direct.createHint')" />
    </a-modal>
  </j-page-container>
</template>
<script setup lang="ts" name="DirectThirdPartyApplications">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterChangePayload, ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import { useDirectApplications } from './useDirectApplications'
import { apiState } from '../applicationUtils'
import { formatTime } from '../integrationUtils'
const { t: $t } = useI18n()
const tableRef = ref<{ reload: () => void }>()
const filters = ref<{ terms: Array<Record<string, unknown>> }>({ terms: [] })
const { error, createError, saving, createOpen, form, query, openCreate, create, openDetail } = useDirectApplications()
const filterColumns = computed<ConditionFilterField[]>(() => [
  { dataIndex: 'name', title: $t('ThirdPartyApplication.name'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'state', title: $t('ApiApplication.subscription.state'), search: { type: 'select', options: [
    { label: $t('ApiApplication.status.enabled'), value: 'enabled' }, { label: $t('ApiApplication.status.disabled'), value: 'disabled' },
  ] } },
])
const columns = computed(() => [
  { title: $t('ThirdPartyApplication.name'), dataIndex: 'name', key: 'name', scopedSlots: true },
  { title: $t('ThirdPartyApplication.direct.applicationId'), dataIndex: 'id', key: 'id' },
  { title: $t('ApiApplication.subscription.state'), dataIndex: 'state', key: 'state', scopedSlots: true },
  { title: $t('ApiApplication.columns.createTime'), key: 'createTime', scopedSlots: true },
  { title: $t('ApiApplication.columns.action'), key: 'action', scopedSlots: true, width: 100 },
])
const search = ({ filter }: ConditionFilterChangePayload) => { filters.value = { terms: filter.terms as Array<Record<string, unknown>> }; tableRef.value?.reload() }
const save = async () => { if (await create()) tableRef.value?.reload() }
</script>
<style scoped>
.direct-page { padding: var(--space-4); min-height: 100%; background: var(--bg); }
.page-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; align-items: center; }
h1 { margin: 0; font-size: var(--fs-20); }p { color: var(--ink-4); margin: 4px 0 0; }.page-alert { margin: 16px 0; }
@media(max-width: 720px) { .page-head { flex-direction: column; align-items: flex-start; } }
</style>
