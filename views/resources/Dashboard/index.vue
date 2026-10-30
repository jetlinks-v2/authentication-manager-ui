<template>
  <SaasResourceDashboard v-if="isSaaS" />
  <LegacyResourceDashboard v-else />
</template>
<script setup lang="ts" name="ResourceCenterDashboard">
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import SaasResourceDashboard from './SaasResourceDashboard.vue'
import LegacyResourceDashboard from './LegacyResourceDashboard.vue'
</script>
