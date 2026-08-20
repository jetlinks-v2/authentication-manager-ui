<template>
  <j-page-container>
    <div class="project-application-page">
      <div class="page-toolbar">
        <div class="page-filters">
          <a-input
            v-model:value="keyword"
            allow-clear
            :placeholder="$t('ProjectApplication.list.searchPlaceholder')"
          >
            <template #prefix><AIcon type="SearchOutlined" /></template>
          </a-input>
          <a-select
            v-model:value="status"
            allow-clear
            :placeholder="$t('ProjectApplication.list.allStatus')"
            :options="statusOptions"
          />
        </div>

        <a-button type="primary" :disabled="!projectId" @click="createOpen = true">
          <template #icon><AIcon type="PlusOutlined" /></template>
          {{ $t('ProjectApplication.list.create') }}
        </a-button>
      </div>

      <a-spin :spinning="loading">
        <ResponsiveGrid
          v-if="cardItems.length"
          class="application-grid"
          :cols="3"
          gap="var(--space-4)"
        >
          <ApplicationCard
            v-for="item in cardItems"
            :key="item.application.id"
            :item="item"
            :loading="updatingApplicationIds.includes(item.application.id)"
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
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplication">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce } from 'lodash-es'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectRouter } from '@jetlinks-web-core/hooks/useProjectRouter'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { prepareApplicationAccess } from '@jetlinks-web-core/utils/application-access'
import ApplicationCreateDialog from './Create/index.vue'
import ApplicationCard from './components/ApplicationCard.vue'
import { useProjectApplication } from './useProjectApplication'
import type { ApplicationStatus, ProjectApplication } from './types'

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const { projectId } = useProjectRouter()
const store = useProjectApplication()
const loading = ref(false)
const createOpen = ref(false)
const keyword = ref('')
const status = ref<ApplicationStatus>()
const updatingApplicationIds = ref<string[]>([])
let refreshSequence = 0

const statusOptions = computed(() => [
  { label: $t('ProjectApplication.common.enabled'), value: 'enabled' },
  { label: $t('ProjectApplication.common.disabled'), value: 'disabled' },
])
const hasFilters = computed(() => !!keyword.value.trim() || !!status.value)

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

// Name filtering is debounced, but status/project changes can still overtake an older request.
const refresh = async () => {
  const sequence = ++refreshSequence
  loading.value = true
  try {
    await store.loadApplications(projectId.value || '', {
      keyword: keyword.value,
      status: status.value,
    })
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    if (sequence === refreshSequence) loading.value = false
  }
}

const refreshByKeyword = debounce(() => {
  if (projectId.value) void refresh()
}, 300)

watch(projectId, () => {
  refreshByKeyword.cancel()
  void refresh()
}, { immediate: true })
watch(keyword, refreshByKeyword)
watch(status, () => {
  if (projectId.value) void refresh()
})

onMounted(() => store.loadTemplates().catch(() => undefined))
onBeforeUnmount(() => refreshByKeyword.cancel())

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

const openApplication = (application: ProjectApplication) => {
  const access = prepareApplicationAccess({
    applicationId: application.id,
    applicationName: application.name,
    domain: application.domain,
  })
  if (!access.success) {
    onlyMessage($t('ProjectApplication.detail.accessFailed'), 'warning')
    return
  }
  window.open(access.url, '_blank', 'noopener,noreferrer')
}

const handleCreated = () => {
  createOpen.value = false
  void refresh()
}
</script>

<style scoped>
.project-application-page {
  min-height: 100%;
  padding: var(--space-4);
  background: var(--bg);
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.page-filters {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.page-filters :deep(.ant-input-affix-wrapper) { width: min(100%, 17.5rem); }
.page-filters :deep(.ant-select) { width: 9.5rem; }

.create-card {
  display: grid;
  height: 13.75rem;
  place-items: center;
  align-content: center;
  gap: var(--space-2);
  border: 1px dashed var(--line-strong);
  border-radius: var(--card-shell-radius);
  background: var(--bg);
  color: var(--ink-2);
  cursor: pointer;
  transition: var(--card-shell-transition);
}

.create-card:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.create-card:focus-visible {
  border-color: var(--card-shell-border-active);
  box-shadow: var(--ring-focus);
  outline: none;
}

.create-card :deep(svg) { width: var(--space-8); height: var(--space-8); }

@media (max-width: 62rem) {
  .application-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}

@media (max-width: 48rem) {
  .project-application-page { padding: var(--space-3); }
  .page-toolbar { align-items: stretch; flex-direction: column; }
  .page-filters { flex-direction: column; }
  .page-filters :deep(.ant-input-affix-wrapper),
  .page-filters :deep(.ant-select),
  .page-toolbar > :deep(.ant-btn) { width: 100%; }
}

@media (max-width: 40rem) {
  .application-grid { grid-template-columns: 1fr !important; }
}
</style>
