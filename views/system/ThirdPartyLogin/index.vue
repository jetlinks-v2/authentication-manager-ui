<template>
  <j-page-container>
    <FullPage transparentBackground>
      <div class="third-party-page">
        <header class="page-heading">
          <h2>{{ $t('ThirdPartyLogin.title') }}</h2>
        </header>

        <EqualHeightColumns class="config-layout" height="auto" left-width="14.5rem" right-width="1fr">
          <template #left>
            <QuickFilterSidebar
              :title="$t('ThirdPartyLogin.loginTypes')"
              :sections="methodSections"
              @select="onSelectMethod"
            >
              <template #item="{ item }">
                <span class="method-option">
                  <AIcon v-if="item.value === 'all'" type="AppstoreOutlined" />
                  <img v-else :src="methodIcons[item.value as LoginMethod]" alt="" />
                  <span>{{ item.label }}</span>
                </span>
                <span class="method-count">{{ item.meta }}</span>
              </template>
            </QuickFilterSidebar>
          </template>
          <template #right>
            <section class="config-panel">
              <a-flex class="config-toolbar" :gap="16" align="center" wrap="wrap">
                <ConditionFilter
                  v-model="filterTerms"
                  class="config-search"
                  :fields="filterFields"
                  :common-fields="['keyword']"
                  :placeholder="$t('ThirdPartyLogin.searchPlaceholder')"
                />
                <a-space class="config-actions">
                  <a-button type="primary" @click="openCreate">
                    <template #icon><AIcon type="PlusOutlined" /></template>
                    {{ $t('ThirdPartyLogin.add') }}
                  </a-button>
                </a-space>
              </a-flex>

              <a-spin :spinning="loading">
                <a-result v-if="error" status="error" :title="$t('ThirdPartyLogin.loadFailed')">
                  <template #extra>
                    <a-button type="primary" @click="retryLoad">{{ $t('ThirdPartyLogin.retry') }}</a-button>
                  </template>
                </a-result>

                <a-table
                  v-else-if="visibleRecords.length"
                  :columns="columns"
                  :data-source="visibleRecords"
                  :pagination="{ pageSize: 8, hideOnSinglePage: true }"
                  row-key="id"
                  class="config-table"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'name'">
                      <div class="entry-name">
                        <a-avatar shape="square" :size="36" :src="record.logoUrl || methodIcons[record.method as LoginMethod]" />
                        <div class="entry-copy">
                          <strong>{{ record.name }}</strong>
                        </div>
                      </div>
                    </template>
                    <template v-else-if="column.key === 'method'">
                      {{ $t(`ThirdPartyLogin.${record.method}`) }}
                    </template>
                    <template v-else-if="column.key === 'identifier'">
                      <a-tooltip :title="identifierOf(record as LoginConfig)">
                        <span class="identifier">{{ identifierOf(record as LoginConfig) }}</span>
                      </a-tooltip>
                    </template>
                    <template v-else-if="column.key === 'status'">
                      <a-popconfirm :title="$t('ThirdPartyLogin.toggleConfirm')" @confirm="changeEnabled(record.id, !record.enabled)">
                        <a-switch :checked="record.enabled" size="small" />
                      </a-popconfirm>
                      <span class="flag-label">{{ $t(record.enabled ? 'ThirdPartyLogin.enabled' : 'ThirdPartyLogin.disabled') }}</span>
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <a-space :size="8">
                        <!-- 后端暂无无副作用的 SSO 测试接口，接口补齐后再开放测试入口。 -->
                        <a-button type="link" size="small" @click="editRecord(record as LoginConfig)">{{ $t('ThirdPartyLogin.edit') }}</a-button>
                        <a-popconfirm :disabled="record.enabled" :title="$t('ThirdPartyLogin.deleteConfirm')" @confirm="deleteRecord(record as LoginConfig)">
                          <a-button type="link" size="small" danger :disabled="record.enabled">{{ $t('ThirdPartyLogin.delete') }}</a-button>
                        </a-popconfirm>
                      </a-space>
                    </template>
                  </template>
                </a-table>

                <CloudEmpty
                  v-else-if="!loading"
                  type="page"
                  :description="$t(records.length && (filterTerms.length || selectedMethod !== 'all')
                    ? 'ThirdPartyLogin.emptyFiltered' : 'ThirdPartyLogin.empty')"
                >
                  <a-button v-if="!records.length" type="primary" @click="openCreate">
                    {{ $t('ThirdPartyLogin.addFirst') }}
                  </a-button>
                  <a-button v-else @click="clearFilters">{{ $t('ThirdPartyLogin.clearSearch') }}</a-button>
                </CloudEmpty>
              </a-spin>
            </section>
          </template>
        </EqualHeightColumns>
      </div>
    </FullPage>
    <ConfigDrawer
      :open="drawerOpen"
      :method="creatingMethod"
      :editing="editing"
      :saving="saving"
      :callback-base-path="callbackBasePath"
      @update:open="drawerOpen = $event"
      @save="onSave"
    />
  </j-page-container>
