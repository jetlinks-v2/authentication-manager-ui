<template>
  <section class="callback-connection">
    <a-flex justify="space-between" align="center" class="connection-heading">
      <h3>{{ $t('ApplicationConnection.title') }}</h3>
      <a-badge :status="configured ? 'success' : 'default'" :text="$t(configured ? 'ApplicationConnection.configured' : 'ApplicationConnection.notConfigured')" />
    </a-flex>
    <a-alert v-if="error" type="error" show-icon :message="error" class="connection-message">
      <template #action><a-button size="small" :disabled="busy" @click="load">{{ $t('ApplicationConnection.refresh') }}</a-button></template>
    </a-alert>
    <a-spin :spinning="loading">
      <a-form layout="vertical" class="connection-fields">
        <ApplicationConnectionForm v-model="form.draft" :view="form.view.value" :disabled="busy || !canSave" @reload="form.loadTypes" />
        <a-space v-if="canSave" wrap>
          <a-popconfirm v-if="reuseSecretConfirmation" :title="$t('ApplicationConnection.reuseSecretConfirm')" @confirm="save">
            <a-button type="primary" :loading="saving" :disabled="saveDisabled">{{ $t('ApplicationConnection.save') }}</a-button>
          </a-popconfirm>
          <a-button v-else type="primary" :loading="saving" :disabled="saveDisabled" @click="save">{{ $t('ApplicationConnection.save') }}</a-button>
          <a-tooltip :title="$t(form.dirty.value ? 'ApplicationConnection.saveBeforeTest' : 'ApplicationConnection.testSavedHint')">
            <a-button :loading="testing" :disabled="busy || !configured || !available || form.dirty.value || !!error" @click="test">{{ $t('ApplicationConnection.test') }}</a-button>
          </a-tooltip>
          <a-popconfirm v-if="configured" :title="$t('ApplicationConnection.removeConfirm')" @confirm="remove">
            <a-button danger :disabled="busy || !!error">{{ $t('ApplicationConnection.remove') }}</a-button>
          </a-popconfirm>
        </a-space>
      </a-form>
      <a-descriptions v-if="phases.length" bordered :column="1" size="small" class="connection-results">
        <a-descriptions-item v-for="phase in phases" :key="phase.phase" :label="$t('ApplicationConnection.phase.' + phase.phase)">
          <a-space wrap>
            <a-badge :status="!phase.result ? 'default' : phase.result.success ? 'success' : 'error'"
              :text="$t(!phase.result ? 'ApplicationConnection.notExecuted' : phase.result.success ? 'ApplicationConnection.testSucceeded' : 'ApplicationConnection.testRejected')" />
            <template v-if="phase.result">
              <span>{{ phase.result.code }}</span>
              <span>{{ $t('ApplicationConnection.httpStatus') }}: {{ phase.result.httpStatus ?? '—' }}</span>
              <span>{{ $t('ApplicationConnection.elapsed') }}: {{ phase.result.elapsedMillis }} ms</span>
            </template>
          </a-space>
        </a-descriptions-item>
      </a-descriptions>
    </a-spin>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ApplicationConnectionForm from '../../components/ApplicationConnectionForm.vue'
import { useApplicationCallbackConnection } from '../useApplicationCallbackConnection'
const props = defineProps<{ applicationId: string; active: boolean; available: boolean }>()
const { t: $t } = useI18n()
const { form, configured, canSave, loading, saving, testing, error, phases, busy, reuseSecretConfirmation, saveDisabled, load, save, remove, test } = useApplicationCallbackConnection({
  id: () => props.applicationId, active: () => props.active, available: () => props.available,
})
</script>
<style scoped>
.callback-connection { margin-top: var(--space-5); border-top: 1px solid var(--line-soft); padding-top: var(--space-4); }
.connection-heading { margin-bottom: var(--space-3); }
.connection-heading h3 { margin: 0; }
.connection-fields { max-width: 48rem; }
.connection-message, .connection-results { margin-top: var(--space-3); }
</style>
