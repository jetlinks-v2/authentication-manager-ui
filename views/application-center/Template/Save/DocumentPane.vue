<template>
  <section class="template-document">
    <a-tabs v-model:active-key="activeLanguage" class="template-document__panes">
      <a-tab-pane v-for="language in languages" :key="language.value" :tab="language.label">
        <MarkdownEditor
          :model-value="documentByLanguage[language.value]"
          :rows="16"
          :placeholder="$t('ApplicationTemplate.document.placeholder')"
          :empty-description="$t('ApplicationTemplate.document.empty')"
          :disabled="!canUpdate"
          @update:model-value="updateDocument(language.value, $event)"
        >
          <template #toolbar-right>
            <a-segmented
              :value="activeLanguage"
              class="template-document__language-switch"
              :options="languages"
              size="small"
              @change="activeLanguage = String($event)"
            />
          </template>
        </MarkdownEditor>
      </a-tab-pane>
    </a-tabs>
    <div v-if="canUpdate" class="template-document__actions">
      <a-button :disabled="!dirty" @click="$emit('reset')">
        {{ $t('ApplicationTemplate.common.cancel') }}
      </a-button>
      <a-button type="primary" :loading="saving" :disabled="!dirty" @click="$emit('save')">
        {{ $t('ApplicationTemplate.common.confirm') }}
      </a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  draft: { type: String, default: '' },
  i18nDraft: { type: Object, default: () => ({}) },
  dirty: { type: Boolean, default: false },
  canUpdate: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'update:draft', value: string): void
  (event: 'update:i18nDraft', value: Record<string, string>): void
  (event: 'reset'): void
  (event: 'save'): void
}>()
const { t: $t, locale } = useI18n()
const currentLanguage = computed(() => String(locale.value || 'zh').replace('_', '-').split('-')[0])
const activeLanguage = ref(currentLanguage.value === 'en' ? 'en' : 'zh')
const languages = computed(() => [
  { value: 'zh', label: $t('I18n.chinese') },
  { value: 'en', label: $t('I18n.english') },
])
const documentByLanguage = computed<Record<string, string>>(() => ({
  zh: String((props.i18nDraft as Record<string, string>).zh || (currentLanguage.value === 'zh' ? props.draft : '')),
  en: String((props.i18nDraft as Record<string, string>).en || (currentLanguage.value === 'en' ? props.draft : '')),
}))

// The raw document remains the active-language fallback for compatibility with existing templates.
const updateDocument = (language: string, value: string) => {
  const next = {
    ...(props.i18nDraft as Record<string, string>),
    [language]: String(value || ''),
  }
  emit('update:i18nDraft', next)
  if (language === currentLanguage.value) emit('update:draft', next[language])
}
</script>

<style scoped>
.template-document { display: flex; flex-direction: column; gap: var(--space-4); }
/* 内容继续保留独立编辑器实例，语言入口统一由工具栏插槽承载。 */
.template-document__panes :deep(> .ant-tabs-nav) { display: none; }
.template-document__language-switch { font-size: var(--fs-12); }
.template-document__actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
</style>
