<template>
  <CardSummary class="application-card" :data="cardData" @click="emits('open')">
    <template #footer>
      <div class="application-card__footer">
        <span class="created-at">
          <AIcon type="ClockCircleOutlined" />
          {{ $t('ProjectApplication.list.createdAt', { time: item.application.createdAt }) }}
        </span>
        <AIcon class="open-icon" type="RightOutlined" />
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
})

const emits = defineEmits<{
  (event: 'open'): void
}>()
const { t: $t } = useI18n()
const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))

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
  min-height: 18rem;
}

.application-card__footer,
.created-at {
  display: flex;
  align-items: center;
}

.application-card__footer {
  width: 100%;
  justify-content: space-between;
  gap: var(--space-4);
}

.created-at {
  min-width: 0;
  gap: var(--space-1);
  color: var(--ink-4);
  font-size: var(--fs-meta);
}

.open-icon {
  flex: none;
  color: var(--ink-4);
}
</style>
