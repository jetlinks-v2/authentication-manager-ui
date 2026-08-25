<template>
  <a-modal
    :open="open"
    :title="$t('ProjectApplication.access.roleSelectTitle')"
    :ok-text="$t('ProjectApplication.access.bindAndOpen')"
    :cancel-text="$t('ProjectApplication.common.cancel')"
    :confirm-loading="confirmLoading"
    destroy-on-close
    @ok="confirm"
    @cancel="close"
  >
    <p class="role-select-tip">
      {{ $t('ProjectApplication.access.roleSelectTip', { name: applicationName }) }}
    </p>
    <a-radio-group v-model:value="selectedRoleId" class="role-options">
      <a-radio
        v-for="role in roles"
        :key="role.id"
        class="role-option"
        :value="role.id"
      >
        <span class="role-option__name">{{ role.name }}</span>
        <span v-if="role.description" class="role-option__description">
          {{ role.description }}
        </span>
      </a-radio>
    </a-radio-group>
  </a-modal>
</template>

<script setup lang="ts" name="ProjectApplicationRoleSelectModal">
import type { PropType } from 'vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { ApplicationRole } from '../types'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  roles: {
    type: Array as PropType<ApplicationRole[]>,
    default: () => [],
  },
  applicationName: {
    type: String,
    default: '',
  },
  confirmLoading: {
    type: Boolean,
    default: false,
  },
})
const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'cancel'): void
  (e: 'confirm', roleId: string): void
}>()
const { t: $t } = useI18n()
const selectedRoleId = ref('')

watch([() => props.open, () => props.roles], ([open, roles]) => {
  if (open) selectedRoleId.value = roles[0]?.id || ''
}, { immediate: true })

const close = () => {
  emits('update:open', false)
  emits('cancel')
}

const confirm = () => {
  if (!selectedRoleId.value) {
    onlyMessage($t('ProjectApplication.access.roleRequired'), 'warning')
    return
  }
  emits('confirm', selectedRoleId.value)
}
</script>

<style scoped>
.role-select-tip {
  margin: 0 0 var(--space-3);
  color: var(--ink-2);
  line-height: 1.6;
}

.role-options {
  display: grid;
  gap: var(--space-2);
  width: 100%;
}

.role-option {
  min-height: var(--space-10);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
}

.role-option__name {
  color: var(--ink-1);
  font-weight: 500;
}

.role-option__description {
  display: block;
  margin-top: var(--space-1);
  color: var(--ink-3);
  font-size: var(--fs-12);
  line-height: 1.5;
}
</style>
