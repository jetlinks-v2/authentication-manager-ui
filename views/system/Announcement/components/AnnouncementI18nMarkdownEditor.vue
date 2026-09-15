<template>
  <a-tabs v-model:active-key="activeLanguage" class="announcement-i18n-markdown">
    <a-tab-pane v-for="language in languages" :key="language.code" :tab="language.label">
      <MarkdownEditor
        :model-value="model[language.code]"
        :rows="rows"
        :placeholder="placeholder"
        :show-upload-file-toolbar="false"
        @update:model-value="updateContent(language.code, $event)"
      />
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'

const props = withDefaults(defineProps<{
  modelValue?: Record<string, string>
  placeholder?: string
  rows?: number
}>(), {
  modelValue: () => ({}),
  placeholder: '',
  rows: 14,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: Record<string, string>): void
}>()

const { t } = useI18n()
const activeLanguage = ref('zh')
const languages = computed(() => [
  { code: 'zh', label: t('Announcement.i18n.chinese') },
  { code: 'en', label: t('Announcement.i18n.english') },
])
const model = computed<Record<string, string>>(() => ({
  zh: String(props.modelValue?.zh ?? ''),
  en: String(props.modelValue?.en ?? ''),
}))

function updateContent(language: string, value: string) {
  emit('update:modelValue', {
    ...model.value,
    [language]: String(value ?? ''),
  })
}
</script>

<style scoped lang="less">
.announcement-i18n-markdown :deep(.ant-tabs-content-holder) {
  min-height: 20rem;
}
</style>
