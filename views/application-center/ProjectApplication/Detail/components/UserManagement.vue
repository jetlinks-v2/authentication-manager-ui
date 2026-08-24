<template>
  <section class="user-management">
    <header class="user-heading">
        <a-input v-model:value="keyword" allow-clear class="user-search" :placeholder="$t('ProjectApplication.user.searchPlaceholder')">
            <template #prefix><AIcon type="SearchOutlined" /></template>
        </a-input>
      <a-button type="primary" @click="createOpen = true">
        <template #icon><AIcon type="UserAddOutlined" /></template>
        {{ $t('ProjectApplication.user.add') }}
      </a-button>
    </header>

    <a-table
      v-if="filteredUsers.length"
      row-key="id"
      size="middle"
      class="user-table"
      :columns="columns"
      :data-source="filteredUsers"
      :pagination="false"
      :scroll="{ x: 1080 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'user'">
          <a-space><a-avatar>{{ record.name.slice(0, 1) }}</a-avatar><strong>{{ record.name }}</strong></a-space>
        </template>
        <template v-else-if="column.key === 'role'">
          <a-select
            allow-clear
            :value="record.roleId"
            class="role-select"
            :options="roleOptions"
            @change="updateRole(record, $event)"
          />
        </template>
        <template v-else-if="column.key === 'status'">
          <MetaChip :tone="record.enabled ? 'ok' : 'default'">
            {{ $t(record.enabled ? 'ProjectApplication.user.normal' : 'ProjectApplication.user.disabled') }}
          </MetaChip>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-popconfirm
              :title="$t('ProjectApplication.user.statusConfirm', { action: $t(record.enabled ? 'ProjectApplication.common.disable' : 'ProjectApplication.common.enable'), name: record.name })"
              @confirm="toggleUserStatus(record)"
            >
              <a-button type="link" size="small">
                {{ $t(record.enabled ? 'ProjectApplication.common.disable' : 'ProjectApplication.common.enable') }}
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    <CloudEmpty v-else :description="$t('ProjectApplication.user.empty')">
      <a-button type="primary" @click="createOpen = true">{{ $t('ProjectApplication.user.add') }}</a-button>
    </CloudEmpty>

    <UserCreateModal
      v-model:open="createOpen"
      :bound-user-ids="boundUserIds"
      @confirm="emits('add', $event)"
    />

  </section>
</template>

<script setup lang="ts" name="ProjectApplicationUserManagement">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UserCreateModal from './UserCreateModal.vue'
import type { ApplicationRole, ApplicationUser } from '../../types'

interface UserManagementData {
  users: ApplicationUser[]
  roles: ApplicationRole[]
}

const props = defineProps({
  data: {
    type: Object as PropType<UserManagementData>,
    required: true,
  },
})

const emits = defineEmits<{
  (e: 'add', userIds: string[]): void
  (e: 'update', user: ApplicationUser, patch: Partial<ApplicationUser>): void
}>()
const { t: $t } = useI18n()
const keyword = ref('')
const createOpen = ref(false)
const boundUserIds = computed(() => props.data.users.map(user => user.id))

const columns = computed(() => [
  { title: $t('ProjectApplication.user.user'), key: 'user', width: '11rem', fixed: 'left' as const },
  { title: $t('ProjectApplication.user.account'), dataIndex: 'username', key: 'username', width: '10rem' },
  { title: $t('ProjectApplication.user.role'), key: 'role', width: '11rem' },
  { title: $t('ProjectApplication.user.position'), dataIndex: 'position', key: 'position', width: '10rem', ellipsis: true },
  { title: $t('ProjectApplication.user.organization'), dataIndex: 'organization', key: 'organization', width: '11rem', ellipsis: true },
  { title: $t('ProjectApplication.user.status'), key: 'status', width: '7rem' },
  { title: $t('ProjectApplication.user.phone'), dataIndex: 'phone', key: 'phone', width: '9rem' },
  { title: $t('ProjectApplication.user.email'), dataIndex: 'email', key: 'email', width: '14rem', ellipsis: true },
  { title: $t('ProjectApplication.common.actions'), key: 'actions', width: '8rem', fixed: 'right' as const },
])

const roleOptions = computed(() => props.data.roles.map(role => ({ label: role.name, value: role.id })))
const resolveUser = (record: Record<string, unknown>) =>
  props.data.users.find(user => user.id === String(record.id || ''))
const updateRole = (record: Record<string, unknown>, roleId: unknown) => {
  const user = resolveUser(record)
  if (user) emits('update', user, { roleId: typeof roleId === 'string' ? roleId : '' })
}
const toggleUserStatus = (record: Record<string, unknown>) => {
  const user = resolveUser(record)
  if (user) emits('update', user, { enabled: !user.enabled })
}
const filteredUsers = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase()
  return props.data.users.filter(user => !searchText || `${user.name} ${user.username} ${user.phone} ${user.email} ${user.position} ${user.organization}`.toLocaleLowerCase().includes(searchText))
})
</script>

<style scoped>
.user-management { padding-top: var(--space-2); }
.user-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.user-heading h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-15); font-weight: 600; }
.user-search { width: min(100%, 17.5rem); margin-bottom: var(--space-3); }
.user-table { width: 100%; }
.user-table :deep(.ant-table-container) { border: 1px solid var(--line); border-radius: var(--r-3); overflow: hidden; }
.role-select { width: 100%; }
</style>
