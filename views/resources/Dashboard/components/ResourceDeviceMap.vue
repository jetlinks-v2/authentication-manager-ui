<template>
  <DefineLoading>
    <div class="resource-panel-state resource-device-map__loading" aria-busy="true">
      <Skeleton active :title="false" :paragraph="{ rows: 4, width: ['92%', '76%', '86%', '60%'] }" />
    </div>
  </DefineLoading>
  <div class="resource-device-map">
    <DashboardWidgetRenderer v-if="embeddedMap" :widget="embeddedMap"
      :definition="runtime.mapDefinition.value" :preview-mode="false">
      <template #loading><ReuseLoading /></template>
    </DashboardWidgetRenderer>
    <ReuseLoading v-else-if="runtime.mapLoading.value" />
    <ResourceEmpty v-else class="resource-panel-state" :title="t('resourcePage.mapUnavailable')">
      <a-button size="small" @click="runtime.reloadMap">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import { Skeleton } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { DashboardWidgetRenderer, type DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import ResourceEmpty from '../../../../visDashboard/ResourceCenter/components/ResourceEmpty.vue'
import { useResourcePageContext } from '../resourcePageContext'

const props = defineProps<{ legendTarget?: string }>()
const { t } = useI18n()
const runtime = useResourcePageContext()
const [DefineLoading, ReuseLoading] = createReusableTemplate()
// 外框始终由宿主持有，两种排布共用同一份嵌入配置，不修改 discovery 返回的原配置。
const embeddedMap = computed<DashboardWidget | undefined>(() => {
  const widget = runtime.mapWidget.value
  if (!widget) return undefined
  return { ...widget, componentProps: { ...widget.componentProps,
    deviceMapCard: { ...(widget.componentProps.deviceMapCard as object || {}), embedded: true,
      ...(props.legendTarget ? { legendTarget: props.legendTarget } : {}),
    },
  } }
})
</script>

<style scoped>
.resource-device-map { display: flex; flex-direction: column; width: 100%; height: 100%; min-width: 0; min-height: 0; }
.resource-device-map__loading { width: 100%; height: 100%; overflow: hidden; }
</style>
