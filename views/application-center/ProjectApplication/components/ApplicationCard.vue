<template>
  <CardSummary class="application-card" :data="cardData" @click="emits('edit')">
    <template #status>
      <span
        class="application-status"
        :class="`application-status--${item.application.status}`"
        :aria-label="item.application.statusText"
      >
        <AIcon :type="item.application.status === 'enabled' ? 'CheckCircleOutlined' : 'MinusCircleOutlined'" />
      </span>
    </template>

    <template #meta>
      <span class="created-at">
        <AIcon type="ClockCircleOutlined" />
        {{ $t('ProjectApplication.list.createdAt', { time: item.application.createdAt }) }}
      </span>
    </template>

    <template #footer>
      <div class="application-card__footer" @click.stop>
        <a-button type="text" size="small" @click="emits('edit')">
          <template #icon><AIcon type="EditOutlined" /></template>
          {{ $t('ProjectApplication.common.edit') }}
        </a-button>
        <a-button type="text" size="small" :loading="loading" @click="emits('toggle-status')">
          <template #icon>
            <AIcon :type="item.application.status === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined'" />
          </template>
          {{ statusActionText }}
        </a-button>
        <a-button type="text" size="small" @click="emits('open')">
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
  --card-shell-avatar-size: var(--space-10);

  display: block;
  height: 12.75rem;
}

.application-card :deep(.card-summary) {
  padding: var(--space-4) var(--space-4) 0;
}

.application-card :deep(.card-avatar) {
  border: 0;
  border-radius: var(--r-2);
}

.application-card :deep(.card-summary__header) { gap: var(--space-2); }
.application-card :deep(.card-summary__title-row) {
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.application-card :deep(.card-summary__title) {
  font-size: var(--fs-h4);
}
.application-card :deep(.card-summary__subtitle) {
  display: inline-flex;
  max-width: 100%;
  margin-top: var(--space-1);
  padding: 0 var(--space-2);
  overflow: hidden;
  border-radius: var(--r-1);
  background: var(--bg-sunken);
  color: var(--ink-3);
  font-size: var(--fs-meta);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.application-card :deep(.card-summary__description) {
  min-height: 2.75rem;
  margin-top: var(--space-3);
}
.application-card :deep(.card-summary__meta) { margin-top: auto; }
.application-card :deep(.card-summary__footer) {
  margin: var(--space-2) calc(var(--space-4) * -1) 0;
  padding: var(--space-2) 0;
  gap: 0;
}

.application-status {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--ink-3);
  font-size: var(--fs-16);
}

.application-status--enabled {
  color: var(--success);
}

.created-at {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
  color: var(--ink-3);
  font-size: var(--fs-meta);
}

.application-card__footer {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: stretch;
}

.application-card__footer :deep(.ant-btn) {
  min-width: 0;
  flex: 1;
  border-radius: 0;
  color: var(--ink-2);
}

.application-card__footer :deep(.ant-btn + .ant-btn) {
  border-left: var(--jet-theme-stroke-width) solid var(--line);
}

.application-card__footer :deep(.ant-btn:hover) {
  background-color: transparent;
  color: var(--jet-theme-primary-hover);
}

@media (max-width: 30rem) {
  .application-card { height: auto; min-height: 12.75rem; }
}
</style>
