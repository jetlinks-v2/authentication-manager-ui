<template>
    <a-modal
        open
        :title="context.mode === 'add' ? $t('components.AddDialog.956922-0') : $t('components.AddDialog.956922-1')"
        :width="670"
        @cancel="emits('close')"
        @ok="confirm"
        :confirm-loading="loading"
        :ok-button-props="{ disabled: groupLoading || groupError }"
    >
        <a-alert v-if="groupError || saveError" type="error" show-icon
            :message="$t(groupError ? 'Role.application.groupLoadFailed' : 'Role.application.saveFailed')">
            <template v-if="groupError" #action><a-button size="small" @click="loadGroups">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
        </a-alert>
        <a-form ref="formRef" :model="form" layout="vertical">
            <a-form-item
                name="name"
                :label="$t('components.AddDialog.956922-2')"
                :rules="[
                    { required: true, message: $t('components.AddDialog.956922-3') },
                    { max: 64, message: $t('components.AddDialog.956922-4') },
                ]"
            >
                <a-input
                    v-model:value="form.name"
                    :placeholder="$t('components.AddDialog.956922-5')"
                    allow-clear
                />
            </a-form-item>
            <a-form-item
                v-if="!isApplication"
                name="groupId"
                :label="$t('components.AddDialog.956922-6')"
                :rules="[
                    { required: true, message: $t('components.AddDialog.956922-7') },
                ]"
            >
                <a-select
                    :loading="groupLoading"
                    show-search
                    v-model:value="form.groupId"
                    :placeholder="$t('components.AddDialog.956922-7')"
                    :options="groupOptions"
                    optionFilterProp="label"
                />
            </a-form-item>
            <a-form-item name="description" :label="$t('components.AddDialog.956922-8')">
                <a-textarea
                    v-model:value="form.description"
                    :placeholder="$t('components.AddDialog.956922-9')"
                    allow-clear
                    :maxlength="200"
                    show-count
                />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useRoleForm } from './useRoleForm'
import type { RoleFormContext } from './useRoleForm'

defineOptions({ name: 'RoleAddDialog' })
const props = defineProps({ context: { type: Object as PropType<RoleFormContext>, required: true } })
const emits = defineEmits<{ close: []; save: [id: string] }>()
const { isApplication, form, formRef, groupOptions, groupLoading, groupError, saveError,
  loading, loadGroups, confirm } = useRoleForm(props.context, id => emits('save', id))
</script>
