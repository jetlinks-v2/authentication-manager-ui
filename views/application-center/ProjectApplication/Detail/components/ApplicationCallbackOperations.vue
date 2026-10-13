<template>
  <section>
    <a-flex justify="space-between" align="center" wrap="wrap" gap="small" class="operations-heading">
      <a-radio-group v-model:value="kind" button-style="solid">
        <a-radio-button value="tasks">{{ $t('ApplicationConnection.tasks') }}</a-radio-button>
        <a-radio-button value="records">{{ $t('ApplicationConnection.records') }}</a-radio-button>
      </a-radio-group>
      <a-popconfirm v-if="canSave" :title="$t('ApplicationConnection.resyncConfirm')" @confirm="resync">
        <a-button :loading="resyncing" :disabled="busy || !available">{{ $t('ApplicationConnection.resync') }}</a-button>
      </a-popconfirm>
    </a-flex>
    <a-alert v-if="error" type="error" show-icon :message="error" class="operations-error" />
    <ApplicationCallbackTable :view="view" :loading="page.loading.value" :error="page.error.value"
      @refresh="page.load()" @search="page.search" @page="page.changePage">
      <template #bodyCell="{ column, record, text }">
        <a-badge v-if="column.key === 'state'" :status="callbackStateTone(text)" :text="$t('ApplicationConnection.state.' + text)" />
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm v-if="record.state === 'dead'" :title="$t('ApplicationConnection.requeueConfirm')" @confirm="requeue(record)">
            <a-button type="link" size="small" :loading="requeueTaskId === record.id" :disabled="busy || !available || page.loading.value">{{ $t('ApplicationConnection.requeue') }}</a-button>
          </a-popconfirm>
          <span v-else>—</span>
        </template>
        <template v-else>{{ callbackCellText(column, text) }}</template>
      </template>
    </ApplicationCallbackTable>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ApplicationCallbackTable from './ApplicationCallbackTable.vue'
import { useApplicationCallbackOperations } from '../useApplicationCallbackOperations'
import { callbackCellText, callbackStateTone } from '../applicationCallbackDisplay'
const props = defineProps<{ applicationId: string; active: boolean; available: boolean }>()
const { t: $t } = useI18n()
const { kind, page, view, canSave, busy, error, resyncing, requeueTaskId, resync, requeue } = useApplicationCallbackOperations({
  id: () => props.applicationId, active: () => props.active, available: () => props.available,
})
</script>
<style scoped>
.operations-heading, .operations-error { margin-bottom: var(--space-3); }
</style>
