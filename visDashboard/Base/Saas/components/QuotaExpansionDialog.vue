<template>
  <a-modal :open="true" :title="t('packages.ProjectHome.saasExpansion')" :width="560"
    :ok-text="t('packages.ProjectHome.saasExpansionSubmit')" :ok-button-props="{ disabled: !view.canSubmit }"
    @ok="$emit('submit')" @cancel="$emit('close')">
    <a-form v-if="view.form.quotaId" layout="vertical" class="saas-expansion-form">
      <a-form-item :label="t('packages.ProjectHome.saasExpansionItem')">
        <a-select :value="view.form.quotaId || undefined" :options="view.options" @update:value="$emit('change', quotaSelection($event))" />
        <div v-if="view.usage" class="saas-expansion-hint">{{ t(view.isMock ? 'packages.ProjectHome.saasExpansionUsageMock' : 'packages.ProjectHome.saasExpansionUsage', { value: view.usage }) }}<span v-if="view.percent !== undefined"> · {{ view.percent }}%</span></div>
      </a-form-item>
      <a-form-item :label="view.unit ? t('packages.ProjectHome.saasExpansionAmount', { unit: view.unit }) : t('packages.ProjectHome.saasExpansionAmountWithoutUnit')"
        :validate-status="view.error ? 'error' : undefined" :help="view.error || undefined">
        <a-input-number :value="view.form.amount ?? undefined" :min="1" :max="999999" :step="1" style="width: 100%"
          @update:value="$emit('change', quotaAmount($event))" />
        <div v-if="view.nextLimit" class="saas-expansion-hint">{{ t('packages.ProjectHome.saasExpansionNextLimit', { value: view.nextLimit }) }}</div>
      </a-form-item>
      <a-form-item :label="t('packages.ProjectHome.saasExpansionNote')">
        <a-textarea :value="view.form.note" :rows="3" :maxlength="500" :placeholder="t('packages.ProjectHome.saasExpansionNotePlaceholder')" @update:value="$emit('change', { note: $event })" />
      </a-form-item>
    </a-form>
    <a-empty v-else :description="t('packages.ProjectHome.saasExpansionEmpty')" />
  </a-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { QuotaExpansionForm, QuotaExpansionView } from '../useQuotaExpansion'
import { quotaSelection, quotaAmount } from '../useQuotaExpansion'
defineProps<{ view: QuotaExpansionView }>()
defineEmits<{ change: [patch: Partial<QuotaExpansionForm>]; submit: []; close: [] }>()
const { t } = useI18n()
</script>
<style scoped>
.saas-expansion-form { padding-top: 8px; }
.saas-expansion-hint { margin-top: 6px; color: var(--ink-3, #646c73); font-size: 12px; line-height: 20px; }
</style>
