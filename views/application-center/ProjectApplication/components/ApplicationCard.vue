<template>
  <CardSummary class="application-card" :data="cardData" @click="emits('edit')">
    <template #meta>
      <span class="created-at">
        <AIcon type="ClockCircleOutlined" />
        {{ $t('ProjectApplication.list.createdAt', { time: item.application.createdAt }) }}
      </span>
    </template>

    <template #footer>
      <div class="application-card__footer" @click.stop>
        <a-space :size="8">
          <a-button size="small" @click="emits('edit')">
            <template #icon><AIcon type="EditOutlined" /></template>
            {{ $t('ProjectApplication.common.edit') }}
          </a-button>
          <a-button size="small" :loading="loading" @click="emits('toggle-status')">
            <template #icon>
              <AIcon :type="item.application.status === 'enabled' ? 'PauseCircleOutlined' : 'PlayCircleOutlined'" />
            </template>
            {{ statusActionText }}
          </a-button>
        </a-space>

        <a-button type="primary" size="small" @click="emits('open')">
          <template #icon><AIcon type="ExportOutlined" /></template>
          {{ $t('ProjectApplication.detail.open') }}
        </a-button>
      </div>
    </template>
  </CardSummary>
</template>

<script setup lang="ts" name="ProjectApplicationCard">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { CardSummary } from '@jetlinks-web-core/components'
import type { CardSummaryData } from '@jetlinks-web-core/components'
import type { ApplicationTemplate, ProjectApplication } from '../types'

interface ApplicationCardItem {
  application: ProjectApplication
  template: ApplicationTemplate
}

const props = defineProps({
  item: {
    type: Object as PropType<ApplicationCardItem>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emits = defineEmits<{
  edit: []
  open: []
  'toggle-status': []
}>()
const { t: $t } = useI18n()
const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))

const statusActionText = computed(() => $t(props.item.application.status === 'enabled'
  ? 'ProjectApplication.common.disable'
  : 'ProjectApplication.common.enable'))

const cardData = computed<CardSummaryData>(() => {
  const { application, template } = props.item
  const icon = application.icon || template.icon
  const usesImage = isImageIcon(icon)
  return {
    title: application.name,
    subtitle: template.name,
    description: application.description || template.description || '--',
    avatar: {
      src: usesImage ? icon : undefined,
      icon: icon && !usesImage ? icon : undefined,
      text: icon ? undefined : application.name.slice(0, 1),
      tone: 'info',
    },
    status: {
      text: application.statusText,
      tone: application.status === 'enabled' ? 'success' : 'default',
    },
  }
})
</script>

<style scoped>
.application-card {
  display: block;
  height: 13.75rem;
}

.application-card :deep(.card-summary) {
  padding: var(--space-4) var(--space-4) 0;
}

.application-card :deep(.card-summary__header) { gap: var(--space-3); }
.application-card :deep(.card-summary__title-row) { justify-content: flex-start; gap: var(--space-2); }
.application-card :deep(.card-summary__description) { min-height: 2.75rem; margin-top: var(--space-4); }
.application-card :deep(.card-summary__meta) { margin-top: auto; }
.application-card :deep(.card-summary__footer) {
  margin: var(--space-3) calc(var(--space-4) * -1) 0;
  padding: var(--space-3) var(--space-4);
}

.created-at {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
  color: var(--ink-4);
  font-size: var(--fs-meta);
}

.application-card__footer {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

@media (max-width: 30rem) {
  .application-card { height: auto; min-height: 14.5rem; }
  .application-card__footer { align-items: stretch; flex-direction: column; }
  .application-card__footer > :deep(.ant-btn) { width: 100%; }
}
</style>
