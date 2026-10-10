<template>
  <ApplicationDetail :key="entryKey" />
</template>
<script setup lang="ts" name="ThirdPartyApplicationDetail">
import { useApplicationEntry } from '../useApplicationEntry'
import ApplicationDetail from '../Direct/Detail.vue'
const { entryKey } = useApplicationEntry()
</script>
