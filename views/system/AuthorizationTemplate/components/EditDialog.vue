<template>
  <JlDrawerShell
    open
    form-mode
    icon="SafetyCertificateOutlined"
    :title="dialogTitle"
    :sub="$t('AuthorizationTemplate.EditDialog.subTitle')"
    :width="1120"
    @submit="confirm"
    @update:open="handleOpenChange"
  >
    <a-form ref="formRef" :model="modelRef" layout="vertical" class="authorization-template-form">
      <SectionCard
        icon="ProfileOutlined"
        :title="$t('AuthorizationTemplate.EditDialog.basicTitle')"
        :sub="$t('AuthorizationTemplate.EditDialog.basicSub')"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              name="name"
              :label="$t('AuthorizationTemplate.field.name')"
              :rules="[
                { required: true, message: $t('AuthorizationTemplate.validate.nameRequired') },
                { max: 64, message: $t('AuthorizationTemplate.validate.max64') },
              ]"
            >
              <a-input v-model:value="modelRef.name" :placeholder="$t('AuthorizationTemplate.placeholder.name')" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item
              v-if="!props.data?.id"
              name="id"
              :label="$t('AuthorizationTemplate.field.id')"
              :rules="[{ max: 64, message: $t('AuthorizationTemplate.validate.max64') }]"
            >
              <a-input
                v-model:value="modelRef.id"
                :placeholder="$t('AuthorizationTemplate.placeholder.id')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item
              name="state"
              :label="$t('AuthorizationTemplate.field.state')"
              :rules="[{ required: true, message: $t('AuthorizationTemplate.validate.stateRequired') }]"
            >
              <a-select v-model:value="modelRef.state" :options="stateOptions" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item
          name="description"
          :label="$t('AuthorizationTemplate.field.description')"
          :rules="[{ max: 255, message: $t('AuthorizationTemplate.validate.max255') }]"
        >
          <a-textarea
            v-model:value="modelRef.description"
            :rows="3"
            :placeholder="$t('AuthorizationTemplate.placeholder.description')"
          />
        </a-form-item>
      </SectionCard>

      <SectionCard
        icon="BranchesOutlined"
        :title="$t('AuthorizationTemplate.EditDialog.actionTitle')"
        :sub="$t('AuthorizationTemplate.EditDialog.actionSub')"
      >
        <a-form-item
          name="actions"
          :rules="[{ validator: validateActions }]"
        >
          <ActionMappingEditor
            v-model:value="modelRef.actions"
            v-model:active-id="modelRef.activeActionId"
          />
        </a-form-item>
      </SectionCard>
    </a-form>

    <template #foot>
      <StickyActionBar position="inline" :hint="$t('AuthorizationTemplate.EditDialog.saveHint')">
        <a-button @click="emits('close')">
          {{ $t('AuthorizationTemplate.action.cancel') }}
        </a-button>
        <a-button type="primary" :loading="loading" @click="confirm">
          {{ $t('AuthorizationTemplate.action.save') }}
        </a-button>
      </StickyActionBar>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  addAuthorizationTemplate_api,
  updateAuthorizationTemplate_api,
} from '@authentication-manager-ui/api/system/authorizationTemplate'
import ActionMappingEditor from './ActionMappingEditor.vue'
import type { AuthorizationTemplateItem } from '../typings'
import { normalizeTemplateActions } from '../actionUtil'
import {
  createEmptyForm,
  stateOptions,
  toFormData,
  toTemplatePayload,
} from '../util'

const { t: $t } = useI18n()
const emits = defineEmits(['save', 'close'])

const props = defineProps({
  data: {
    type: Object as PropType<Partial<AuthorizationTemplateItem> | undefined>,
    default: undefined,
  },
})

const formRef = ref<Record<string, any>>()
const loading = ref(false)
const modelRef = reactive(createEmptyForm())
const dialogTitle = computed(() => props.data?.id
  ? $t('AuthorizationTemplate.EditDialog.editTitle')
  : $t('AuthorizationTemplate.EditDialog.addTitle'))

const validateActions = () => {
  const normalized = normalizeTemplateActions(modelRef.actions)
  const uniqueIds = new Set(normalized.map((item) => item.id))
  if (normalized.length > 0 && normalized.length === modelRef.actions.length && uniqueIds.size === normalized.length) {
    return Promise.resolve()
  }
  return Promise.reject($t('AuthorizationTemplate.validate.actionRequired'))
}

const handleOpenChange = (open: boolean) => {
  if (!open) {
    emits('close')
  }
}

const confirm = async () => {
  await formRef.value?.validate()
  loading.value = true
  try {
    const payload = toTemplatePayload(modelRef, props.data)
    const resp = props.data?.id
      ? await updateAuthorizationTemplate_api(payload)
      : await addAuthorizationTemplate_api(payload)

    if (resp.success || resp.status === 200) {
      onlyMessage($t('AuthorizationTemplate.message.saveSuccess', [modelRef.name]))
      emits('save')
    }
  } finally {
    loading.value = false
  }
}

watchEffect(() => {
  Object.assign(modelRef, toFormData(props.data))
})
</script>

<style lang="less" scoped>
.authorization-template-form {
  :deep(.section) {
    margin-bottom: 14px;
  }
}
</style>
