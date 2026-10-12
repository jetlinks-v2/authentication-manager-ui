<template>
    <a-tag :color="level.color" class="log-level">
        <AIcon :type="level.icon" /> {{ level.label }}
    </a-tag>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { getSystemLogLevel } from '../systemLogPresentation';
const props = defineProps<{ value?: string }>();
const level = computed(() => getSystemLogLevel(props.value));
</script>
<style scoped>
.log-level { margin: 0; white-space: nowrap; }
</style>
