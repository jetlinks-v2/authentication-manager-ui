<template>
  <VisionTrendPanel :title="title" :gateways="gateways" :gateway-id="gatewayId" :task-id="taskId" :tasks="tasks"
    :state="displayState" :metric="metric" @gateway="value => gatewayId = value" @task="value => taskId = value"
    @metric="value => metric = value" />
</template>
<script setup lang="ts">
import { computed, toRef } from 'vue'
import VisionTrendPanel from './VisionTrendPanel.vue'
import { useVisionTrend } from './useVisionTrend'
import type { VisionTrendGateway } from './types'
import type { RuntimeState } from '../../monitoring/state'
import type { VisionTrendPoint } from './types'

/** 资源中心视觉趋势入口；宿主提供本机或授权网关目录、身份范围与准入状态。 */
const props = withDefaults(defineProps<{ title: string; scope: string; gateways: VisionTrendGateway[]; enabled?: boolean; directoryLoading?: boolean; directoryError?: boolean }>(), { enabled: true })
const { gatewayId, taskId, metric, tasks, state } = useVisionTrend(toRef(props, 'gateways'), toRef(props, 'enabled'), toRef(props, 'scope'))
const displayState = computed<RuntimeState<VisionTrendPoint[]>>(() => props.directoryLoading
  ? { ...state.value, data: undefined, loading: true, error: undefined }
  : props.directoryError ? { ...state.value, data: undefined, loading: false, error: 'failed' } : state.value)
</script>
