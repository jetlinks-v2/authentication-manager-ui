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
    :publish-mode="publishMode"
    :type-options="typeOptions"
    :type-loading="typeLoading"
    :user-options="userOptions"
    :user-loading="userLoading"
    @search-users="handleUserSearch"
    @selected-users-change="handleSelectedUsersChange"
    @save="saveAnnouncement"
  />

  <a-modal
    v-model:open="detailOpen"
    :width="1000"
    :title="$t('Announcement.action.view')"
    :footer="null"
  >
    <a-spin :spinning="detailLoading">
      <AnnouncementDetail v-if="detailRecord" :record="detailRecord" />
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getUserList_api } from '@authentication-manager-ui/api/system/user'
import AnnouncementDetail from './components/AnnouncementDetail.vue'
import AnnouncementEditorDialog from './components/AnnouncementEditorDialog.vue'
import ManagementView from './components/ManagementView.vue'
import {
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementTypes,
  saveAnnouncement as saveAnnouncementApi,
  withdrawAnnouncement as withdrawAnnouncementApi,
} from './api'
import type {
  AnnouncementDraft,
  AnnouncementRecord,
  AnnouncementType,
  AnnouncementUserOption,
} from './types'

interface PlatformUser {
  id: string
  name?: string
  username?: string
}

interface UserQueryResponse {
  success?: boolean
  result?: PlatformUser[] | { data?: PlatformUser[] }
}

defineOptions({ name: 'AnnouncementManagement' })

const { t: $t } = useI18n()
const managementViewRef = ref<{ reload: () => void }>()
const editorOpen = ref(false)
const editingRecord = ref<AnnouncementRecord>()
const saving = ref(false)
const publishMode = ref(false)
const detailOpen = ref(false)
const detailRecord = ref<AnnouncementRecord>()
const detailLoading = ref(false)
const userOptions = ref<AnnouncementUserOption[]>([])
const typeOptions = ref<AnnouncementType[]>([])
const typeLoading = ref(false)
const selectedUserIds = ref<string[]>([])
const userLoading = ref(false)
let userSearchTimer: ReturnType<typeof setTimeout> | undefined
let userRequestSequence = 0

/** 将平台用户转换为公告选择器选项，提交值始终只保留用户 ID。 */
function toUserOption(user: PlatformUser): AnnouncementUserOption {
  const primaryName = user.name || user.username || user.id
  const username = user.username && user.username !== primaryName
    ? `（${user.username}）`
    : ''
  return {
    label: `${primaryName}${username}`,
    value: user.id,
  }
}

/** 兼容平台分页与不分页查询结果，并丢弃缺少 ID 的异常记录。 */
function extractUsers(response: UserQueryResponse): PlatformUser[] {
  if (!response.success) return []
  const result = response.result
  const users = Array.isArray(result) ? result : result?.data
  return (users || []).filter((user) => Boolean(user.id))
}

/** 仅保留已选用户与本次搜索结果，兼顾标签回显和搜索结果准确性。 */
function replaceUserOptions(options: AnnouncementUserOption[]) {
  const previousOptionMap = new Map(userOptions.value.map((option) => [option.value, option]))
  const optionMap = new Map(options.map((option) => [option.value, option]))
  selectedUserIds.value.forEach((userId) => {
    const selectedOption = previousOptionMap.get(userId)
    if (selectedOption) optionMap.set(userId, selectedOption)
  })
  userOptions.value = [...optionMap.values()]
}

/** 从平台用户接口加载候选项；编辑时额外补齐已选用户用于名称回显。 */
async function loadUserOptions(keyword = '', selectedUserIds: string[] = []) {
  const requestSequence = ++userRequestSequence
  userLoading.value = true
  const normalizedKeyword = keyword.trim()
  const requests = [
    getUserList_api({
      paging: true,
      pageIndex: 0,
      pageSize: 50,
      includes: ['id', 'name', 'username'],
      filter: normalizedKeyword
        ? {
            name$like: `%${normalizedKeyword}%`,
            $or$username$like: `%${normalizedKeyword}%`,
          }
        : undefined,
    }),
  ]
  if (selectedUserIds.length) {
    requests.push(getUserList_api({
      paging: true,
      pageIndex: 0,
      pageSize: selectedUserIds.length,
      includes: ['id', 'name', 'username'],
      terms: [{ column: 'id', termType: 'in', value: selectedUserIds }],
    }))
  }

  try {
    const responses = await Promise.all(requests) as UserQueryResponse[]
    if (requestSequence !== userRequestSequence) return
    replaceUserOptions(responses.flatMap(extractUsers).map(toUserOption))
  } catch {
    if (requestSequence === userRequestSequence) {
      replaceUserOptions([])
    }
  } finally {
    if (requestSequence === userRequestSequence) {
      userLoading.value = false
    }
  }
}

/** 打开编辑器时重置候选项，并从真实用户数据加载首批及已选用户。 */
function initializeUserOptions(initialUserIds: string[] = []) {
  if (userSearchTimer) clearTimeout(userSearchTimer)
  userSearchTimer = undefined
  userOptions.value = []
  selectedUserIds.value = [...initialUserIds]
  void loadUserOptions('', initialUserIds)
}

/** 用户输入停止 300ms 后再查询，减少高频搜索请求。 */
function handleUserSearch(keyword: string) {
  if (userSearchTimer) clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(() => {
    userSearchTimer = undefined
    void loadUserOptions(keyword, selectedUserIds.value)
  }, 300)
}

/** 同步弹窗内当前选中用户，供后续搜索保留名称标签。 */
function handleSelectedUsersChange(userIds: string[]) {
  selectedUserIds.value = [...userIds]
}

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
  publishMode.value = false
  initializeUserOptions()
  editorOpen.value = true
}

async function openEdit(record: AnnouncementRecord) {
  await ensureTypeOptions()
  editingRecord.value = record
  publishMode.value = false
  initializeUserOptions(record.userIds)
  editorOpen.value = true
}

/** 打开详情时重新读取后端，避免展示列表中的旧数据。 */
async function openDetail(record: AnnouncementRecord) {
  detailRecord.value = record
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

/** 发布前读取完整公告并进入范围配置，避免列表摘要覆盖原正文。 */
async function publishAnnouncement(record: AnnouncementRecord) {
  await ensureTypeOptions()
  editingRecord.value = await getAnnouncement(record.id)
  publishMode.value = true
  initializeUserOptions(editingRecord.value.userIds)
  editorOpen.value = true
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

onBeforeUnmount(() => {
  if (userSearchTimer) clearTimeout(userSearchTimer)
  userRequestSequence += 1
})
</script>
