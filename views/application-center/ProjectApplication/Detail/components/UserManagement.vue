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

    <a-modal
      :open="bindOpen"
      :title="$t('ProjectApplication.user.bindTitle')"
      :ok-text="$t('ProjectApplication.user.bindCount', { count: selectedIds.length })"
      :cancel-text="$t('ProjectApplication.common.cancel')"
      :ok-button-props="{ disabled: !selectedIds.length }"
      @ok="confirmBind"
      @cancel="bindOpen = false"
    >
      <a-input
        v-model:value="candidateKeyword"
        allow-clear
        class="candidate-search"
        :placeholder="$t('ProjectApplication.user.candidateSearchPlaceholder')"
      >
        <template #prefix><AIcon type="SearchOutlined" /></template>
      </a-input>

      <div class="candidate-list">
        <label
          v-for="item in filteredCandidates"
          :key="item.id"
          class="candidate-item"
          :class="{ disabled: !item.enabled }"
        >
          <a-checkbox :checked="selectedIds.includes(item.id)" :disabled="!item.enabled" @change="toggleCandidate(item.id, $event)" />
          <a-avatar>{{ item.name.slice(0, 1) }}</a-avatar>
          <span class="candidate-copy">
            <strong>{{ item.name }}</strong>
            <small>{{ [item.username, memberTypeText(item)].filter(Boolean).join(' · ') || '--' }}</small>
          </span>
          <MetaChip :tone="item.enabled ? 'ok' : 'default'">
            {{ $t(item.enabled ? 'ProjectApplication.user.normal' : 'ProjectApplication.user.disabled') }}
          </MetaChip>
        </label>
        <CloudEmpty v-if="!filteredCandidates.length" :description="$t('ProjectApplication.user.bindEmpty')" />
      </div>
    </a-modal>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationUserManagement">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UserCreateModal from './UserCreateModal.vue'
import type { ApplicationRole, ApplicationUser, ApplicationUserCandidate, ApplicationUserDraft } from '../../types'

interface CheckboxEvent { target: { checked: boolean } }

interface UserManagementData {
  users: ApplicationUser[]
  roles: ApplicationRole[]
  candidates: ApplicationUserCandidate[]
}

const props = defineProps({
  data: {
    type: Object as PropType<UserManagementData>,
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
const candidateKeyword = ref('')
const createOpen = ref(false)
const bindOpen = ref(false)
const selectedIds = ref<string[]>([])
const knownMemberTypes = new Set(['manager', 'member', 'customer'])

const columns = computed(() => [
  { title: $t('ProjectApplication.user.user'), key: 'user', width: '10rem' },
  { title: $t('ProjectApplication.user.account'), dataIndex: 'username', key: 'username' },
  { title: $t('ProjectApplication.user.phone'), dataIndex: 'phone', key: 'phone' },
  { title: $t('ProjectApplication.user.role'), key: 'role', width: '10rem' },
  { title: $t('ProjectApplication.user.status'), key: 'status', width: '7rem' },
  { title: $t('ProjectApplication.common.actions'), key: 'actions', width: '10rem', fixed: 'right' as const },
])

const roleOptions = computed(() => props.data.roles.map(role => ({ label: role.name, value: role.id })))
const boundIds = computed(() => new Set(props.data.users.map(user => user.id)))
const memberTypeText = (item: ApplicationUserCandidate) =>
  knownMemberTypes.has(item.type) ? $t(`ProjectApplication.user.memberType.${item.type}`) : item.typeText
const filteredUsers = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase()
  return props.data.users.filter(user => !searchText || `${user.name} ${user.username} ${user.phone}`.toLocaleLowerCase().includes(searchText))
})
const selectableCandidates = computed(() => props.data.candidates.filter(item => item.id && !boundIds.value.has(item.id)))
const filteredCandidates = computed(() => {
  const searchText = candidateKeyword.value.trim().toLocaleLowerCase()
  return selectableCandidates.value.filter(item =>
    !searchText || `${item.name} ${item.username} ${item.phone} ${item.typeText} ${memberTypeText(item)}`.toLocaleLowerCase().includes(searchText))
})

const openBind = () => {
  selectedIds.value = []
  candidateKeyword.value = ''
  bindOpen.value = true
}

const toggleCandidate = (id: string, event: CheckboxEvent) => {
  selectedIds.value = event.target.checked
    ? [...new Set([...selectedIds.value, id])]
    : selectedIds.value.filter(item => item !== id)
}

const confirmBind = () => {
  if (!selectedIds.value.length) return
  emits('bind', [...selectedIds.value])
  bindOpen.value = false
}
</script>

<style scoped>
.user-search { width: min(100%, 22rem); margin-bottom: var(--space-3); }
.role-select { width: 100%; }
.candidate-search { margin-bottom: var(--space-3); }
.candidate-list { display: flex; max-height: 26rem; flex-direction: column; gap: var(--space-2); overflow-y: auto; }
.candidate-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--r-2); cursor: pointer; }
.candidate-item:hover { border-color: var(--accent); }
.candidate-item.disabled { cursor: not-allowed; opacity: 0.56; }
.candidate-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-1); }
.candidate-copy strong { color: var(--ink-1); }
.candidate-copy small { overflow: hidden; color: var(--ink-4); text-overflow: ellipsis; white-space: nowrap; }
</style>
