<template>
  <a-alert v-if="validation" :type="validation.valid ? 'success' : 'warning'" show-icon
    :message="$t(validation.valid ? 'ApiApplication.subscription.valid' : 'ApiApplication.subscription.invalid')">
    <template v-if="validation.issues.length" #description>
      <ul class="validation-issues">
        <li v-for="(issue, index) in validation.issues" :key="index">
          <div>{{ issue.message }}</div>
          <a-typography-text type="secondary">{{ issue.field }} · {{ issue.code }}</a-typography-text>
        </li>
      </ul>
    </template>
  </a-alert>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SubscriptionValidation } from '@authentication-manager-ui/api/application-center/applicationSubscription'
defineProps<{ validation?: SubscriptionValidation }>()
const { t: $t } = useI18n()
</script>
<style scoped>.validation-issues { margin: 0; padding-left: 20px; }.validation-issues li + li { margin-top: 8px; }</style>
