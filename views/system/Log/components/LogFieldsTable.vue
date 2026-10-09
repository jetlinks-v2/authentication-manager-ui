<template>
    <a-table
        :columns="columns" :data-source="entries" row-key="label" :show-header="false"
        :pagination="false" size="small" table-layout="fixed" class="log-fields-table"
    >
        <template #bodyCell="{ column, record: entry }">
            <a-tooltip v-if="column.key === 'label'" :title="entry.name">
                <a-typography-text type="secondary">{{ entry.label }}</a-typography-text>
            </a-tooltip>
            <span v-else class="log-value">
                <a-typography-text :copyable="copyable && entry.value !== '-' ? { text: entry.value } : false" class="field-value">{{ entry.value }}</a-typography-text>
                <slot name="valueActions" :entry="entry" />
            </span>
        </template>
    </a-table>
</template>
<script setup lang="ts">
defineProps<{ entries: { key?: string; name?: string; label: string; value: string }[]; copyable?: boolean }>();
const columns = [{ key: 'label', dataIndex: 'label', width: 140 }, { key: 'value', dataIndex: 'value' }];
</script>
<style scoped>
.log-fields-table :deep(.ant-table-cell) { font-size: var(--fs-12); vertical-align: top; overflow-wrap: anywhere; }
.log-fields-table :deep(.ant-table-tbody > tr:last-child > td) { border-bottom: 0; }
.field-value { font-family: var(--font-mono, monospace); white-space: pre-wrap; }
</style>
