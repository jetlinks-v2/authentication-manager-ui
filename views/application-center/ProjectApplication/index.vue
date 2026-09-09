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
            @click="createOpen = true"
          >
            <template #icon><AIcon type="PlusOutlined" /></template>
            {{ $t('ProjectApplication.list.create') }}
          </a-button>
        </template>
      </PageHeader>

      <full-page hasPadding>
        <a-spin :spinning="loading">
          <CloudEmpty v-if="loadFailed" type="page" :description="$t('ProjectApplication.list.loadFailed')">
            <a-button :loading="loading" @click="refresh">{{ $t('ProjectApplication.list.retry') }}</a-button>
          </CloudEmpty>
          <ResponsiveGrid
            v-else-if="cardItems.length"
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
            <button class="create-card" type="button" @click="createOpen = true">
              <AIcon type="PlusOutlined" />
              <span>{{ $t('ProjectApplication.list.createCard') }}</span>
            </button>
          </ResponsiveGrid>
          <CloudEmpty
            v-else
            type="page"
            :description="$t(hasFilters
              ? 'ProjectApplication.list.empty'
              : 'ProjectApplication.list.noApplications')"
          >
            <a-button type="primary" @click="createOpen = true">
              {{ $t('ProjectApplication.list.create') }}
            </a-button>
          </CloudEmpty>
        </a-spin>
      </full-page>

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
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import PageHeader from '@jetlinks-web-core/components/PageHeader'
import ApplicationCreateDialog from './Create/index.vue'
import ApplicationCard from './components/ApplicationCard.vue'
import ApplicationRoleSelectModal from './components/ApplicationRoleSelectModal.vue'
import { useApplicationList } from './useApplicationList'

const {
  loading,
  loadFailed,
  createOpen,
  filterFields,
  hasFilters,
  cardItems,
  updatingApplicationIds,
  roleSelectOpen,
  roleSelectRoles,
  pendingApplication,
  openingApplicationIds,
  roleBinding,
  openApplication,
  confirmSelectedRole,
  resetRoleSelection,
  refresh,
  handleSearch,
  openDetail,
  toggleApplicationStatus,
  handleCreated,
} = useApplicationList()
</script>

<style scoped>
.project-application-page {
  min-height: 100%;
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
