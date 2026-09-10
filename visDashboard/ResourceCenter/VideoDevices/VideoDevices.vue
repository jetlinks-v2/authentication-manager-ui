<template><ResourceWidget kind="VideoDevices" :info="info" :is-edit="isEdit" /></template>
<script setup lang="ts">
import ResourceWidget from '../components/ResourceWidget.vue'
import type { ResourceInfo } from '../shared'
withDefaults(defineProps<{ info?: ResourceInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
