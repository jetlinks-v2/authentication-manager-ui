<template>
  <a-modal
    open
    destroy-on-close
    :title="dialogTitle"
    width="960px"
    :maskClosable="false"
    :confirmLoading="loading"
    @ok="confirm"
    @cancel="emits('close')"
  >
    <a-form ref="formRef" :model="modelRef" layout="vertical">
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item
            name="id"
            :label="$t('AuthorizationTemplate.field.id')"
            :rules="[
              { required: true, message: $t('AuthorizationTemplate.validate.idRequired') },
              { max: 64, message: $t('AuthorizationTemplate.validate.max64') },
            ]"
          >
            <a-input
              v-model:value="modelRef.id"
              :disabled="!!props.data?.id"
              :placeholder="$t('AuthorizationTemplate.placeholder.id')"
            />
          </a-form-item>
        </a-col>
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
      </a-row>

      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item
            name="scene"
            :label="$t('AuthorizationTemplate.field.scene')"
            :rules="[{ required: true, message: $t('AuthorizationTemplate.validate.sceneRequired') }]"
          >
            <a-select v-model:value="modelRef.scene" :options="sceneOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            name="type"
            :label="$t('AuthorizationTemplate.field.type')"
            :rules="[{ required: true, message: $t('AuthorizationTemplate.validate.typeRequired') }]"
          >
            <a-select v-model:value="modelRef.type" :options="typeOptions" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item
            name="riskLevel"
            :label="$t('AuthorizationTemplate.field.riskLevel')"
            :rules="[{ required: true, message: $t('AuthorizationTemplate.validate.riskRequired') }]"
          >
            <a-select v-model:value="modelRef.riskLevel" :options="riskLevelOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
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

      <a-alert
        v-if="preservedDimensionCount"
        type="info"
        show-icon
        class="dimension-alert"
        :message="$t('AuthorizationTemplate.EditDialog.preserveDimensions', [preservedDimensionCount])"
      />

      <a-form-item
        name="scopePermissions"
        :label="$t('AuthorizationTemplate.field.scope')"
        :rules="[{ validator: validateScope }]"
      >
        <ScopeEditor v-model:value="modelRef.scopePermissions" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  addAuthorizationTemplate_api,
  updateAuthorizationTemplate_api,
} from '@authentication-manager-ui/api/system/authorizationTemplate'
import ScopeEditor from './ScopeEditor.vue'
import type { AuthorizationTemplateItem } from '../typings'
import {
  createEmptyForm,
  riskLevelOptions,
  sceneOptions,
  stateOptions,
  toFormData,
  toGrantScopePermissions,
  toTemplatePayload,
  typeOptions,
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
const preservedDimensionCount = computed(() => props.data?.scope?.dimensions?.length || 0)
const dialogTitle = computed(() => props.data?.id
  ? $t('AuthorizationTemplate.EditDialog.editTitle')
  : $t('AuthorizationTemplate.EditDialog.addTitle'))

const validateScope = () => {
  if (toGrantScopePermissions(modelRef.scopePermissions).length || preservedDimensionCount.value) {
    return Promise.resolve()
  }
  return Promise.reject($t('AuthorizationTemplate.validate.scopeRequired'))
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
.dimension-alert {
  margin-bottom: 16px;
}
</style>
