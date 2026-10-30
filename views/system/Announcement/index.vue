<template>
  <j-page-container>
    <ManagementView
      ref="managementViewRef"
      @create="openCreate"
      @edit="openEdit"
      @inspect="openDetail"
      @publish="publishAnnouncement"
      @withdraw="withdrawAnnouncement"
      @remove="removeAnnouncement"
    />
  </j-page-container>

  <AnnouncementEditorDialog
    v-model:open="editorOpen"
    :record="editingRecord"
    :loading="saving"
    @save="saveAnnouncement"
  />

  <a-modal
    v-model:open="detailOpen"
    :width="1000"
    :title="detailTitle"
    :footer="null"
  >
    <a-spin :spinning="detailLoading">
      <AnnouncementDetail
        v-if="detailRecord"
        v-model:locale="detailLocale"
        :record="detailRecord"
      />
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import AnnouncementDetail from './components/AnnouncementDetail.vue'
import AnnouncementEditorDialog from './components/AnnouncementEditorDialog.vue'
import ManagementView from './components/ManagementView.vue'
import { resolveAnnouncementText } from './announcementI18n'
import {
  deleteAnnouncement,
  getAnnouncement,
  publishAnnouncement as publishAnnouncementApi,
  saveAnnouncement as saveAnnouncementApi,
  withdrawAnnouncement as withdrawAnnouncementApi,
} from './api'
import type { AnnouncementDraft, AnnouncementRecord } from './types'

defineOptions({ name: 'AnnouncementManagement' })

const { t: $t, locale } = useI18n()
const managementViewRef = ref<{ reload: () => void }>()
const editorOpen = ref(false)
const editingRecord = ref<AnnouncementRecord>()
const saving = ref(false)
const detailOpen = ref(false)
const detailRecord = ref<AnnouncementRecord>()
const detailLoading = ref(false)
const detailLocale = ref('zh')

const detailTitle = computed(() => {
  const record = detailRecord.value
  return (record && resolveAnnouncementText(record, 'title', detailLocale.value))
    || $t('Announcement.action.view')
})

function currentViewLocale() {
  return String(locale.value || 'zh').replace('_', '-').split('-')[0] === 'en' ? 'en' : 'zh'
}

function openCreate() {
  editingRecord.value = undefined
  editorOpen.value = true
}

function openEdit(record: AnnouncementRecord) {
  editingRecord.value = record
  editorOpen.value = true
}

/** 详情重新读取后端，确保展示发布/撤回后的最新正文。 */
async function openDetail(record: AnnouncementRecord) {
  detailRecord.value = record
  detailLocale.value = currentViewLocale()
  detailOpen.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await getAnnouncement(record.id)
  } finally {
    detailLoading.value = false
  }
}

async function saveAnnouncement(draft: AnnouncementDraft) {
  const editing = Boolean(draft.id)
  saving.value = true
  try {
    const savedId = await saveAnnouncementApi(draft)
    if (draft.publish) {
      if (!savedId) throw new Error('System bulletin ID is missing after save')
      // 内容保存和发布是两个事务；只有保存成功并取得 ID 后才进入全服发布。
      await publishAnnouncementApi(savedId, draft.deliveryScope)
    }
    editorOpen.value = false
    managementViewRef.value?.reload()
    const messageKey = draft.publish
      ? 'Announcement.message.published'
      : editing
        ? 'Announcement.message.updated'
        : 'Announcement.message.created'
    onlyMessage($t(messageKey))
  } finally {
    saving.value = false
  }
}

async function publishAnnouncement(record: AnnouncementRecord) {
  await publishAnnouncementApi(record.id, record.deliveryScope)
  managementViewRef.value?.reload()
  onlyMessage($t('Announcement.message.published'))
}

async function withdrawAnnouncement(record: AnnouncementRecord) {
  await withdrawAnnouncementApi(record.id, record.deliveryScope)
  managementViewRef.value?.reload()
  onlyMessage($t('Announcement.message.withdrawn'))
}

async function removeAnnouncement(record: AnnouncementRecord) {
  await deleteAnnouncement(record.id)
  managementViewRef.value?.reload()
  onlyMessage($t('Announcement.message.deleted'))
}
</script>
