<template>
  <a-modal
    :open="visible"
    :title="title"
    :width="600"
    :mask-closable="false"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
      <a-form-item
        v-for="language in languages"
        :key="language.code"
        :label="language.label"
        :name="language.code"
      >
        <a-textarea
          v-if="textarea"
          v-model:value="formData[language.code]"
          :rows="4"
          :maxlength="maxLength"
          :placeholder="$t('Announcement.i18n.placeholder', { language: language.label })"
          show-count
        />
        <a-input
          v-else
          v-model:value="formData[language.code]"
          :maxlength="maxLength"
          :placeholder="$t('Announcement.i18n.placeholder', { language: language.label })"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  data?: Record<string, string>
  maxLength?: number
  textarea?: boolean
}>(), {
  data: () => ({}),
  maxLength: 200,
  textarea: false,
})

const emit = defineEmits<{
  (event: 'update:visible', visible: boolean): void
  (event: 'confirm', data: Record<string, string>): void
}>()

const { t } = useI18n()
const formRef = ref()
const formData = reactive<Record<string, string>>({})
const languages = computed(() => [
  { code: 'zh', label: t('Announcement.i18n.chinese') },
  { code: 'en', label: t('Announcement.i18n.english') },
])
const rules = computed(() => ({
  zh: [{ max: props.maxLength, message: t('Announcement.i18n.maxLength', { max: props.maxLength }), trigger: 'blur' as const }],
  en: [{ max: props.maxLength, message: t('Announcement.i18n.maxLength', { max: props.maxLength }), trigger: 'blur' as const }],
}))

function initFormData() {
  languages.value.forEach((language) => {
    formData[language.code] = props.data?.[language.code] || ''
  })
}

watch([() => props.visible, () => props.data], ([visible]) => {
  if (visible) initFormData()
})

function handleCancel() {
  emit('update:visible', false)
  formRef.value?.resetFields()
}

function handleOk() {
  formRef.value?.validate().then(() => {
    const result: Record<string, string> = {}
    Object.entries(formData).forEach(([language, value]) => {
      const text = value?.trim()
      if (text) result[language] = text
    })
    emit('confirm', result)
    emit('update:visible', false)
  })
}
</script>
