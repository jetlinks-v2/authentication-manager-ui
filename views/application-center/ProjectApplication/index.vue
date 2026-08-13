<template>
  <j-page-container>
    <div class="project-application-page">
      <header class="page-heading">
        <div class="page-heading__copy">
          <h1>{{ $t('ProjectApplication.list.title') }}</h1>
          <p>{{ $t('ProjectApplication.list.description') }}</p>
        </div>
        <a-button type="primary" :disabled="!projectId" @click="openCreate">
          <template #icon><AIcon type="PlusOutlined" /></template>
          {{ $t('ProjectApplication.list.create') }}
        </a-button>
      </header>

      <a-spin :spinning="loading">
        <ResponsiveGrid
          v-if="cardItems.length"
          min="min(28rem, 100%)"
          gap="var(--space-5)"
        >
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
          :description="$t(projectId ? 'ProjectApplication.list.noApplications' : 'ProjectApplication.list.missingProject')"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectRouter } from '@jetlinks-web-core/hooks/useProjectRouter'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ApplicationCard from './components/ApplicationCard.vue'
import { useProjectApplication } from './useProjectApplication'

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const { projectId } = useProjectRouter()
const store = useProjectApplication()
const loading = ref(false)

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

const refresh = async () => {
  loading.value = true
  try {
    await store.loadApplications(projectId.value || '', { keyword: '' })
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    loading.value = false
  }
}

watch(projectId, () => void refresh(), { immediate: true })

onMounted(() => store.loadTemplates().catch(() => undefined))

const openCreate = () => menuStore.jumpPage('application-center/ProjectApplication/Create', {})
const openDetail = (id: string) => menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id } })
</script>

<style scoped>
.project-application-page {
  min-height: 100%;
  padding: var(--space-6);
  background: var(--bg);
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.page-heading__copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-4);
}

.page-heading h1 {
  margin: 0;
  color: var(--ink-1);
  font-size: var(--fs-h1);
  font-weight: 600;
  white-space: nowrap;
}

.page-heading p {
  margin: 0;
  padding-left: var(--space-4);
  border-left: var(--jet-theme-stroke-width) solid var(--line);
  color: var(--ink-3);
}

.create-card {
  display: grid;
  min-height: 18rem;
  place-items: center;
  align-content: center;
  gap: var(--space-3);
  border: var(--jet-theme-stroke-width) solid var(--card-shell-border);
  border-radius: var(--card-shell-radius);
  background: var(--bg);
  color: var(--ink-1);
  cursor: pointer;
  box-shadow: var(--card-shell-shadow);
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
  color: var(--accent);
}

.create-card :deep(svg) {
  width: var(--space-10);
  height: var(--space-10);
}

@media (max-width: 48rem) {
  .project-application-page { padding: var(--space-3); }
  .page-heading { align-items: flex-start; gap: var(--space-3); }
  .page-heading__copy { align-items: flex-start; flex-direction: column; gap: var(--space-1); }
  .page-heading p { padding-left: 0; border-left: 0; }
}
</style>
