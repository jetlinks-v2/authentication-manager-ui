<template>
  <SectionCard
    icon="TeamOutlined"
    :title="$t('ProjectApplication.user.title')"
    :sub="$t('ProjectApplication.user.subtitle', { count: data.users.length })"
  >
    <template #actions>
      <a-button type="primary" @click="openAdd">
        <template #icon><AIcon type="UserAddOutlined" /></template>
        {{ $t('ProjectApplication.user.add') }}
      </a-button>
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
            :value="record.roleId"
            class="role-select"
            :options="roleOptions"
            @change="emits('update', record, { roleId: $event })"
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
      <a-button type="primary" @click="openAdd">{{ $t('ProjectApplication.user.add') }}</a-button>
    </CloudEmpty>

    <a-modal
      :open="addOpen"
      :title="$t('ProjectApplication.user.add')"
      :ok-text="$t('ProjectApplication.user.add')"
      :cancel-text="$t('ProjectApplication.common.cancel')"
      @ok="confirmAdd"
      @cancel="addOpen = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item :label="$t('ProjectApplication.user.name')" name="name">
          <a-input v-model:value="form.name" :maxlength="32" :placeholder="$t('ProjectApplication.user.namePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.user.username')" name="username">
          <a-input v-model:value="form.username" :maxlength="32" :placeholder="$t('ProjectApplication.user.usernamePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.user.phone')" name="phone">
          <a-input v-model:value="form.phone" :maxlength="20" :placeholder="$t('ProjectApplication.user.phonePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.user.email')" name="email">
          <a-input v-model:value="form.email" :placeholder="$t('ProjectApplication.user.emailPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.user.password')" name="password">
          <a-input-password v-model:value="form.password" :maxlength="64" :placeholder="$t('ProjectApplication.user.passwordPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.user.confirmPassword')" name="confirmPassword">
          <a-input-password v-model:value="form.confirmPassword" :maxlength="64" :placeholder="$t('ProjectApplication.user.confirmPasswordPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.user.role')" name="roleId">
          <a-select v-model:value="form.roleId" :options="roleOptions" />
        </a-form-item>
      </a-form>
    </a-modal>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationUserManagement">
import type { PropType } from 'vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Rule } from 'ant-design-vue/es/form'
import { passwordRegEx } from '@jetlinks-web-core/utils/validate'
import { validateField_api as validateUserField } from '@authentication-manager-ui/api/system/user'
import type { ApplicationRole, ApplicationUser, ApplicationUserDraft } from '../../types'

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

const emits = defineEmits(['add', 'update', 'remove'])
const { t: $t } = useI18n()
const keyword = ref('')
const addOpen = ref(false)
const formRef = ref()
const form = reactive<ApplicationUserDraft>({
  name: '',
  username: '',
  phone: '',
  email: '',
  roleId: '',
  password: '',
  confirmPassword: '',
})

const columns = computed(() => [
  { title: $t('ProjectApplication.user.user'), key: 'user', width: '10rem' },
  { title: $t('ProjectApplication.user.account'), dataIndex: 'username', key: 'username' },
  { title: $t('ProjectApplication.user.phone'), dataIndex: 'phone', key: 'phone' },
  { title: $t('ProjectApplication.user.role'), key: 'role', width: '10rem' },
  { title: $t('ProjectApplication.user.status'), key: 'status', width: '7rem' },
  { title: $t('ProjectApplication.common.actions'), key: 'actions', width: '10rem', fixed: 'right' as const },
])

const roleOptions = computed(() => props.data.roles.map((role) => ({ label: role.name, value: role.id })))
const filteredUsers = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase()
  return props.data.users.filter((user) => !searchText || `${user.name} ${user.username} ${user.phone}`.toLocaleLowerCase().includes(searchText))
})

const resultOf = <T,>(response: any): T => response && Object.prototype.hasOwnProperty.call(response, 'result')
  ? response.result as T
  : response as T

const validateUsername = async (_rule: Rule, value: string) => {
  if (!value) return Promise.reject($t('ProjectApplication.user.usernamePlaceholder'))
  const result = resultOf<{ passed: boolean; reason?: string }>(await validateUserField('username', value))
  return result?.passed ? Promise.resolve() : Promise.reject(result?.reason || $t('ProjectApplication.user.usernameInvalid'))
}

const validatePassword = async (_rule: Rule, value: string) => {
  if (!value) return Promise.reject($t('ProjectApplication.user.passwordPlaceholder'))
  if (value.length < 8) return Promise.reject($t('ProjectApplication.user.passwordLength'))
  if (!passwordRegEx(value)) return Promise.reject($t('ProjectApplication.user.passwordFormat'))
  const result = resultOf<{ passed: boolean; reason?: string }>(await validateUserField('password', value))
  return result?.passed ? Promise.resolve() : Promise.reject(result?.reason || $t('ProjectApplication.user.passwordFormat'))
}

const validateConfirmPassword = (_rule: Rule, value: string) => value === form.password
  ? Promise.resolve()
  : Promise.reject($t('ProjectApplication.user.passwordMismatch'))

const rules = computed<Record<string, Rule[]>>(() => ({
  name: [{ required: true, message: $t('ProjectApplication.user.namePlaceholder') }],
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  email: [{ type: 'email' as const, message: $t('ProjectApplication.user.emailPlaceholder') }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
  roleId: [{ required: true, message: $t('ProjectApplication.user.role') }],
}))

const resetForm = () => Object.assign(form, {
  name: '',
  username: '',
  phone: '',
  email: '',
  roleId: props.data.roles[0]?.id || '',
  password: '',
  confirmPassword: '',
})
const openAdd = () => { resetForm(); addOpen.value = true }

const confirmAdd = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emits('add', { ...form })
  addOpen.value = false
}
</script>

<style scoped>
.user-search { width: min(100%, 22rem); margin-bottom: var(--space-3); }
.role-select { width: 100%; }
</style>
