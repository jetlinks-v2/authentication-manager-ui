<template>
  <j-page-container>
    <div class="project-application-page">
      <PageHeader
        class="project-application-header"
        :title="$t('ProjectApplication.list.title')"
        :description="$t('ProjectApplication.list.description')"
      >
        <template #actions>
          <ConditionFilter
            class="page-filters"
            :fields="filterFields"
            @change="handleSearch"
          />

          <a-button
            class="create-application-button"
            type="primary"
            :disabled="!projectId"
            @click="createOpen = true"
          >
            <template #icon><AIcon type="PlusOutlined" /></template>
            {{ $t('ProjectApplication.list.create') }}
          </a-button>
        </template>
      </PageHeader>

      <a-spin :spinning="loading">
        <ResponsiveGrid
          v-if="cardItems.length"
          class="application-grid"
          :cols="3"
          gap="var(--space-3)"
        >
          <ApplicationCard
            v-for="item in cardItems"
            :key="item.application.id"
            :item="item"
            :loading="updatingApplicationIds.includes(item.application.id)"
            :opening="openingApplicationIds.includes(item.application.id)"
            @edit="openDetail(item.application.id)"
            @toggle-status="toggleApplicationStatus(item.application)"
            @open="openApplication(item.application)"
          />
          <button v-if="projectId" class="create-card" type="button" @click="createOpen = true">
            <AIcon type="PlusOutlined" />
            <span>{{ $t('ProjectApplication.list.createCard') }}</span>
          </button>
        </ResponsiveGrid>
        <CloudEmpty
          v-else
          type="page"
          :description="$t(!projectId
            ? 'ProjectApplication.list.missingProject'
            : hasFilters
              ? 'ProjectApplication.list.empty'
              : 'ProjectApplication.list.noApplications')"
        >
          <a-button v-if="projectId" type="primary" @click="createOpen = true">
            {{ $t('ProjectApplication.list.create') }}
          </a-button>
        </CloudEmpty>
      </a-spin>

      <ApplicationCreateDialog
        v-model:open="createOpen"
        embedded
        @created="handleCreated"
      />
      <ApplicationRoleSelectModal
        v-model:open="roleSelectOpen"
        :roles="roleSelectRoles"
        :application-name="pendingApplication?.name || ''"
        :confirm-loading="roleBinding"
        @confirm="confirmSelectedRole"
        @cancel="resetRoleSelection"
      />
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplication">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import ConditionFilter, {
  type ConditionFilterChangePayload,
  type ConditionFilterField,
} from '@jetlinks-web-core/components/ConditionFilter'
import PageHeader from '@jetlinks-web-core/components/PageHeader'
import { useProjectRouter } from '@jetlinks-web-core/hooks/useProjectRouter'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ApplicationCreateDialog from './Create/index.vue'
import ApplicationCard from './components/ApplicationCard.vue'
import ApplicationRoleSelectModal from './components/ApplicationRoleSelectModal.vue'
import { useApplicationOpenGuard } from './useApplicationOpenGuard'
import { useProjectApplication } from './useProjectApplication'
import type { ProjectApplication } from './types'

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const { projectId } = useProjectRouter()
const store = useProjectApplication()
const loading = ref(false)
const createOpen = ref(false)
const filters = ref<ConditionFilterChangePayload['filter']>({ terms: [] })
const updatingApplicationIds = ref<string[]>([])
let refreshSequence = 0
const {
  roleSelectOpen,
  roleSelectRoles,
  pendingApplication,
  openingApplicationIds,
  roleBinding,
  openApplication,
  confirmSelectedRole,
  resetRoleSelection,
} = useApplicationOpenGuard()

