<template>
  <j-page-container>
    <div class="project-application-page">
      <header class="page-heading">
        <div>
          <h1>{{ $t('ProjectApplication.list.title') }}</h1>
          <p>{{ $t('ProjectApplication.list.description') }}</p>
        </div>
        <a-button type="primary" @click="openCreate">
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
          <button class="create-card" type="button" @click="openCreate">
            <AIcon type="PlusOutlined" />
            <span>{{ $t('ProjectApplication.list.createCard') }}</span>
          </button>
        </ResponsiveGrid>
        <CloudEmpty
          v-else
          type="page"
          :description="$t('ProjectApplication.list.empty')"
        >
          <a-button type="primary" @click="openCreate">
            {{ $t('ProjectApplication.list.create') }}
          </a-button>
        </CloudEmpty>
      </a-spin>
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplication">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ApplicationCard from './components/ApplicationCard.vue'
import { useProjectApplication } from './useProjectApplication'
import type { ApplicationFilters } from './types'

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const store = useProjectApplication()
const loading = ref(false)
const filters = reactive<ApplicationFilters>({ keyword: '' })
const filteredApplications = store.queryApplications(filters)

const statusOptions = computed(() => [
  { label: $t('ProjectApplication.common.enabled'), value: 'enabled' },
  { label: $t('ProjectApplication.common.disabled'), value: 'disabled' },
])

const templateOptions = computed(() => store.templates
  .filter((item) => !item.disabled)
  .map((item) => ({ label: $t(item.nameKey), value: item.id })))

const cardItems = computed(() => filteredApplications.value.map((application) => {
  const detail = store.getDetail(application.id).value
  return {
    application,
    template: store.templates.find((item) => item.id === application.templateId) || store.templates[0],
    gatewayCount: new Set(detail?.devices.map((item) => item.gateway)).size,
    cameraCount: detail?.cameras.length || 0,
  }
}))

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
