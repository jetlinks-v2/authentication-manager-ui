<template>
  <DefineEmptyCreate>
    <j-permission-button
      class="authentication-system-list-page__primary-action"
      has-permission="system/Announcement:add"
      type="primary"
      @click="$emit('create')"
    >
      <AIcon type="PlusOutlined" />
      {{ $t('Announcement.action.create') }}
    </j-permission-button>
  </DefineEmptyCreate>

  <FullPage v-bind="$attrs" :flex="true" class="announcement-list-page">
    <AnnouncementListFilters @change="applyFilters" />

    <ContentPanel fill class="announcement-list-page__table-panel">
      <j-pro-table
        ref="tableRef"
        class="pro-table__no-padding announcement-list-page__table"
        :columns="columns"
        :request="queryAnnouncements"
        :params="queryParams"
        mode="TABLE"
        :default-params="{ sorts: [{ name: 'createTime', order: 'desc' }] }"
        :scroll="{ y: 'calc(100% - 3.75rem)' }"
      >
        <template #emptyText>
          <CloudEmpty :search="queryParams.terms" :search-name="$t('Announcement.inbox.title')">
            <EmptyCreateButton />
          </CloudEmpty>
        </template>
        <template #headerLeftRender>
          <EmptyCreateButton />
        </template>

        <template #announcementTitle="record">
          <div class="announcement-title-cell">
            <j-ellipsis
              class="announcement-title-cell__title"
              :tooltip="{ placement: 'topLeft' }"
            >
              {{ record.title }}
            </j-ellipsis>
            <j-ellipsis
              :line-clamp="1"
              :tooltip="{ placement: 'topLeft' }"
              class="announcement-title-cell__summary"
            >
              {{ record.summary || $t('comm.table.empty') }}
            </j-ellipsis>
          </div>
        </template>
        <template #state="record">
          <j-badge-status
            :status="record?.state"
            :text="resolveStateLabel(record)"
            :status-names="statusNames"
          />
        </template>
        <template #type="record">
          {{ record.typeText || record.type || $t('comm.table.empty-2') }}
        </template>
        <template #popup="record">
          {{ $t(record.popup ? 'Announcement.value.yes' : 'Announcement.value.no') }}
        </template>
        <template #createTime="record">
          {{ record.createTime || $t('comm.table.empty-2') }}
        </template>
        <template #deployTime="record">
          {{ record.deployTime || $t('comm.table.empty-2') }}
        </template>
        <template #action="record">
          <!-- 后端只允许修改和删除未发布公告，行内动作按公告生命周期收口。 -->
          <a-space :size="16" class="announcement-action-cell">
            <j-permission-button
              v-if="record.state === 'published'"
              has-permission="system/Announcement:view"
              type="link"
              class="announcement-action"
              @click="$emit('inspect', record)"
            >
              {{ $t('Announcement.action.view') }}
            </j-permission-button>
            <j-permission-button
              v-if="record.state === 'unpublished'"
              has-permission="system/Announcement:edit"
              type="link"
              class="announcement-action"
              @click="$emit('edit', record)"
            >
              {{ $t('Announcement.action.edit') }}
            </j-permission-button>
            <j-permission-button
              v-if="record.state === 'unpublished'"
              has-permission="system/Announcement:publish"
              type="link"
              class="announcement-action"
              :pop-confirm="{
                title: $t('Announcement.confirm.publish'),
                onConfirm: () => $emit('publish', record),
              }"
            >
              {{ $t('Announcement.action.publish') }}
            </j-permission-button>
            <j-permission-button
              v-if="record.state === 'published'"
              has-permission="system/Announcement:withdraw"
              type="link"
              danger
              class="announcement-action"
              :pop-confirm="{
                title: $t('Announcement.confirm.withdraw'),
                onConfirm: () => $emit('withdraw', record),
              }"
            >
              {{ $t('Announcement.action.withdraw') }}
            </j-permission-button>
            <j-permission-button
              v-if="record.state === 'unpublished'"
              has-permission="system/Announcement:delete"
              type="link"
              danger
              class="announcement-action"
              :pop-confirm="{
                title: $t('Announcement.confirm.delete'),
                onConfirm: () => $emit('remove', record),
              }"
            >
              {{ $t('Announcement.action.delete') }}
            </j-permission-button>
          </a-space>
        </template>
      </j-pro-table>
    </ContentPanel>
  </FullPage>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { ContentPanel } from '@jetlinks-web-core/components'
