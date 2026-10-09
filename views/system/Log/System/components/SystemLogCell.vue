<template>
    <div class="system-log-cell">
        <template v-if="kind === 'time'">
            <div class="primary-line mono">{{ summary.time }}</div>
            <div class="secondary-line">{{ summary.date }}</div>
        </template>
        <template v-else-if="kind === 'log'">
            <div class="log-line primary-line">
                <SystemLogLevelBadge :value="record.level" />
                <a-typography-link
                    href="#" :draggable="false" class="log-message" :aria-label="$t('System.detail.viewMessage', { message: summary.message })"
                    @click.prevent.stop="$emit('view', $event)"
                >{{ summary.message }}</a-typography-link>
            </div>
            <a-tooltip v-if="summary.exception" :title="summary.exceptionSummary">
                <div class="secondary-line exception-line">
                    <AIcon type="ExclamationCircleOutlined" />
                    <span class="ellipsis">{{ $t('System.detail.exception') }} · {{ summary.exceptionSummary }}</span>
                </div>
            </a-tooltip>
        </template>
        <template v-else>
            <a-tooltip :title="summary.server === '-' ? $t('System.list.noService') : summary.server">
                <div class="primary-line ellipsis">{{ summary.server === '-' ? $t('System.list.noService') : summary.server }}</div>
            </a-tooltip>
            <a-tooltip :title="summary.location === '-' ? summary.logger : summary.fullLocation">
                <div class="secondary-line mono ellipsis">
                    <template v-if="summary.location === '-'">{{ $t('System.index.112006-2') }}: {{ summary.logger }}</template>
                    <template v-else>{{ summary.location }}</template>
                </div>
            </a-tooltip>
        </template>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSystemLogSummary, type SystemLogRecord } from '../systemLogPresentation';
import SystemLogLevelBadge from './SystemLogLevelBadge.vue';
const props = defineProps<{ record: SystemLogRecord; kind: 'time' | 'log' | 'source' }>();
defineEmits<{ (event: 'view', mouseEvent: MouseEvent): void }>();
const { t: $t } = useI18n();
const summary = computed(() => getSystemLogSummary(props.record));
</script>
<style scoped>
.system-log-cell { min-width: 0; }
.primary-line { min-height: 1.5rem; color: var(--ink-1); }
.secondary-line { margin-top: 0.375rem; color: var(--ink-3); font-size: var(--fs-12); }
.mono { font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-line { display: flex; align-items: flex-start; gap: 0.5rem; }
.log-message { min-width: 0; flex: 1; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; user-select: text; }
.exception-line { display: flex; align-items: center; gap: 0.375rem; }
.exception-line > .anticon { flex-shrink: 0; }
</style>
