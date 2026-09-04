<template>
  <FullPage>
    <j-pro-table
      ref="tableRef"
      class="pro-table__no-padding"
      :columns="columns"
      :request="queryAnnouncements"
      :params="queryParams"
      mode="TABLE"
      :default-params="{ sorts: [{ name: 'createTime', order: 'desc' }] }"
      :scroll="{ y: 'calc(100% - 3.75rem)' }"
    >
      <template #headerLeftRender>
        <a-flex gap="small">
          <ConditionFilter
            class="authentication-system-list-page__filter"
            :columns="columns"
            target="system-announcement"
            @change="handleFilterChange"
          />
          <j-permission-button
            class="authentication-system-list-page__primary-action"
            has-permission="system/Announcement:add"
            type="primary"
            @click="$emit('create')"
          >
            <AIcon type="PlusOutlined" />
            {{ $t('Announcement.action.create') }}
          </j-permission-button>
        </a-flex>
      </template>

      <template #title="record">
        <j-ellipsis>{{ record.title }}</j-ellipsis>
      </template>
      <template #state="record">
        <j-badge-status
          :status="record.state"
          :text="record.stateText || $t(`Announcement.status.${record.state}`)"
          :status-names="statusNames"
        />
      </template>
      <template #type="record">
        {{ record.type.text }}
      </template>
      <template #scope="record">
        {{ audienceText(record) }}
      </template>
      <template #deployTime="record">
        {{ record.deployTime || '--' }}
      </template>
      <template #action="record">
        <a-space :size="16">
          <j-permission-button
            has-permission="system/Announcement:view"
            type="link"
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.action.view') }"
            @click="$emit('inspect', record)"
          >
            <AIcon type="EyeOutlined" />
          </j-permission-button>
          <j-permission-button
            v-if="record.state === 'unpublished'"
            has-permission="system/Announcement:edit"
            type="link"
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.action.edit') }"
            @click="$emit('edit', record)"
          >
            <AIcon type="EditOutlined" />
          </j-permission-button>
          <j-permission-button
            v-if="record.state === 'unpublished'"
            has-permission="system/Announcement:publish"
            type="link"
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.action.publish') }"
            @click="$emit('publish', record)"
          >
            <AIcon type="PlayCircleOutlined" />
          </j-permission-button>
          <j-permission-button
            v-else
            has-permission="system/Announcement:withdraw"
            type="link"
            danger
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.action.withdraw') }"
            :pop-confirm="{
              title: $t('Announcement.confirm.withdraw'),
              onConfirm: () => $emit('withdraw', record),
            }"
          >
            <AIcon type="StopOutlined" />
          </j-permission-button>
          <j-permission-button
            v-if="record.state === 'unpublished'"
            has-permission="system/Announcement:delete"
            type="link"
            danger
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.action.delete') }"
            :pop-confirm="{
              title: $t('Announcement.confirm.delete'),
              onConfirm: () => $emit('remove', record),
            }"
          >
            <AIcon type="DeleteOutlined" />
          </j-permission-button>
        </a-space>
      </template>
    </j-pro-table>
  </FullPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FullPage } from '@jetlinks-web-core/layout'
import type {
  ConditionFilterChangePayload,
  ConditionFilterTerm,
} from '@jetlinks-web-core/components/ConditionFilter'
import { queryAnnouncements } from '../api'
import type { AnnouncementRecord } from '../types'

defineEmits<{
  (event: 'create'): void
  (event: 'edit', record: AnnouncementRecord): void
  (event: 'inspect', record: AnnouncementRecord): void
  (event: 'publish', record: AnnouncementRecord): void
  (event: 'withdraw', record: AnnouncementRecord): void
  (event: 'remove', record: AnnouncementRecord): void
}>()

const { t: $t } = useI18n()
const tableRef = ref<{ reload: () => void }>()
const queryParams = ref<{ terms: ConditionFilterTerm[] }>({ terms: [] })
const statusNames = { published: 'success', unpublished: 'default' }

const columns = computed(() => [
  {
    title: $t('Announcement.column.title'),
    dataIndex: 'title',
    key: 'title',
    width: 240,
    ellipsis: true,
    scopedSlots: true,
    search: { type: 'string' },
  },
  {
    title: $t('Announcement.column.type'),
    dataIndex: 'type',
    key: 'type',
    width: 110,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.state'),
    dataIndex: 'state',
    key: 'state',
    width: 100,
    scopedSlots: true,
    search: {
      type: 'select',
      options: ['published', 'unpublished'].map(value => ({
        value,
        label: $t(`Announcement.status.${value}`),
      })),
    },
  },
  {
    title: $t('Announcement.column.scope'),
    key: 'scope',
    width: 210,
    scopedSlots: true,
  },
  {
    title: $t('Announcement.column.publishTime'),
    dataIndex: 'deployTime',
    key: 'deployTime',
    width: 170,
    scopedSlots: true,
  },
  { title: $t('Announcement.column.creator'), dataIndex: 'creatorName', key: 'creatorName', width: 140 },
  { title: $t('Announcement.column.action'), key: 'action', fixed: 'right', width: 190, scopedSlots: true },
])

function audienceText(record: AnnouncementRecord) {
  const userCount = record.userIds?.length || 0
  const organizationCount = record.organizationIds?.length || 0
  if (!userCount && !organizationCount) return $t('Announcement.scope.platform')
  return $t('Announcement.scope.selected', { userCount, organizationCount })
}

/** 将通用筛选条件作为服务端查询参数提交。 */
function handleFilterChange(payload: ConditionFilterChangePayload) {
  queryParams.value = { terms: payload.filter.terms }
}

/** 供页面容器在写操作完成后刷新公告列表。 */
defineExpose({ reload: () => tableRef.value?.reload() })
</script>
