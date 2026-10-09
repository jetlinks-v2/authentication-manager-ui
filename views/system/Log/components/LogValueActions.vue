<template>
    <span class="log-value-actions" @click.stop>
        <a-typography-text v-if="copyText" :copyable="{ text: copyText }" />
        <a-tooltip v-if="searchLabel" :title="searchLabel">
            <a-button type="link" size="small" :aria-label="searchLabel" @click="$emit('search')">
                <AIcon type="SearchOutlined" />
            </a-button>
        </a-tooltip>
    </span>
</template>
<script setup lang="ts">
defineProps<{ copyText?: string; searchLabel?: string }>();
defineEmits<{ (event: 'search'): void }>();
</script>
<style scoped>
.log-value-actions { display: inline-flex; align-items: center; gap: 0.25rem; flex-shrink: 0; vertical-align: middle; opacity: 0; pointer-events: none; }
:global(.log-value:hover > .log-value-actions),
:global(.log-value:focus-within > .log-value-actions),
.log-value-actions:focus-within { opacity: 1; pointer-events: auto; }
@media (hover: none) {
    .log-value-actions { opacity: 1; pointer-events: auto; }
}
</style>
