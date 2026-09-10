<template><ResourceConfig :active-component="activeComponent" @change="(value,key) => $emit('change',value,key)" /></template>
<script setup lang="ts">
import ResourceConfig from '../components/ResourceConfig.vue'
import type { ResourceInfo,ResourceConfig as ConfigValue } from '../shared'
defineProps<{ activeComponent: ResourceInfo }>()
defineEmits<{ change: [value: ConfigValue,key: string] }>()
</script>
