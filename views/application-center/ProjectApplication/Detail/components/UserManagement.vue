<template>
  <SectionCard
    icon="TeamOutlined"
    :title="$t('ProjectApplication.user.title')"
    :sub="$t('ProjectApplication.user.subtitle', { count: data.users.length })"
  >
    <template #actions>
      <a-space>
        <a-button @click="openBind">
          <template #icon><AIcon type="LinkOutlined" /></template>
          {{ $t('ProjectApplication.user.bind') }}
        </a-button>
        <a-button type="primary" @click="createOpen = true">
          <template #icon><AIcon type="UserAddOutlined" /></template>
          {{ $t('ProjectApplication.user.add') }}
        </a-button>
      </a-space>
    </template>

    <a-input v-model:value="keyword" allow-clear class="user-search" :placeholder="$t('ProjectApplication.user.searchPlaceholder')">
      <template #prefix><AIcon type="SearchOutlined" /></template>
    </a-input>

    <a-table
      v-if="filteredUsers.length"
      row-key="id"
      size="middle"
      :columns="columns"
      :data-source="filteredUsers"
      :pagination="false"
      :scroll="{ x: 760 }"
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
            @change="emits('update', record, { roleId: $event || '' })"
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
              @confirm="emits('update', record, { enabled: !record.enabled })"
            >
              <a-button type="link" size="small">
                {{ $t(record.enabled ? 'ProjectApplication.common.disable' : 'ProjectApplication.common.enable') }}
              </a-button>
            </a-popconfirm>
            <a-popconfirm :title="$t('ProjectApplication.user.removeConfirm', { name: record.name })" @confirm="emits('remove', record)">
              <a-button type="link" danger size="small">{{ $t('ProjectApplication.user.delete') }}</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    <CloudEmpty v-else :description="$t('ProjectApplication.user.empty')">
      <a-space>
        <a-button @click="openBind">{{ $t('ProjectApplication.user.bind') }}</a-button>
        <a-button type="primary" @click="createOpen = true">{{ $t('ProjectApplication.user.add') }}</a-button>
      </a-space>
    </CloudEmpty>

    <UserCreateModal
      v-model:open="createOpen"
      :roles="data.roles"
      @confirm="emits('add', $event)"
    />

    <UserBindModal
      v-model:open="bindOpen"
      :application-id="applicationId"
      :load-users="loadUsers"
      @confirm="emits('bind', $event)"
    />
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationUserManagement">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UserBindModal from './UserBindModal.vue'
import UserCreateModal from './UserCreateModal.vue'
import type { ApplicationRole, ApplicationUser, ApplicationUserDraft, UserPickerPage, UserPickerQuery } from '../../types'

interface UserManagementData {
  users: ApplicationUser[]
  roles: ApplicationRole[]
}

const props = defineProps({
  data: {
    type: Object as PropType<UserManagementData>,
    required: true,
  },
  applicationId: {
    type: String,
    required: true,
  },
  loadUsers: {
    type: Function as PropType<(applicationId: string, query: UserPickerQuery) => Promise<UserPickerPage>>,
    required: true,
  },
})

const emits = defineEmits<{
  (e: 'add', draft: ApplicationUserDraft): void
  (e: 'bind', ids: string[]): void
  (e: 'update', user: ApplicationUser, patch: Partial<ApplicationUser>): void
  (e: 'remove', user: ApplicationUser): void
}>()
const { t: $t } = useI18n()
const keyword = ref('')
const createOpen = ref(false)
const bindOpen = ref(false)

const columns = computed(() => [
  { title: $t('ProjectApplication.user.user'), key: 'user', width: '10rem' },
  { title: $t('ProjectApplication.user.account'), dataIndex: 'username', key: 'username' },
  { title: $t('ProjectApplication.user.phone'), dataIndex: 'phone', key: 'phone' },
  { title: $t('ProjectApplication.user.role'), key: 'role', width: '10rem' },
  { title: $t('ProjectApplication.user.status'), key: 'status', width: '7rem' },
  { title: $t('ProjectApplication.common.actions'), key: 'actions', width: '10rem', fixed: 'right' as const },
])

const roleOptions = computed(() => props.data.roles.map(role => ({ label: role.name, value: role.id })))
const filteredUsers = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase()
  return props.data.users.filter(user => !searchText || `${user.name} ${user.username} ${user.phone}`.toLocaleLowerCase().includes(searchText))
})

const openBind = () => { bindOpen.value = true }
</script>

<style scoped>
.user-search { width: min(100%, 22rem); margin-bottom: var(--space-3); }
.role-select { width: 100%; }
</style>
