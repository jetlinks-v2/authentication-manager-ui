<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import globalI18n from '@jetlinks-web-core/locales'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { useRouterParams } from '@jetlinks-web/hooks'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  changeAnnouncementReadState,
  markAllAnnouncementsRead,
  queryAnnouncementInbox,
  SYSTEM_BULLETIN_PROVIDER,
} from '../api'
import NotificationDetail from './NotificationDetail.vue'

const columns = [
  {
    title: globalI18n.global.t('Announcement.inbox.message'),
    dataIndex: 'title',
    key: 'announcementTitle',
    ellipsis: true,
    scopedSlots: true,
    width: '22%',
  },
  {
    title: globalI18n.global.t('Announcement.inbox.summary'),
    dataIndex: 'summary',
    key: 'announcementSummary',
    scopedSlots: true,
  },
  {
    title: globalI18n.global.t('Announcement.inbox.publishTime'),
    dataIndex: 'notifyTime',
    key: 'notifyTime',
    scopedSlots: true,
    width: '12rem',
  },
  {
    title: globalI18n.global.t('Announcement.inbox.state'),
    dataIndex: 'state',
    key: 'state',
    scopedSlots: true,
    width: '7rem',
  },
  {
    title: globalI18n.global.t('Announcement.inbox.action'),
    dataIndex: 'action',
    key: 'action',
    scopedSlots: true,
    width: '7rem',
  },
]

const tableRef = ref()
const detailVisible = ref(false)
const detailRecord = ref<Record<string, any>>({})
const user = useUserStore()
const routerParams = useRouterParams()

/** 兼容通知列表返回对象或 JSON 字符串两种详情结构。 */
const parseDetail = (record: Record<string, any>) => {
  if (record.detail && typeof record.detail === 'object') return record.detail
  if (typeof record.detailJson !== 'string') return undefined
  try {
    const detail = JSON.parse(record.detailJson)
    return detail && typeof detail === 'object' ? detail : undefined
  } catch {
    return undefined
  }
}

/** 公告标题优先使用发布快照，旧通知缺少快照时再回退通用通知字段。 */
const getNotificationTitle = (record: Record<string, any>) => {
  const detail = parseDetail(record)
  return String(detail?.title || record.title || record.topicName || record.message || '').trim()
}

/** 公告摘要只显示独立内容，避免旧数据把标题重复渲染为摘要。 */
const getNotificationSummary = (record: Record<string, any>) => {
  const detail = parseDetail(record)
  const title = getNotificationTitle(record)
  const summary = String(detail?.summary || record.summary || record.message || '').trim()
  return summary && summary !== title ? summary : ''
}

const incomingNotification = computed(() => {
  const message = user.messageInfo?.topicProvider === SYSTEM_BULLETIN_PROVIDER
    ? user.messageInfo
    : routerParams.params.value?.row
  return message?.topicProvider === SYSTEM_BULLETIN_PROVIDER ? message : undefined
})

const reload = () => tableRef.value?.reload?.()

const markRead = async (record: Record<string, any>) => {
  const response = await changeAnnouncementReadState('_read', [record.id])
  if (response.status === 200) {
    onlyMessage(globalI18n.global.t('Service.index.success'))
    reload()
    user.updateAlarm()
  }
}

const readPage = async () => {
  const ids = (tableRef.value?.dataSource || [])
    .filter((item: any) => item.state?.value === 'unread')
    .map((item: any) => item.id)
  if (!ids.length) return

  const response = await changeAnnouncementReadState('_read', ids)
  if (response.status === 200) {
    onlyMessage(globalI18n.global.t('Service.index.success'))
    reload()
    user.updateAlarm()
  }
}

const readAll = async () => {
  const response = await markAllAnnouncementsRead()
  if (response.status === 200) {
    onlyMessage(globalI18n.global.t('Service.index.success'))
    reload()
    user.updateAlarm()
  }
}

const view = async (record: Record<string, any>) => {
  detailRecord.value = record
  detailVisible.value = true
  if (record.state?.value === 'unread') {
    await changeAnnouncementReadState('_read', [record.id])
    reload()
    user.updateAlarm()
  }
}

watch(() => incomingNotification.value?.id, () => {
  if (incomingNotification.value) view(incomingNotification.value)
}, { immediate: true })

onUnmounted(() => {
  if (user.messageInfo?.topicProvider === SYSTEM_BULLETIN_PROVIDER) {
    user.messageInfo = {}
  }
  if (routerParams.params.value?.row?.topicProvider === SYSTEM_BULLETIN_PROVIDER) {
    routerParams.clear?.()
  }
})
</script>

<template>
  <div class="announcement-inbox">
    <div class="announcement-inbox__toolbar">
      <a-button @click="readPage">
        {{ $t('Announcement.inbox.readPage') }}
      </a-button>
      <a-button @click="readAll">
        {{ $t('Announcement.inbox.readAll') }}
      </a-button>
    </div>

    <j-pro-table
      ref="tableRef"
      :columns="columns"
      :request="queryAnnouncementInbox"
      :default-params="{ sorts: [{ name: 'notifyTime', order: 'desc' }] }"
      :body-style="{ padding: 0 }"
      mode="TABLE"
      style="flex: 1; min-height: 0"
    >
      <template #announcementTitle="record">
        <j-ellipsis>{{ getNotificationTitle(record) || '--' }}</j-ellipsis>
      </template>
      <template #announcementSummary="record">
        <j-ellipsis
          :line-clamp="1"
          :tooltip="{ placement: 'topLeft' }"
          class="announcement-summary-cell"
        >
          {{ getNotificationSummary(record) || '--' }}
        </j-ellipsis>
      </template>
      <template #notifyTime="record">
        {{ record.notifyTime ? dayjs(record.notifyTime).format('YYYY-MM-DD HH:mm:ss') : '--' }}
      </template>
      <template #state="record">
        <j-badge-status
          :status="record.state?.value"
          :text="record.state?.text"
          :status-names="{ read: 'success', unread: 'error' }"
        />
      </template>
      <template #action="record">
        <a-space :size="16">
          <j-permission-button
            v-if="record.state?.value === 'unread'"
            type="link"
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.inbox.markRead') }"
            @click="markRead(record)"
          >
            <AIcon type="CheckCircleOutlined" />
          </j-permission-button>
          <j-permission-button
            type="link"
            style="padding: 0"
            :tooltip="{ title: $t('Announcement.inbox.view') }"
            @click="view(record)"
          >
            <AIcon type="EyeOutlined" />
          </j-permission-button>
        </a-space>
      </template>
    </j-pro-table>

    <a-modal
      v-model:open="detailVisible"
      :title="getNotificationTitle(detailRecord) || $t('Announcement.inbox.detailTitle')"
      :width="820"
      :footer="null"
      destroy-on-close
    >
      <NotificationDetail v-if="detailVisible" :data="detailRecord" />
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.announcement-inbox {
  display: flex;
  height: 100%;
  min-height: 25rem;
  flex-direction: column;
  gap: var(--space-4);

  &__toolbar {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
}

.announcement-summary-cell {
  width: 100%;
  min-width: 0;
  white-space: normal;
  color: var(--jet-theme-text-secondary);
}
</style>
