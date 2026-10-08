<template>
  <section class="external-parameters">
    <header>
      <h2>{{ $t('ApplicationTemplate.parameters.title') }}</h2>
      <p>{{ $t('ApplicationTemplate.parameters.tip') }}</p>
    </header>
    <a-alert v-if="state.error.value" type="error" :message="state.error.value" show-icon />
    <a-form layout="vertical" :disabled="!canUpdate || state.saving.value">
      <a-form-item :label="$t('ApplicationTemplate.parameters.redirectUri')" required>
        <a-input v-model:value="state.redirectUri.value" :placeholder="$t('ApplicationTemplate.parameters.redirectUriPlaceholder')" />
      </a-form-item>
    </a-form>
    <a-space v-if="canUpdate">
      <a-button :disabled="state.saving.value" @click="state.reset">{{ $t('ApplicationTemplate.parameters.reset') }}</a-button>
      <a-button type="primary" :loading="state.saving.value" @click="state.save">
        {{ $t('ApplicationTemplate.config.save') }}
      </a-button>
    </a-space>
    <div class="external-parameters__declared">
      <h3>{{ $t('ApplicationTemplate.parameters.listTitle') }}</h3>
      <a-empty v-if="!parameterRows.length" :description="$t('ApplicationTemplate.parameters.empty')" />
      <a-table
        v-else
        size="small"
        row-key="name"
        :columns="columns"
        :data-source="parameterRows"
        :pagination="false"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useApplicationTemplateParameters } from './useApplicationTemplateParameters'

const props = defineProps({
  canUpdate: { type: Boolean, default: false },
  state: { type: Object as PropType<ReturnType<typeof useApplicationTemplateParameters>>, required: true },
})
const { t: $t } = useI18n()

const columns = computed(() => [
  { title: $t('ApplicationTemplate.parameters.name'), dataIndex: 'name', key: 'name', ellipsis: true },
  { title: $t('ApplicationTemplate.parameters.provider'), dataIndex: 'source', key: 'source', width: '8rem' },
  { title: $t('ApplicationTemplate.parameters.value'), dataIndex: 'value', key: 'value', ellipsis: true },
])

const fieldLabel = (field: string) => {
  if (field === 'id') {
    return $t('ApplicationTemplate.parameters.fieldId')
  }
  if (field === 'username') {
    return $t('ApplicationTemplate.parameters.fieldUsername')
  }
  return field || '-'
}

/** 参数由模板配置声明，这里只按 fixed/user 语义翻译成可读文本。 */
const parameterRows = computed(() => props.state.parameters.value.map(parameter => ({
  name: parameter.name,
  source: parameter.provider === 'fixed'
    ? $t('ApplicationTemplate.parameters.sourceFixed')
    : parameter.provider === 'user'
      ? $t('ApplicationTemplate.parameters.sourceUser')
      : parameter.provider,
  value: parameter.provider === 'user'
    ? fieldLabel(parameter.value)
    : parameter.value || '-',
})))
</script>

<style scoped>
.external-parameters { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-6); }
.external-parameters h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.external-parameters p { margin: var(--space-1) 0 0; color: var(--ink-3); line-height: 1.6; }
.external-parameters__declared { display: flex; flex-direction: column; gap: var(--space-2); }
.external-parameters__declared h3 { margin: 0; color: var(--ink-1); font-size: var(--fs-14); }
</style>
