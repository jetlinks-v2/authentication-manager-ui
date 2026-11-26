<template>
  <ApplicationPage :key="entryKey" />
</template>
<script setup lang="ts">
import { useApplicationEntry } from './useApplicationEntry'
import ApplicationPage from './Direct/List.vue'

defineOptions({ name: 'ThirdPartyApplication' })
const { entryKey } = useApplicationEntry()
</script>