const statusOptions = computed(() => [
  { label: $t('ProjectApplication.common.enabled'), value: 'enabled' },
  { label: $t('ProjectApplication.common.disabled'), value: 'disabled' },
])
const filterFields = computed<ConditionFilterField[]>(() => [
  {
    title: $t('ProjectApplication.create.name'),
    dataIndex: 'name',
    search: {
      type: 'string',
      defaultTermType: 'like',
      componentProps: {
        placeholder: $t('ProjectApplication.list.searchPlaceholder'),
      },
    },
  },
  {
    title: $t('ProjectApplication.detail.status'),
    dataIndex: 'state',
    search: {
      type: 'select',
      defaultTermType: 'eq',
      options: statusOptions,
      componentProps: {
        placeholder: $t('ProjectApplication.list.allStatus'),
      },
    },
  },
])
const hasFilters = computed(() => filters.value.terms.length > 0)

const cardItems = computed(() => store.applications.map(application => ({
  application,
  template: store.templates.find(item => item.id === application.templateId) || {
    id: application.templateId,
    name: application.templateId,
    code: application.templateId,
    description: '',
    status: 'disabled' as const,
    statusText: '',
    sortIndex: 0,
    disabled: true,
  },
})))

// Project switches and filter changes can overlap; only the latest request controls page loading.
const refresh = async () => {
  const sequence = ++refreshSequence
  loading.value = true
  try {
    await store.loadApplications(projectId.value || '', filters.value)
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    if (sequence === refreshSequence) loading.value = false
  }
}

watch(projectId, () => {
  void refresh()
}, { immediate: true })

const handleSearch = ({ filter }: ConditionFilterChangePayload) => {
  filters.value = filter
  if (projectId.value) void refresh()
}

onMounted(() => store.loadTemplates().catch(() => undefined))

const openDetail = (id: string) => menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id } })

const toggleApplicationStatus = async (application: ProjectApplication) => {
  if (updatingApplicationIds.value.includes(application.id)) return
  const actionKey = application.status === 'enabled' ? 'disable' : 'enable'
  const nextStatus = application.status === 'enabled' ? 'disabled' : 'enabled'
  updatingApplicationIds.value = [...updatingApplicationIds.value, application.id]
  try {
    const updated = await store.updateApplication(application.id, { status: nextStatus })
    if (updated) {
      onlyMessage($t('ProjectApplication.detail.statusSuccess', {
        action: $t(`ProjectApplication.common.${actionKey}`),
        name: updated.name,
      }))
    }
  } finally {
    updatingApplicationIds.value = updatingApplicationIds.value.filter(id => id !== application.id)
  }
}

const handleCreated = () => {
  createOpen.value = false
  void refresh()
}
</script>

<style scoped>
.project-application-page {
  min-height: 100%;
  background: var(--bg);
}

.page-filters {
  width: min(34rem, 46vw);
  min-width: 0;
}

.create-card {
  display: grid;
  height: 12.75rem;
  place-items: center;
  align-content: center;
  gap: var(--space-3);
  border: var(--jet-theme-stroke-width) solid var(--card-shell-border);
  border-radius: var(--card-shell-radius);
  background: var(--bg);
  color: var(--ink-1);
  font-size: var(--fs-body);
  cursor: pointer;
  transition: var(--card-shell-transition);
}

.create-card:hover {
  border-color: var(--card-shell-border-hover);
  box-shadow: var(--card-shell-shadow-hover);
}

.create-card:focus-visible {
  border-color: var(--card-shell-border-active);
  box-shadow: var(--ring-focus);
  outline: none;
}

.create-card :deep(.anticon) {
  width: var(--space-8);
  height: var(--space-8);
  color: var(--accent);
}

.create-card :deep(svg) {
  width: var(--space-7);
  height: var(--space-7);
}

@media (max-width: 62rem) {
  .application-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}

@media (max-width: 48rem) {
  .project-application-header :deep(.cloud-page-header__actions) {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }
  .page-filters,
  .create-application-button { width: 100%; }
}

@media (max-width: 40rem) {
  .application-grid { grid-template-columns: 1fr !important; }
}
</style>
