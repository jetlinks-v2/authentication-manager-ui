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
  </section>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useApplicationTemplateParameters } from './useApplicationTemplateParameters'

defineProps({
  canUpdate: { type: Boolean, default: false },
  state: { type: Object as PropType<ReturnType<typeof useApplicationTemplateParameters>>, required: true },
})
const { t: $t } = useI18n()
</script>

<style scoped>
.external-parameters { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-6); }
.external-parameters h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.external-parameters p { margin: var(--space-1) 0 0; color: var(--ink-3); line-height: 1.6; }
</style>
