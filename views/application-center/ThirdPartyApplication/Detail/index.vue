<template>
  <ApplicationDetail :key="entryKey" />
</template>
<script setup lang="ts">
import { useApplicationEntry } from '../useApplicationEntry'
import ApplicationDetail from '../Direct/Detail.vue'

defineOptions({ name: 'ThirdPartyApplicationDetail' })
const { entryKey } = useApplicationEntry()
</script>
