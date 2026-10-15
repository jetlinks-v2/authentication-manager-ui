<template>
  <RuntimeLogPanel />
</template>

<script setup lang="ts" name="RuntimeLog">
import { defineAsyncComponent } from 'vue'

const RuntimeLogPanel = defineAsyncComponent(() => import('@authentication-manager-ui/components/RuntimeLogPanel'))
</script>
