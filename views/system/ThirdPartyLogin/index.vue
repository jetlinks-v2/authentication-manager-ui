<template>
  <j-page-container>
    <FullPage transparentBackground>
      <div class="third-party-page">
        <header class="page-heading">
          <h2>{{ $t('ThirdPartyLogin.title') }}</h2>
        </header>

        <section class="config-panel">
          <a-flex class="config-toolbar" :gap="16" align="center" wrap="wrap">
            <ConditionFilter
              v-model="filterTerms"
              class="config-search"
              :fields="filterFields"
              :common-fields="['keyword']"
              :placeholder="$t('ThirdPartyLogin.searchPlaceholder')"
            />
            <a-flex class="config-actions" :gap="16" align="center" wrap="wrap">
              <a-button-group role="group" :aria-label="$t('ThirdPartyLogin.loginTypes')">
                <a-button
                  v-for="option in methodOptions"
                  :key="option.value"
                  :type="selectedMethod === option.value ? 'primary' : 'default'"
                  :ghost="selectedMethod === option.value"
                  :aria-pressed="selectedMethod === option.value"
                  @click="onSelectMethod(option.value)"
                >
                  <template #icon><img class="method-icon" :src="methodIcons[option.value]" alt="" /></template>
                  {{ option.label }} {{ option.count }}
                </a-button>
              </a-button-group>
              <a-button type="primary" @click="openCreate">
                <template #icon><AIcon type="PlusOutlined" /></template>
                {{ $t('ThirdPartyLogin.add') }}
              </a-button>
            </a-flex>
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
                    <j-permission-button
                      type="link"
                      size="small"
                      :tooltip="{ title: $t('ThirdPartyLogin.edit') }"
                      @click="editRecord(record as LoginConfig)"
                    >
                      <span role="img" :aria-label="$t('ThirdPartyLogin.edit')"><AIcon type="EditOutlined" /></span>
                    </j-permission-button>
                    <a-popconfirm :disabled="record.enabled" :title="$t('ThirdPartyLogin.deleteConfirm')" @confirm="deleteRecord(record as LoginConfig)">
                      <j-permission-button
                        type="link"
                        size="small"
                        danger
                        :disabled="record.enabled"
                        :tooltip="{ title: $t('ThirdPartyLogin.delete') }"
                      >
                        <span role="img" :aria-label="$t('ThirdPartyLogin.delete')"><AIcon type="DeleteOutlined" /></span>
                      </j-permission-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>

            <CloudEmpty
              v-else-if="!loading"
              type="page"
              :description="$t(records.length && (filterTerms.length || selectedMethod !== 'all')
                ? 'ThirdPartyLogin.emptyFiltered' : 'ThirdPartyLogin.empty')" :search="filterTerms.length > 0 || selectedMethod !== 'all'" :search-name="$t('ApplicationTemplate.detail.config')">
              <a-button v-if="!records.length" type="primary" @click="openCreate">
                {{ $t('ThirdPartyLogin.addFirst') }}
              </a-button>
              <a-button v-else @click="clearFilters">{{ $t('ThirdPartyLogin.clearSearch') }}</a-button>
            </CloudEmpty>
          </a-spin>
        </section>
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
import { identifierOf, loginMethods, type LoginConfig, type LoginConfigDraft, type LoginMethod } from './model'
import { useThirdPartyLogin } from './useThirdPartyLogin'
import './index.less'

const { t } = useI18n()
const {
  records, selectedMethod, filterTerms, visibleRecords, drawerOpen, editing, creatingMethod,
  loading, saving, error, callbackBasePath,
  countFor, loadRecords, openCreate, openEdit, save, remove, updateEnabled,
} = useThirdPartyLogin()

const methodOptions = computed(() => loginMethods.map(method => ({
  value: method,
  label: t(`ThirdPartyLogin.${method}`),
  count: countFor(method),
})))

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

/** 与设备状态筛选一致，再次点击当前类型恢复全部。 */
function onSelectMethod(method: LoginMethod) {
  selectedMethod.value = selectedMethod.value === method ? 'all' : method
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
