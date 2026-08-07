<template>
  <EntityCard class="application-card" @click="emits('open')">
    <template #icon>
      <div class="application-icon">
        <img v-if="item.application.icon" :src="item.application.icon" :alt="item.application.name" />
        <AIcon v-else :type="item.template.icon" />
      </div>
    </template>
    <template #title>{{ item.application.name }}</template>
    <template #badges>
      <MetaChip :tone="item.application.status === 'enabled' ? 'ok' : 'default'">
        {{ statusText }}
      </MetaChip>
    </template>
    <template #subtitle>{{ $t(item.template.nameKey) }}</template>
    <template #body>
      <p class="application-description">{{ item.application.description || '--' }}</p>
      <div class="application-metrics">
        <MetaChip>
          <template #prefix><AIcon type="ApiOutlined" /></template>
          {{ $t('ProjectApplication.list.gatewayCount', { count: item.gatewayCount }) }}
        </MetaChip>
        <MetaChip>
          <template #prefix><AIcon type="VideoCameraOutlined" /></template>
          {{ $t('ProjectApplication.list.cameraCount', { count: item.cameraCount }) }}
        </MetaChip>
      </div>
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate, ProjectApplication } from '../types'

interface ApplicationCardItem {
  application: ProjectApplication
  template: ApplicationTemplate
  gatewayCount: number
  cameraCount: number
}

const props = defineProps({
  item: {
    type: Object as PropType<ApplicationCardItem>,
    required: true,
  },
})

const emits = defineEmits(['open'])
const { t: $t } = useI18n()

const statusText = computed(() => $t(
  props.item.application.status === 'enabled'
    ? 'ProjectApplication.common.enabled'
    : 'ProjectApplication.common.disabled',
))
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

.application-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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
