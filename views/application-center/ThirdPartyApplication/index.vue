<template>
  <ApplicationPage :key="entryKey" />
</template>
<script setup lang="ts" name="ThirdPartyApplication">
import { useApplicationEntry } from './useApplicationEntry'
import ApplicationPage from './Direct/List.vue'
const { entryKey } = useApplicationEntry()
</script>
