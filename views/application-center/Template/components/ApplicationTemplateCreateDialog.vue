<template>
  <a-modal
    v-model:open="dialogOpen"
    :title="$t('ApplicationTemplate.list.add')"
    :confirm-loading="loading"
    :width="520"
    destroy-on-close
    @ok="handleOk"
    @cancel="dialogOpen = false"
  >
    <a-form ref="formRef" layout="vertical" :model="formData" :rules="rules">
      <a-form-item :label="$t('ApplicationTemplate.field.name')" name="name">
        <a-input
          v-model:value="formData.name"
          :maxlength="64"
          :placeholder="$t('ApplicationTemplate.field.namePlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.field.code')" name="code">
        <a-input
          v-model:value="formData.code"
          :maxlength="64"
          :placeholder="$t('ApplicationTemplate.field.codePlaceholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import type { RuleObject } from 'ant-design-vue/es/form/interface'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { createApplicationTemplate } from '@authentication-manager-ui/api/application-center/applicationTemplate'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', id: string): void
}>()

const { t: $t } = useI18n()
const formRef = ref<FormInstance>()
const loading = ref(false)
const dialogOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})
const formData = reactive({ name: '', code: '' })
const rules: Record<string, RuleObject[]> = {
  name: [
    { required: true, message: $t('ApplicationTemplate.message.nameRequired'), trigger: 'blur' },
    { max: 64, message: $t('ApplicationTemplate.message.nameMaxLength'), trigger: 'blur' },
  ],
  code: [
    { required: true, message: $t('ApplicationTemplate.message.codeRequired'), trigger: 'blur' },
    { max: 64, message: $t('ApplicationTemplate.message.codeMaxLength'), trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: $t('ApplicationTemplate.message.codeFormat'), trigger: 'blur' },
  ],
}

const resetForm = () => {
  formData.name = ''
  formData.code = ''
}

watch(() => props.open, async value => {
  if (value) {
    resetForm()
    await nextTick()
    formRef.value?.clearValidate?.()
    return
  }
  formRef.value?.resetFields?.()
  resetForm()
}, { immediate: true })

const handleOk = async () => {
  await formRef.value?.validate?.()
  loading.value = true
  try {
    const response = await createApplicationTemplate({
      name: formData.name,
      code: formData.code,
      layoutVariant: 'application',
      state: 'enabled',
    })
    const saved = response?.result ?? response
    const id = typeof saved === 'string' ? saved : saved?.id
    onlyMessage($t('ApplicationTemplate.message.success'))
    dialogOpen.value = false
    if (id) emit('created', id)
  } finally {
    loading.value = false
  }
}
</script>
