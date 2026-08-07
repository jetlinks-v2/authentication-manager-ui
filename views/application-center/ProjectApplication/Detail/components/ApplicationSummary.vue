<template>
  <section class="application-summary">
    <div class="summary-icon">
      <img v-if="data.application.icon" :src="data.application.icon" :alt="data.application.name" />
      <AIcon v-else :type="data.template.icon" />
    </div>

    <div class="summary-main">
      <div class="identity-row">
        <InputEditable
          :value="data.application.name"
          :max-length="30"
          :text-style="titleStyle"
          @change="updateName"
        />
        <MetaChip :tone="data.application.status === 'enabled' ? 'ok' : 'default'">
          {{ statusText }}
        </MetaChip>
        <AppTag>{{ $t(data.template.nameKey) }}</AppTag>
      </div>
      <InputEditable
        :value="data.application.description"
        :max-length="100"
        :text-style="descriptionStyle"
        @change="updateDescription"
      />
      <div class="meta-row">
        <span><AIcon type="ClockCircleOutlined" />{{ $t('ProjectApplication.list.createdAt', { time: data.application.createdAt }) }}</span>
      </div>
    </div>

    <div class="summary-actions">
      <a-button @click="emits('open')">
        <template #icon><AIcon type="ExportOutlined" /></template>
        {{ $t('ProjectApplication.detail.open') }}
      </a-button>
      <a-popconfirm :title="statusConfirmText" @confirm="emits('toggle-status')">
        <a-button :danger="data.application.status === 'enabled'">
          {{ statusActionText }}
        </a-button>
      </a-popconfirm>
    </div>
  </section>
</template>

<script setup lang="ts" name="ProjectApplicationSummary">
import type { CSSProperties, PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate, ProjectApplication } from '../../types'

interface SummaryData {
  application: ProjectApplication
  template: ApplicationTemplate
}

const props = defineProps({
  data: {
    type: Object as PropType<SummaryData>,
    required: true,
  },
})

const emits = defineEmits(['update', 'toggle-status', 'open'])
const { t: $t } = useI18n()
const titleStyle: CSSProperties = { fontSize: 'var(--fs-20)', fontWeight: 600, color: 'var(--ink-1)' }
const descriptionStyle: CSSProperties = { color: 'var(--ink-2)', lineHeight: 1.6 }

const statusText = computed(() => $t(props.data.application.status === 'enabled'
  ? 'ProjectApplication.common.enabled'
  : 'ProjectApplication.common.disabled'))

const statusActionText = computed(() => $t(props.data.application.status === 'enabled'
  ? 'ProjectApplication.common.disable'
  : 'ProjectApplication.common.enable'))

const statusConfirmText = computed(() => $t('ProjectApplication.detail.statusConfirm', {
  action: statusActionText.value,
  name: props.data.application.name,
}))

const updateName = (name: string) => {
  if (name.trim()) emits('update', { name: name.trim() }, 'name')
}

const updateDescription = (description: string) => emits('update', { description: description.trim() }, 'description')
</script>

<style scoped>
.application-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--bg);
}

.summary-icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  overflow: hidden;
  border-radius: var(--r-3);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-20);
}

.summary-icon img { width: 100%; height: 100%; object-fit: cover; }
.summary-main { display: flex; min-width: 0; flex-direction: column; gap: var(--space-2); }
.identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.identity-row > :first-child { min-width: 12rem; }
.meta-row { display: flex; flex-wrap: wrap; gap: var(--space-3); color: var(--ink-4); font-size: var(--fs-12); }
.meta-row span { display: inline-flex; align-items: center; gap: var(--space-1); }
.summary-actions { display: flex; align-items: flex-start; gap: var(--space-2); }

@media (max-width: 48rem) {
  .application-summary { grid-template-columns: auto minmax(0, 1fr); padding: var(--space-3); }
  .summary-actions { grid-column: 1 / -1; }
}
</style>
