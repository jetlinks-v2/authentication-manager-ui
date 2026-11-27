<template>
  <j-page-container>
    <div class="project-application-page">
      <full-page transparentBackground hasPadding>
        <a-spin :spinning="loading">
          <div style="margin-bottom: var(--space-4);">
            <a-flex justify="space-between" align="center">
              <h2 class="project-page-title">{{ $t('ProjectApplication.list.title') }}</h2>
	            <a-space>
		            <ConditionFilter
			            :fields="filterFields"
			            @change="handleSearch"
		            />

		            <j-permission-button
			            :hasPermission="`${permission}:add`"
			            class="create-application-button"
			            type="primary"
			            @click="openCreate"
		            >
			            <template #icon><AIcon type="PlusOutlined" /></template>
			            {{ $t('ProjectApplication.list.create') }}
		            </j-permission-button>
	            </a-space>
            </a-flex>
          </div>
          <CloudEmpty v-if="loadFailed" type="page" :description="$t('ProjectApplication.list.loadFailed')">
            <a-button :loading="loading" @click="refresh">{{ $t('ProjectApplication.list.retry') }}</a-button>
          </CloudEmpty>
          <ResponsiveGrid
            v-else-if="cardItems.length"
            class="application-grid"
            :cols="4"
            gap="var(--space-3)"
          >
            <ApplicationCard
              v-for="item in cardItems"
              :key="item.application.id"
              :item="item"
              :loading="updatingApplicationIds.includes(item.application.id)"
              :opening="openingApplicationIds.includes(item.application.id)"
              :deleting="deletingApplicationIds.has(item.application.id)"
              @delete="handleDelete(item.application)"
              @edit="openDetail(item.application.id)"
              @toggle-status="toggleApplicationStatus(item.application)"
              @open="openApplication(item.application)"
            />
          </ResponsiveGrid>
          <CloudEmpty
            v-else
            type="page"
            :description="$t(hasFilters
              ? 'ProjectApplication.list.empty'
              : 'ProjectApplication.list.noApplications')" :search="hasFilters" :search-name="$t('components.EditForm.949962-3')">
            <j-permission-button v-if="!hasFilters" :hasPermission="`${permission}:add`" type="primary" @click="openCreate">
              {{ $t('ProjectApplication.list.create') }}
            </j-permission-button>
          </CloudEmpty>
        </a-spin>
      </full-page>

      <ApplicationCreateDialog
        v-if="canCreate"
        v-model:open="createOpen"
        embedded
        @created="handleCreated"
      />
    </div>
  </j-page-container>
</template>

<script setup lang="ts">
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import ApplicationCreateDialog from './Create/index.vue'
import ApplicationCard from './components/ApplicationCard.vue'
import { useApplicationList } from './useApplicationList'

defineOptions({ name: 'ProjectApplication' })

const {
  permission,
  canCreate,
  openCreate,
  loading,
  loadFailed,
  createOpen,
  filterFields,
  hasFilters,
  cardItems,
  updatingApplicationIds,
  openingApplicationIds,
  deletingApplicationIds,
  openApplication,
  refresh,
  handleSearch,
  openDetail,
  toggleApplicationStatus,
  handleDelete,
  handleCreated,
} = useApplicationList()
</script>

<style scoped>
.project-application-page {
  /* 应用卡片使用统一行高。 */
  --application-card-block-size: 16rem;

  min-height: 100%;
}

.project-page-title {
	font-size: var(--fs-18);
	font-weight: 600;
}

.page-filters {
  width: min(34rem, 46vw);
  min-width: 0;
}

.application-grid {
  grid-auto-rows: 1fr;
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
