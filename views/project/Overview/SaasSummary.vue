<template>
  <div class="saas-summary">
    <ProjectSummary :summary="summary" :loading="loading" :error="error" @reload="reload" @renew="open('renew')" @upgrade="open('upgrade')" />
    <BillingDialog v-if="visible" :view="view" @change="change" @save="save" @close="close" />
  </div>
</template>
<script setup lang="ts">
import ProjectSummary from '../../../visDashboard/Base/Saas/components/ProjectSummary.vue'
import BillingDialog from '../../../visDashboard/Base/Saas/components/BillingDialog.vue'
import { useSaasBilling } from '../../../visDashboard/Base/Saas/useSaasBilling'
import { useSaasSummary } from './useSaasSummary'
const { summary, loading, error, reload } = useSaasSummary()
const { visible, view, open, close, change, save } = useSaasBilling(summary)
</script>
