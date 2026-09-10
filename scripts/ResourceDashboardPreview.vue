<template>
  <div class="resource-dashboard-preview" :class="{ 'read-only': readOnly }">
    <div v-if="!readOnly" class="toolbar"><a-switch v-model:checked="preview" checked-children="预览" un-checked-children="实时" /><a-button @click="restore">恢复布局</a-button><span>{{ Object.keys(catalog.components).length }} 个组件</span></div>
    <a-spin v-if="loading" />
    <pre v-else-if="errors.length">{{ errors }}</pre>
    <DashBoardCanvas v-else v-model="value" :catalog="catalog" :preview-mode="preview" :editable="!readOnly" />
  </div>
</template>
<script setup lang="ts">
import { ref,watch } from 'vue'
import { cloneDeep } from 'lodash-es'
import { DashBoardCanvas,type DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourceDashboard } from '../visDashboard/ResourceCenter/useResourceDashboard'
withDefaults(defineProps<{ readOnly?: boolean }>(), { readOnly: false })
const preview = ref(true)
const { catalog,dashboard,loading,errors } = useResourceDashboard(preview)
const value = ref<DashboardValue>({ canvas: {},components: [] })
/** 仅在本地验收画布重置布局，不调用后端保存接口。 */
function restore() { value.value = cloneDeep(dashboard.value) }
watch(dashboard,restore,{ immediate: true })
</script>
<style scoped>
.resource-dashboard-preview { padding: 20px;background: #f5f6fc;min-height: 100%; }
.resource-dashboard-preview.read-only { padding: 0;background: transparent; }
.toolbar { display: flex;align-items: center;gap: 12px;margin-bottom: 16px; }
.resource-dashboard-preview :deep(.dashboard-card-layout),.resource-dashboard-preview :deep(.dashboard-card-content) { height: auto;overflow: visible; }
</style>
