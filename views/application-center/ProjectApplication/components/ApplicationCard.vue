<template>
  <EntityCard class="application-card" @click="emits('open')">
    <template #icon>
      <div class="application-icon">
        <img v-if="item.application.icon" :src="item.application.icon" :alt="item.application.name" />
        <img v-else-if="isImageIcon(item.template.icon)" :src="item.template.icon" :alt="item.template.name" />
        <AIcon v-else :type="item.template.icon || 'AppstoreOutlined'" />
      </div>
    </template>
    <template #title>{{ item.application.name }}</template>
    <template #badges>
      <MetaChip :tone="item.application.status === 'enabled' ? 'ok' : 'default'">
        {{ item.application.statusText }}
      </MetaChip>
    </template>
    <template #subtitle>{{ item.template.name }}</template>
    <template #body>
      <p class="application-description">{{ item.application.description || '--' }}</p>
    </template>
    <template #footer>
      <span class="created-at">
        <AIcon type="ClockCircleOutlined" />
        {{ $t('ProjectApplication.list.createdAt', { time: item.application.createdAt }) }}
      </span>
      <AIcon class="open-icon" type="RightOutlined" />
    </template>
  </EntityCard>
</template>

<script setup lang="ts" name="ProjectApplicationCard">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
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

const emits = defineEmits(['open'])
const { t: $t } = useI18n()
const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))

</script>

<style scoped>
.application-card {
  min-height: 13rem;
}

.application-icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  overflow: hidden;
  border-radius: var(--r-2);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-20);
}

.application-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.application-description {
  min-height: 3rem;
  margin: var(--space-3) 0;
  color: var(--ink-2);
  line-height: 1.6;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.created-at {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
  color: var(--ink-4);
  font-size: var(--fs-12);
}

.open-icon {
  color: var(--ink-4);
}
</style>
