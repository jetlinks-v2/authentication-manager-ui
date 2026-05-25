<template>
  <j-page-container class="authorization-template-page">
    <FullPage>
      <div class="authorization-template-workbench">
        <QuickFilterSidebar
          class="authorization-template-sidebar"
          :sections="quickFilterSections"
          :fields="columns"
          :modelValue="filterTerms"
          :defaultOpenKeys="['state', 'scene', 'riskLevel']"
          @change="handleQuickFilterChange"
        />

        <div class="authorization-template-main">
          <section class="authorization-template-filter">
            <div class="authorization-template-filter__body">
              <ConditionFilter
                class="authorization-template-filter__input"
                :fields="columns"
                :commonFields="commonFilterFields"
                :modelValue="filterTerms"
                :placeholder="$t('AuthorizationTemplate.placeholder.search')"
                @update:modelValue="syncFilterTermsModel"
                @change="handleSearch"
              />
              <j-permission-button
                type="primary"
                class="authorization-template-filter__action"
                :hasPermission="`${permission}:add`"
                @click="openDialog()"
              >
                <AIcon type="PlusOutlined" />
                {{ $t('AuthorizationTemplate.action.add') }}
              </j-permission-button>
            </div>
          </section>

          <j-pro-table
            ref="tableRef"
            :columns="columns"
            :request="queryAuthorizationTemplate_api"
            mode="CARD"
            modeValue="CARD"
            :params="params"
            :gridColumns="[1]"
            :defaultParams="{
              sorts: [
                { name: 'modifyTime', order: 'desc' },
                { name: 'createTime', order: 'desc' },
              ],
            }"
          >
            <template #card="slotProps">
              <TemplateCard
                :data="slotProps"
                :actions="getCardActions(slotProps)"
              />
            </template>
          </j-pro-table>
        </div>
      </div>
    </FullPage>
    <EditDialog
      v-if="visible"
      :data="current"
      @close="visible = false"
      @save="onSave"
    />
  </j-page-container>
</template>

<script setup lang="ts" name="AuthorizationTemplate">
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { FullPage } from '@jetlinks-web-core/layout'
import ConditionFilter, {
  encodeConditionFilterQuery,
  isSameTerms,
  type ConditionFilterChangePayload,
  type ConditionFilterTerm,
} from '@jetlinks-web-core/components/ConditionFilter'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  deleteAuthorizationTemplate_api,
  queryAuthorizationTemplate_api,
  updateAuthorizationTemplate_api,
} from '@authentication-manager-ui/api/system/authorizationTemplate'
import EditDialog from './components/EditDialog.vue'
import TemplateCard from './components/TemplateCard.vue'
import type { AuthorizationTemplateItem, AuthorizationTemplateState } from './typings'
import {
  buildAuthorizationTemplateFilter,
  columns,
  decodeAuthorizationTemplateRouteTerms,
  getEnumValue,
  getOptionLabel,
  normalizeRouteQuery,
  stateOptions,
} from './util'
import { quickFilterSections } from './quickFilters'

const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const permission = 'system/AuthorizationTemplate'

const params = ref<Record<string, any>>({})
const filterTerms = ref<ConditionFilterTerm[]>([])
const visible = ref(false)
const current = ref<Partial<AuthorizationTemplateItem> | undefined>()
const tableRef = ref<Record<string, any>>({})
const commonFilterFields = ['name']

const syncQueryParams = (terms: ConditionFilterTerm[]) => {
  params.value = buildAuthorizationTemplateFilter(terms)
}

const syncFilterTermsModel = (terms: ConditionFilterTerm[] = []) => {
  filterTerms.value = Array.isArray(terms) ? terms : []
}

const syncRouteQuery = (terms: ConditionFilterTerm[]) => {
  router.replace({
    query: {
      ...route.query,
      q: encodeConditionFilterQuery(terms, columns) || undefined,
      target: 'system-authorization-template',
    },
  })
}

