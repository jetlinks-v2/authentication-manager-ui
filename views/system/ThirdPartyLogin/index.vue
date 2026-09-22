<template>
  <j-page-container>
    <FullPage transparentBackground>
      <div class="third-party-page">
        <header class="page-heading">
          <h2>{{ $t('ThirdPartyLogin.title') }}</h2>
        </header>
        <a-alert class="preview-notice" type="info" show-icon :message="$t('ThirdPartyLogin.previewNotice')" />

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

              <a-table
                v-if="visibleRecords.length"
                :columns="columns"
                :data-source="visibleRecords"
                :pagination="{ pageSize: 8, hideOnSinglePage: true }"
                row-key="id"
                class="config-table"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <div class="entry-name">
                      <a-avatar shape="square" :size="36" :src="record.iconDataUrl || methodIcons[record.method as LoginMethod]" />
                      <div class="entry-copy">
                        <strong>{{ record.name }}</strong>
                        <span>{{ record.displayName }}</span>
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
                  <template v-else-if="column.key === 'showOnLogin'">
                    <a-popconfirm :title="$t('ThirdPartyLogin.visibilityConfirm')" @confirm="changeFlag(record.id, 'showOnLogin', !record.showOnLogin)">
                      <a-switch :checked="record.showOnLogin" size="small" />
                    </a-popconfirm>
                    <span class="flag-label">{{ $t(record.showOnLogin ? 'ThirdPartyLogin.visible' : 'ThirdPartyLogin.hidden') }}</span>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-popconfirm :title="$t('ThirdPartyLogin.toggleConfirm')" @confirm="changeFlag(record.id, 'enabled', !record.enabled)">
                      <a-switch :checked="record.enabled" size="small" />
                    </a-popconfirm>
                    <span class="flag-label">{{ $t(record.enabled ? 'ThirdPartyLogin.enabled' : 'ThirdPartyLogin.disabled') }}</span>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space :size="8">
                      <a-button type="link" size="small" @click="openEdit(record as LoginConfig)">{{ $t('ThirdPartyLogin.edit') }}</a-button>
                      <a-popconfirm :title="$t('ThirdPartyLogin.deleteConfirm')" @confirm="deleteRecord(record as LoginConfig)">
                        <a-button type="link" size="small" danger>{{ $t('ThirdPartyLogin.delete') }}</a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </template>
              </a-table>

              <CloudEmpty
                v-else
                type="page"
                :description="$t(records.length && (filterTerms.length || selectedMethod !== 'all')
                  ? 'ThirdPartyLogin.emptyFiltered' : 'ThirdPartyLogin.empty')"
              >
                <a-button v-if="!records.length" type="primary" @click="openCreate">
                  {{ $t('ThirdPartyLogin.addFirst') }}
                </a-button>
                <a-button v-else @click="clearFilters">{{ $t('ThirdPartyLogin.clearSearch') }}</a-button>
              </CloudEmpty>
            </section>
          </template>
        </EqualHeightColumns>
      </div>
    </FullPage>
    <ConfigDrawer
      :open="drawerOpen"
      :method="creatingMethod"
      :editing="editing"
      :records="records"
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
  countFor, openCreate, openEdit, save, remove, updateFlag,
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
  { title: t('ThirdPartyLogin.showOnLogin'), key: 'showOnLogin', width: 115 },
  { title: t('ThirdPartyLogin.updatedAt'), dataIndex: 'updatedAt', width: 145 },
  { title: t('ThirdPartyLogin.actions'), key: 'actions', width: 110, align: 'right' as const },
])

function onSelectMethod(_section: string, item: { value?: string | number | boolean | null }) {
  selectedMethod.value = (item.value || 'all') as MethodFilter
}

function onSave(draft: LoginConfigDraft) {
  if (save(draft)) message.info(t('ThirdPartyLogin.savedPreview'))
}

function deleteRecord(record: LoginConfig) {
  remove(record)
  message.info(t('ThirdPartyLogin.deletedPreview'))
}

function changeFlag(id: string, key: 'enabled' | 'showOnLogin', value: boolean) {
  updateFlag(id, key, value)
  message.info(t(key === 'enabled' ? 'ThirdPartyLogin.statusChangedPreview' : 'ThirdPartyLogin.visibilityChangedPreview'))
}

function clearFilters() {
  filterTerms.value = []
  selectedMethod.value = 'all'
}
</script>