</template>

<script setup lang="ts" name="ThirdPartyLogin">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import ConfigDrawer from './components/ConfigDrawer.vue'
import { methodIcons } from './methodIcons'
import { identifierOf, loginMethods, type LoginConfig, type LoginConfigDraft, type LoginMethod, type MethodFilter } from './model'
import { useThirdPartyLogin } from './useThirdPartyLogin'
import './index.less'

const { t } = useI18n()
const {
  records, selectedMethod, filterTerms, visibleRecords, drawerOpen, editing, creatingMethod,
  loading, saving, error, callbackBasePath,
  countFor, loadRecords, openCreate, openEdit, save, remove, updateEnabled,
} = useThirdPartyLogin()

const methodSections = computed(() => [{
  key: 'methods',
  title: '',
  collapsible: false,
  activeValue: selectedMethod.value,
  items: (['all', ...loginMethods] as MethodFilter[]).map(method => ({
    key: method,
    value: method,
    label: t(`ThirdPartyLogin.${method}`),
    meta: String(countFor(method)),
  })),
}])

const filterFields = computed<ConditionFilterField[]>(() => [{
  dataIndex: 'keyword',
  title: t('ThirdPartyLogin.keyword'),
  search: { type: 'string', defaultTermType: 'like', termTypeOptions: ['like'] },
}])

const columns = computed(() => [
  { title: t('ThirdPartyLogin.name'), key: 'name', width: 195 },
  { title: t('ThirdPartyLogin.status'), key: 'status', width: 105 },
  { title: t('ThirdPartyLogin.type'), key: 'method', width: 85 },
  { title: t('ThirdPartyLogin.identifier'), key: 'identifier', width: 150 },
  { title: t('ThirdPartyLogin.createdAt'), dataIndex: 'createdAt', width: 145 },
  { title: t('ThirdPartyLogin.actions'), key: 'actions', width: 110, align: 'right' as const },
])

function onSelectMethod(_section: string, item: { value?: string | number | boolean | null }) {
  selectedMethod.value = (item.value || 'all') as MethodFilter
}

async function onSave(draft: LoginConfigDraft) {
  try {
    if (await save(draft)) message.success(t('ThirdPartyLogin.saved'))
  } catch {
    message.error(t('ThirdPartyLogin.saveFailed'))
  }
}

async function editRecord(record: LoginConfig) {
  try {
    await openEdit(record)
  } catch {
    message.error(t('ThirdPartyLogin.loadDetailFailed'))
  }
}

async function deleteRecord(record: LoginConfig) {
  try {
    await remove(record)
    message.success(t('ThirdPartyLogin.deleted'))
  } catch {
    message.error(t('ThirdPartyLogin.deleteFailed'))
  }
}

async function changeEnabled(id: string, enabled: boolean) {
  try {
    await updateEnabled(id, enabled)
    message.success(t('ThirdPartyLogin.statusChanged'))
  } catch {
    message.error(t('ThirdPartyLogin.statusChangeFailed'))
  }
}

async function retryLoad() {
  try {
    await loadRecords()
  } catch {
    message.error(t('ThirdPartyLogin.loadFailed'))
  }
}

function clearFilters() {
  filterTerms.value = []
  selectedMethod.value = 'all'
}
</script>