const applyFilterTerms = (terms: ConditionFilterTerm[], filter?: Record<string, any>) => {
  const nextTerms = Array.isArray(terms) ? terms : []
  syncFilterTermsModel(nextTerms)
  params.value = filter || buildAuthorizationTemplateFilter(nextTerms)
  syncRouteQuery(nextTerms)
}

const handleSearch = (payload: ConditionFilterChangePayload) => {
  applyFilterTerms(payload?.terms || filterTerms.value, payload?.filter)
}

const handleQuickFilterChange = (payload: { terms: ConditionFilterTerm[] }) => {
  applyFilterTerms(payload?.terms || [])
}

const openDialog = (row?: AuthorizationTemplateItem) => {
  current.value = row ? { ...row } : undefined
  visible.value = true
}

const getNextState = (row: AuthorizationTemplateItem): AuthorizationTemplateState => {
  return getEnumValue(row.state) === 'enabled' ? 'disabled' : 'enabled'
}

const getToggleText = (row: AuthorizationTemplateItem) => {
  return getEnumValue(row.state) === 'enabled'
    ? $t('AuthorizationTemplate.action.disable')
    : $t('AuthorizationTemplate.action.enable')
}

const getToggleConfirm = (row: AuthorizationTemplateItem) => {
  return getEnumValue(row.state) === 'enabled'
    ? $t('AuthorizationTemplate.confirm.disable', [row.name || row.id])
    : $t('AuthorizationTemplate.confirm.enable', [row.name || row.id])
}

const getCardActions = (row: AuthorizationTemplateItem) => ([
  {
    key: 'update',
    text: $t('AuthorizationTemplate.action.edit'),
    icon: 'EditOutlined',
    hasPermission: `${permission}:update`,
    onClick: () => openDialog(row),
  },
  {
    key: 'action',
    text: getToggleText(row),
    icon: getEnumValue(row.state) === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined',
    hasPermission: `${permission}:action`,
    popConfirm: {
      title: getToggleConfirm(row),
      onConfirm: () => changeState(row),
    },
  },
  {
    key: 'delete',
    text: $t('AuthorizationTemplate.action.delete'),
    icon: 'DeleteOutlined',
    hasPermission: `${permission}:delete`,
    popConfirm: {
      title: $t('AuthorizationTemplate.confirm.delete', [row.name || row.id]),
      onConfirm: () => removeTemplate(row),
    },
  },
])

const changeState = async (row: AuthorizationTemplateItem) => {
  const nextState = getNextState(row)
  const resp = await updateAuthorizationTemplate_api({
    ...row,
    scene: getEnumValue(row.scene),
    type: getEnumValue(row.type),
    riskLevel: getEnumValue(row.riskLevel),
    state: nextState,
  })
  if (resp.success || resp.status === 200) {
    onlyMessage($t('AuthorizationTemplate.message.stateSuccess', [row.name, getOptionLabel(stateOptions, nextState)]))
    tableRef.value?.reload()
  }
}

const removeTemplate = async (row: AuthorizationTemplateItem) => {
  const resp = await deleteAuthorizationTemplate_api(row.id)
  if (resp.success || resp.status === 200) {
    onlyMessage($t('AuthorizationTemplate.message.deleteSuccess', [row.name || row.id]))
    tableRef.value?.reload()
  }
}

const onSave = () => {
  visible.value = false
  tableRef.value?.reload()
}

watch(
  () => route.query.q,
  (value) => {
    const nextTerms = decodeAuthorizationTemplateRouteTerms(value)
    if (!isSameTerms(filterTerms.value, nextTerms)) {
      filterTerms.value = nextTerms
      syncQueryParams(nextTerms)
    }
    if (!nextTerms.length && normalizeRouteQuery(value)) {
      router.replace({
        query: {
          ...route.query,
          q: undefined,
          target: 'system-authorization-template',
        },
      })
    }
  },
  { immediate: true },
)
</script>

<style lang="less" scoped src="./index.less"></style>
