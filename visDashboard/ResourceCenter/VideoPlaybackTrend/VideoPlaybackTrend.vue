<!-- 保留历史组件标识，已保存的画布布局直接升级为网关状态指标。 -->
<template><GatewayStatusPanel :info="info" :is-edit="isEdit" /></template>
<script setup lang="ts">
import GatewayStatusPanel from '../components/GatewayStatusPanel.vue'
import type { ResourceInfo } from '../shared'
withDefaults(defineProps<{ info?: ResourceInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
