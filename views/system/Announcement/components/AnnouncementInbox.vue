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
    dataIndex: 'message',
    key: 'message',
    ellipsis: true,
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
    width: '8rem',
  },
]

const tableRef = ref()
const detailVisible = ref(false)
const detailRecord = ref<Record<string, any>>({})
const user = useUserStore()
const routerParams = useRouterParams()

const incomingNotification = computed(() => {
  const message = user.messageInfo?.topicProvider === SYSTEM_BULLETIN_PROVIDER
    ? user.messageInfo
    : routerParams.params.value?.row
  return message?.topicProvider === SYSTEM_BULLETIN_PROVIDER ? message : undefined
})

const reload = () => tableRef.value?.reload?.()

const changeState = async (record: Record<string, any>) => {
  const type = record.state?.value === 'read' ? '_unread' : '_read'
  const response = await changeAnnouncementReadState(type, [record.id])
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
            type="link"
            :tooltip="{
              title: record.state?.value === 'read'
                ? $t('Announcement.inbox.markUnread')
                : $t('Announcement.inbox.markRead'),
            }"
            @click="changeState(record)"
          >
            <AIcon type="icon-a-PIZHU1" />
          </j-permission-button>
          <j-permission-button
            type="link"
            :tooltip="{ title: $t('Announcement.inbox.view') }"
            @click="view(record)"
          >
            <AIcon type="SearchOutlined" />
          </j-permission-button>
        </a-space>
      </template>
    </j-pro-table>

    <a-modal
      v-model:open="detailVisible"
      :title="$t('Announcement.inbox.detailTitle')"
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
</style>
