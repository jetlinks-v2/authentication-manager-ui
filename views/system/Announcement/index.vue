<template>
  <j-page-container>
    
	    <ManagementView
		    ref="managementViewRef"
		    @create="openCreate"
		    @edit="openEdit"
		    @inspect="openDetail"
		    @publish="openPublish"
		    @withdraw="withdrawAnnouncement"
		    @remove="removeAnnouncement"
	    />
    
  </j-page-container>

  <AnnouncementEditorDialog
    v-model:open="editorOpen"
    :record="editingRecord"
    :loading="saving"
    :type-options="typeOptions"
    :type-loading="typeLoading"
    @save="saveAnnouncement"
  />

  <AnnouncementPublishDialog
    v-model:open="publishOpen"
    :record="publishingRecord"
    :loading="publishing"
    :user-options="userOptions"
    :user-loading="userLoading"
    @search-users="handleUserSearch"
    @selected-users-change="handleSelectedUsersChange"
    @publish="publishAnnouncement"
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
import { useAnnouncementAudience } from './useAnnouncementAudience'
import AnnouncementDetail from './components/AnnouncementDetail.vue'
import AnnouncementEditorDialog from './components/AnnouncementEditorDialog.vue'
import AnnouncementPublishDialog from './components/AnnouncementPublishDialog.vue'
import ManagementView from './components/ManagementView.vue'
import { resolveAnnouncementText } from './announcementI18n'
import {
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementTypes,
  publishAnnouncement as publishAnnouncementApi,
  saveAnnouncement as saveAnnouncementApi,
  withdrawAnnouncement as withdrawAnnouncementApi,
} from './api'
import type {
  AnnouncementDraft,
  AnnouncementRecord,
  AnnouncementType,
  AnnouncementAudience,
} from './types'

defineOptions({ name: 'AnnouncementManagement' })

const { t: $t, locale } = useI18n()
const managementViewRef = ref<{ reload: () => void }>()
const editorOpen = ref(false)
const editingRecord = ref<AnnouncementRecord>()
const saving = ref(false)
const publishOpen = ref(false)
const publishingRecord = ref<AnnouncementRecord>()
const publishing = ref(false)
const detailOpen = ref(false)
const detailRecord = ref<AnnouncementRecord>()
const detailLoading = ref(false)
const detailLocale = ref('zh')
const typeOptions = ref<AnnouncementType[]>([])
const typeLoading = ref(false)
const { userOptions, userLoading, initializeUserOptions, handleUserSearch, handleSelectedUsersChange } = useAnnouncementAudience()

/** 详情查看语言默认跟随界面语言，仅支持中英。 */
function currentViewLocale() {
  return String(locale.value || 'zh').replace('_', '-').split('-')[0] === 'en' ? 'en' : 'zh'
}

const detailTitle = computed(() => {
  const record = detailRecord.value
  return (record && resolveAnnouncementText(record, 'title', detailLocale.value))
    || $t('Announcement.action.view')
})

/** 首次打开编辑器时加载公告类型，后续打开复用同一字典结果。 */
async function ensureTypeOptions() {
  if (typeOptions.value.length) return
  typeLoading.value = true
  try {
    typeOptions.value = await getAnnouncementTypes()
  } finally {
    typeLoading.value = false
  }
}

async function openCreate() {
  await ensureTypeOptions()
  editingRecord.value = undefined
  editorOpen.value = true
}

async function openEdit(record: AnnouncementRecord) {
  await ensureTypeOptions()
  editingRecord.value = record
  editorOpen.value = true
}

/** 打开详情时重新读取后端，避免展示列表中的旧数据。 */
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

/** 保存成功后关闭编辑器并刷新服务端分页列表。 */
async function saveAnnouncement(draft: AnnouncementDraft) {
  const editing = Boolean(draft.id)
  saving.value = true
  try {
    await saveAnnouncementApi(draft)
    editorOpen.value = false
    managementViewRef.value?.reload()
    const messageKey = editing ? 'Announcement.message.updated' : 'Announcement.message.created'
    onlyMessage($t(messageKey))
  } finally {
    saving.value = false
  }
}

/** 每次发布重新选择范围，撤回重发不自动继承旧投递关系。 */
function openPublish(record: AnnouncementRecord) {
  publishingRecord.value = record
  initializeUserOptions()
  publishOpen.value = true
}

/** 发布失败保持弹窗及选择，成功后才刷新状态并关闭。 */
async function publishAnnouncement(audience: AnnouncementAudience) {
  if (publishing.value || !publishingRecord.value) return
  publishing.value = true
  try {
    await publishAnnouncementApi(publishingRecord.value.id, audience)
    publishOpen.value = false
    managementViewRef.value?.reload()
    onlyMessage($t('Announcement.message.published'))
  } finally {
    publishing.value = false
  }
}

/** 撤回后刷新列表以同步未发布状态。 */
async function withdrawAnnouncement(record: AnnouncementRecord) {
  await withdrawAnnouncementApi(record.id)
  managementViewRef.value?.reload()
  onlyMessage($t('Announcement.message.withdrawn'))
}

/** 删除后刷新分页列表。 */
async function removeAnnouncement(record: AnnouncementRecord) {
  await deleteAnnouncement(record.id)
  managementViewRef.value?.reload()
  onlyMessage($t('Announcement.message.deleted'))
}

</script>
