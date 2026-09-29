<template>
  <section class="external-parameters">
    <header>
      <h2>{{ $t('ApplicationTemplate.parameters.title') }}</h2>
      <p>{{ $t('ApplicationTemplate.parameters.tip') }}</p>
    </header>
    <a-alert v-if="state.loadError.value" type="error" :message="state.loadError.value" show-icon>
      <template #action>
        <a-button size="small" @click="state.loadProviders">{{ $t('ApplicationTemplate.parameters.retry') }}</a-button>
      </template>
    </a-alert>
    <a-alert v-if="state.error.value" type="error" :message="state.error.value" show-icon />
    <a-spin :spinning="state.loading.value">
      <a-empty v-if="!state.draft.value.length" :description="$t('ApplicationTemplate.parameters.empty')" />
      <a-form v-else layout="vertical" :disabled="!canUpdate || state.saving.value">
        <div v-for="(parameter, index) in state.draft.value" :key="index" class="external-parameters__row">
          <a-form-item :label="$t('ApplicationTemplate.parameters.name')" required>
            <a-input v-model:value="parameter.name" />
          </a-form-item>
          <a-form-item :label="$t('ApplicationTemplate.parameters.provider')" required>
            <a-select
              :value="parameter.provider || undefined"
              :options="state.options.value"
              :loading="state.loading.value"
              :disabled="!!state.loadError.value"
              @change="state.changeProvider(index, String($event))"
            />
          </a-form-item>
          <a-form-item v-if="parameter.provider === 'fixed'" :label="$t('ApplicationTemplate.parameters.value')">
            <a-input v-model:value="parameter.value" />
          </a-form-item>
          <a-form-item
            v-else-if="parameter.provider && parameter.provider !== 'access-token'"
            :label="$t('ApplicationTemplate.parameters.configuration')"
          >
            <a-textarea v-model:value="parameter.configuration" :auto-size="{ minRows: 2, maxRows: 8 }" />
          </a-form-item>
          <div v-else />
          <a-button v-if="canUpdate" danger @click="state.remove(index)">
            {{ $t('ApplicationTemplate.parameters.remove') }}
          </a-button>
        </div>
      </a-form>
    </a-spin>
    <a-flex v-if="canUpdate" justify="space-between">
      <a-button :disabled="state.loading.value || !!state.loadError.value || state.saving.value" @click="state.add">
        {{ $t('ApplicationTemplate.parameters.add') }}
      </a-button>
      <a-space>
        <a-button :disabled="state.saving.value" @click="state.reset">{{ $t('ApplicationTemplate.parameters.reset') }}</a-button>
        <a-button type="primary" :loading="state.saving.value" @click="state.save">
          {{ $t('ApplicationTemplate.config.save') }}
        </a-button>
      </a-space>
    </a-flex>
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
.external-parameters__row { display: grid; grid-template-columns: 1fr 1fr 1.5fr auto; align-items: start; gap: var(--space-3); }
.external-parameters__row > .ant-btn { margin-top: 1.875rem; }
@media (max-width: 48rem) {
  .external-parameters__row { grid-template-columns: 1fr; }
  .external-parameters__row > .ant-btn { margin-top: 0; }
}
</style>
