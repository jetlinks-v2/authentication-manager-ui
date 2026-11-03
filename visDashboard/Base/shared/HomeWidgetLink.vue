<template>
  <a-button type="link" size="small" class="home-widget-more"><slot /><RightOutlined class="home-widget-arrow" /></a-button>
</template>

<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
</script>

<style scoped>
.home-widget-more { display: inline-flex; align-items: center; gap: 3px; }
.home-widget-arrow { font-size: 8.5px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; transition: transform 0.2s ease; }
.home-widget-more:not(:disabled):hover .home-widget-arrow { transform: translateX(2px); }
</style>
