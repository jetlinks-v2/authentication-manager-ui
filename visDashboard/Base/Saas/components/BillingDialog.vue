<template>
  <a-modal :open="true" :title="t(view.kind === 'renew' ? 'packages.ProjectHome.saasRenew' : 'packages.ProjectHome.saasUpgrade')"
    :width="560" :ok-text="t('packages.ProjectHome.saasBillingSave')" :cancel-text="t('packages.ProjectHome.saasBillingCancel')"
    @ok="$emit('save')" @cancel="$emit('close')">
    <a-form layout="vertical" class="saas-billing-form">
      <p v-if="view.project" class="saas-billing-project">{{ view.project }}</p>
      <template v-if="view.kind === 'renew'">
        <a-form-item :label="t('packages.ProjectHome.saasBillingDuration')">
          <a-radio-group :value="view.form.years" @change="$emit('change', { years: $event.target.value })">
            <a-radio-button v-for="years in [1, 2, 3]" :key="years" :value="years">{{ t('packages.ProjectHome.saasBillingYears', { years }) }}</a-radio-button>
          </a-radio-group>
          <div v-if="view.expiresAt" class="saas-billing-hint">{{ t('packages.ProjectHome.saasBillingCurrentExpiry', { date: view.expiresAt }) }}</div>
          <div v-if="view.nextExpiresAt" class="saas-billing-hint">{{ t('packages.ProjectHome.saasBillingNextExpiry', { date: view.nextExpiresAt }) }}</div>
        </a-form-item>
      </template>
      <template v-else>
        <div class="saas-billing-comparison">
          <div class="saas-billing-row saas-billing-row--header"><span>{{ t('packages.ProjectHome.saasBillingQuota') }}</span><span>{{ t('packages.ProjectHome.saasBillingEnterprisePreview') }}</span></div>
          <div v-for="row in view.quotas" :key="row.id" class="saas-billing-row"><span>{{ row.label }}</span><span>{{ row.value }}</span></div>
        </div>
      </template>
      <a-form-item :label="t('packages.ProjectHome.saasExpansionNote')">
        <a-textarea :value="view.form.note" :rows="3" :maxlength="500"
          :placeholder="t(view.kind === 'renew' ? 'packages.ProjectHome.saasRenewNotePlaceholder' : 'packages.ProjectHome.saasUpgradeNotePlaceholder')"
          @update:value="$emit('change', { note: $event })" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SaasBillingForm, SaasBillingView } from '../useSaasBilling'

defineProps<{ view: SaasBillingView }>()
defineEmits<{ change: [patch: Partial<SaasBillingForm>]; save: []; close: [] }>()
const { t } = useI18n()
</script>
<style scoped>
.saas-billing-form { padding-top: 8px; }
.saas-billing-project { margin-bottom: 8px; overflow-wrap: anywhere; }
.saas-billing-hint { margin: 8px 0 16px; color: var(--ink-3, #646c73); font-size: 12px; line-height: 20px; }
.saas-billing-comparison { margin-bottom: 20px; }
.saas-billing-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; padding: 9px 12px; border-bottom: 1px solid var(--line, #f0f0f0); }
.saas-billing-row > :last-child { text-align: right; font-variant-numeric: tabular-nums; }
.saas-billing-row--header { background: var(--bg-sunken, #f7f9fc); font-weight: 500; }
</style>
