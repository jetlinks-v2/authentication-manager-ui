<template>
  <j-page-container>
    <div class="project-application-page">
      <header class="page-heading">
        <div>
          <h1>{{ $t('ProjectApplication.list.title') }}</h1>
          <p>{{ $t('ProjectApplication.list.description') }}</p>
        </div>
        <a-button type="primary" :disabled="!projectId" @click="openCreate">
          <template #icon><AIcon type="PlusOutlined" /></template>
          {{ $t('ProjectApplication.list.create') }}
        </a-button>
      </header>

      <div class="filters">
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          :placeholder="$t('ProjectApplication.list.searchPlaceholder')"
        >
          <template #prefix><AIcon type="SearchOutlined" /></template>
        </a-input>
        <a-select
          v-model:value="filters.status"
          allow-clear
          :placeholder="$t('ProjectApplication.list.allStatus')"
          :options="statusOptions"
        />
        <a-select
          v-model:value="filters.templateId"
          allow-clear
          :placeholder="$t('ProjectApplication.list.allTemplates')"
          :options="templateOptions"
        />
      </div>

      <a-spin :spinning="loading">
        <ResponsiveGrid v-if="cardItems.length" :min="300" gap="var(--space-4)">
          <ApplicationCard
            v-for="item in cardItems"
            :key="item.application.id"
            :item="item"
            @open="openDetail(item.application.id)"
          />
          <button v-if="projectId" class="create-card" type="button" @click="openCreate">
            <AIcon type="PlusOutlined" />
            <span>{{ $t('ProjectApplication.list.createCard') }}</span>
          </button>
        </ResponsiveGrid>
        <CloudEmpty
          v-else
          type="page"
          :description="$t(projectId ? 'ProjectApplication.list.empty' : 'ProjectApplication.list.missingProject')"
        >
          <a-button v-if="projectId" type="primary" @click="openCreate">
            {{ $t('ProjectApplication.list.create') }}
          </a-button>
        </CloudEmpty>
      </a-spin>
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplication">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectRouter } from '@jetlinks-web-core/hooks/useProjectRouter'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ApplicationCard from './components/ApplicationCard.vue'
import { useProjectApplication } from './useProjectApplication'
import type { ApplicationFilters } from './types'

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const { projectId } = useProjectRouter()
const store = useProjectApplication()
const loading = ref(false)
const filters = reactive<ApplicationFilters>({ keyword: '' })

const statusOptions = computed(() => [
  { label: $t('ProjectApplication.common.enabled'), value: 'enabled' },
  { label: $t('ProjectApplication.common.disabled'), value: 'disabled' },
])

const templateOptions = computed(() => store.templates.map(item => ({ label: item.name, value: item.id })))

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

let refreshTimer: ReturnType<typeof setTimeout> | undefined
const refresh = async () => {
  loading.value = true
  try {
    await store.loadApplications(projectId.value || '', filters)
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    loading.value = false
  }
}

watch(
  () => [projectId.value, filters.keyword, filters.status, filters.templateId],
  () => {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(refresh, 250)
  },
  { immediate: true },
)

onMounted(() => store.loadTemplates().catch(() => undefined))
onBeforeUnmount(() => refreshTimer && clearTimeout(refreshTimer))

const openCreate = () => menuStore.jumpPage('application-center/ProjectApplication/Create', {})
const openDetail = (id: string) => menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id } })
</script>

<style scoped>
.project-application-page {
  min-height: 100%;
  padding: var(--space-5);
  background: var(--bg-sunken);
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.page-heading h1 {
  margin: 0;
  color: var(--ink-1);
  font-size: var(--fs-20);
  font-weight: 600;
}

.page-heading p {
  margin: var(--space-1) 0 0;
  color: var(--ink-3);
}

.filters {
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) 10rem 10rem;
  gap: var(--space-3);
  max-width: 48rem;
  margin-bottom: var(--space-4);
}

.create-card {
  display: grid;
  min-height: 13rem;
  place-items: center;
  align-content: center;
  gap: var(--space-3);
  border: 1px dashed var(--line-strong);
  border-radius: var(--jet-theme-radius-sm);
  background: var(--bg);
  color: var(--ink-3);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.create-card:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.create-card :deep(svg) {
  width: 1.75rem;
  height: 1.75rem;
}

@media (max-width: 48rem) {
  .project-application-page { padding: var(--space-3); }
  .page-heading { align-items: flex-start; }
  .filters { grid-template-columns: 1fr; }
}
</style>
