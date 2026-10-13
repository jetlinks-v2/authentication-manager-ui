<template>
  <section>
    <a-radio-group v-model:value="kind" button-style="solid" class="snapshot-kind">
      <a-radio-button value="members">{{ $t('ApplicationConnection.members') }}</a-radio-button>
      <a-radio-button value="roles">{{ $t('ApplicationConnection.roles') }}</a-radio-button>
    </a-radio-group>
    <ApplicationCallbackTable :view="view" :loading="page.loading.value" :error="page.error.value"
      @refresh="page.load()" @search="page.search" @page="page.changePage">
      <template #bodyCell="{ column, text }">
        <a-badge v-if="column.key === 'state' || column.key === 'status'" :status="callbackStateTone(text)" :text="stateText(text)" />
        <template v-else>{{ callbackCellText(column, text) }}</template>
      </template>
    </ApplicationCallbackTable>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ApplicationCallbackTable from './ApplicationCallbackTable.vue'
import { useApplicationCallbackSnapshots } from '../useApplicationCallbackSnapshots'
import { callbackCellText, callbackStateTone } from '../applicationCallbackDisplay'
const props = defineProps<{ applicationId: string; active: boolean }>()
const { t: $t } = useI18n()
const { kind, page, view, stateText } = useApplicationCallbackSnapshots(() => props.applicationId, () => props.active)
</script>
<style scoped>
.snapshot-kind { margin-bottom: var(--space-3); }
</style>
