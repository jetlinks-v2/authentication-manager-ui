<template>
  <section class="application-summary">
    <div class="summary-back">
      <a-tooltip :title="$t('ProjectApplication.list.title')">
        <a-button
          type="text"
          shape="circle"
          :aria-label="$t('ProjectApplication.list.title')"
          @click="emits('back')"
        >
          <template #icon><AIcon type="ArrowLeftOutlined" /></template>
        </a-button>
      </a-tooltip>
    </div>

    <div class="summary-icon">
      <img v-if="data.application.icon" :src="data.application.icon" :alt="data.application.name" />
      <img v-else-if="isImageIcon(data.template.icon)" :src="data.template.icon" :alt="data.template.name" />
      <AIcon v-else :type="data.template.icon || 'AppstoreOutlined'" />
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
          {{ data.application.statusText }}
        </MetaChip>
        <AppTag>{{ data.template.name }}</AppTag>
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

const emits = defineEmits<{
  back: []
  update: [patch: Partial<ProjectApplication>, field: 'name' | 'description']
  'toggle-status': []
  open: []
}>()
const { t: $t } = useI18n()
const titleStyle: CSSProperties = { fontSize: 'var(--fs-20)', fontWeight: 600, color: 'var(--ink-1)' }
const descriptionStyle: CSSProperties = { color: 'var(--ink-2)', lineHeight: 1.6 }

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
const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))
</script>

<style scoped>
.application-summary {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
}

.summary-back {
  display: flex;
  align-items: center;
}

.summary-back :deep(.ant-btn) {
  color: var(--ink-2);
}

.summary-icon {
  display: grid;
  width: var(--space-11);
  height: var(--space-11);
  place-items: center;
  flex: none;
  overflow: hidden;
  border-radius: var(--r-3);
  color: var(--accent);
  font-size: var(--fs-20);
}

.summary-icon img { width: 100%; height: 100%; object-fit: cover; }
.summary-main { display: flex; min-width: 0; flex-direction: column; gap: var(--space-1); }
.identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.identity-row > :first-child {
  min-width: 8rem;
  max-width: 100%;
}

.meta-row { display: flex; flex-wrap: wrap; gap: var(--space-3); color: var(--ink-4); font-size: var(--fs-12); }
.meta-row span { display: inline-flex; align-items: center; gap: var(--space-1); }
.summary-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-left: var(--space-3);
  border-left: 1px solid var(--line);
}

@media (max-width: 48rem) {
  .application-summary {
    grid-template-columns: auto auto minmax(0, 1fr);
    padding: var(--space-3);
  }

  .summary-actions {
    grid-column: 1 / -1;
    padding-left: 0;
    border-left: 0;
  }
}
</style>