import { FullPage } from '@jetlinks-web-core/layout'
import { queryAnnouncements } from '../api'
import type { AnnouncementRecord, AnnouncementState } from '../types'
import { resolveAnnouncementStateLabel } from '../announcementI18n'
import AnnouncementListFilters from './AnnouncementListFilters.vue'

defineEmits<{
  (event: 'create'): void
  (event: 'edit', record: AnnouncementRecord): void
  (event: 'inspect', record: AnnouncementRecord): void
  (event: 'publish', record: AnnouncementRecord): void
  (event: 'withdraw', record: AnnouncementRecord): void
  (event: 'remove', record: AnnouncementRecord): void
}>()

const { t: $t, locale } = useI18n()
const tableRef = ref<{ reload: () => void }>()
const filters = ref<{ keyword: string; state: 'all' | AnnouncementState }>({ keyword: '', state: 'all' })
const statusNames = { published: 'success', unpublished: 'default' }
const queryParams = computed(() => {
  const terms: Record<string, unknown>[] = []
  const value = filters.value.keyword
  if (value) {
    const likeValue = `%${value}%`
    terms.push({
      type: 'and',
      terms: [
        { column: 'title', termType: 'like', value: likeValue },
        { column: 'summary', termType: 'like', value: likeValue, type: 'or' },
      ],
    })
  }
  if (filters.value.state !== 'all') {
    terms.push({ column: 'state', termType: 'eq', value: filters.value.state })
  }
  return { terms }
})

const resolveStateLabel = (record?: AnnouncementRecord) =>
  resolveAnnouncementStateLabel(record?.state) || record?.stateText || ''

const columns = computed(() => [
  {
    title: $t('Announcement.column.title'),
    dataIndex: 'title',
    key: 'announcementTitle',
    width: 360,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.type'),
    dataIndex: 'type',
    key: 'type',
    width: 130,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.state'),
    dataIndex: 'state',
    key: 'state',
    width: 120,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.popup'),
    dataIndex: 'popup',
    key: 'popup',
    width: 110,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.createTime'),
    dataIndex: 'createTime',
    key: 'createTime',
    width: 170,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.publishTime'),
    dataIndex: 'deployTime',
    key: 'deployTime',
    width: 170,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.action'),
    key: 'action',
    fixed: 'right',
    align: 'right',
    className: 'announcement-action-column',
    width: 220,
    scopedSlots: true,
  },
])

function applyFilters(value: { keyword: string; state: 'all' | AnnouncementState }) {
  filters.value = value
  tableRef.value?.reload()
}
watch(locale, () => tableRef.value?.reload())
defineExpose({ reload: () => tableRef.value?.reload() })

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>

<style scoped lang="less">
.announcement-list-page {
  gap: var(--space-4);
  overflow: hidden;
}

.announcement-list-page__table-panel {
  overflow: hidden;
}

.announcement-list-page__table {
  min-height: 0;
  flex: 1;
}

.announcement-title-cell {
  min-width: 0;
}

:deep(.announcement-title-cell__title) {
  width: fit-content;
  max-width: 100%;
  color: var(--text-color);
  font-size: var(--fs-20);
  font-weight: 700;
  line-height: var(--lh-snug);
}

:deep(.announcement-title-cell__summary) {
  margin-top: var(--space-1);
  color: var(--text-color-secondary);
  font-weight: 400;
}

:deep(.ant-badge-status-text) {
  white-space: nowrap;
}

.announcement-action {
  padding: 0;
}

.announcement-action-cell {
  display: flex;
  width: 100%;
  justify-content: flex-end;
}

:deep(.announcement-action-column) {
  text-align: right;
}
</style>
