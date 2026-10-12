<template>
    <a-tag :color="status.color" class="http-status">
        <AIcon :type="status.icon" />
        {{ status.label }}
    </a-tag>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { getHttpStatus } from '../accessLogPresentation';
const props = defineProps<{ value?: number }>();
const status = computed(() => getHttpStatus(props.value));
</script>
<style scoped>
.http-status {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    white-space: nowrap;
}
</style>
