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
      <div class="external-parameters__declared">
        <h3>{{ $t('ApplicationTemplate.parameters.listTitle') }}</h3>
        <a-empty v-if="!state.parameters.value.length" :description="$t('ApplicationTemplate.parameters.empty')" />
        <div v-for="(parameter, index) in state.parameters.value" :key="index" class="external-parameters__row">
          <a-input v-model:value="parameter.name" :placeholder="$t('ApplicationTemplate.parameters.name')" />
          <a-select
            :value="parameter.provider"
            :options="providerOptions"
            @update:value="state.changeProvider(index, String($event))"
          />
          <a-select
            v-if="parameter.provider === 'user'"
            v-model:value="parameter.value"
            :options="fieldOptions"
          />
          <a-input v-else v-model:value="parameter.value" :placeholder="$t('ApplicationTemplate.parameters.value')" />
          <a-button v-if="canUpdate" danger @click="state.removeParameter(index)">
            {{ $t('ApplicationTemplate.parameters.remove') }}
          </a-button>
        </div>
        <a-button v-if="canUpdate" @click="state.addParameter">
          {{ $t('ApplicationTemplate.parameters.add') }}
        </a-button>
      </div>
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useApplicationTemplateParameters } from './useApplicationTemplateParameters'

defineProps({
  canUpdate: { type: Boolean, default: false },
  state: { type: Object as PropType<ReturnType<typeof useApplicationTemplateParameters>>, required: true },
})
const { t: $t } = useI18n()

const providerOptions = computed(() => [
  { value: 'fixed', label: $t('ApplicationTemplate.parameters.sourceFixed') },
  { value: 'user', label: $t('ApplicationTemplate.parameters.sourceUser') },
])

const fieldOptions = computed(() => [
  { value: 'id', label: $t('ApplicationTemplate.parameters.fieldId') },
  { value: 'username', label: $t('ApplicationTemplate.parameters.fieldUsername') },
])
</script>

<style scoped>
.external-parameters { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-6); }
.external-parameters h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.external-parameters p { margin: var(--space-1) 0 0; color: var(--ink-3); line-height: 1.6; }
.external-parameters__declared { display: flex; flex-direction: column; gap: var(--space-2); }
.external-parameters__declared h3 { margin: 0; color: var(--ink-1); font-size: var(--fs-14); }
.external-parameters__row { display: grid; grid-template-columns: minmax(0, 1fr) 8rem minmax(0, 1fr) auto; gap: var(--space-2); align-items: center; }
@media (max-width: 48rem) {
  .external-parameters__row { grid-template-columns: minmax(0, 1fr); }
}
</style>
