<template>
    <div class="access-log-cell">
        <template v-if="kind === 'source'">
            <a-tooltip :title="summary.ip">
                <div class="primary-line mono ellipsis">{{ summary.primaryIp }}</div>
            </a-tooltip>
            <div class="secondary-line ellipsis" :title="summary.region">
                {{ summary.region === '-' ? $t(`Access.source.${summary.sourceKind}`) : summary.region }}
            </div>
        </template>
        <template v-else-if="kind === 'request'">
            <div class="request-line primary-line log-value">
                <a-tag class="http-method">{{ summary.httpMethod }}</a-tag>
                <a-typography-link
                    role="button" tabindex="0" :draggable="false" class="request-path mono ellipsis" :title="summary.url"
                    :aria-label="$t('Access.detail.viewRequest', { request: `${summary.httpMethod} ${summary.url}` })"
                    @click.prevent.stop="$emit('view', $event)"
                    @keydown.enter.prevent.stop="$emit('view', $event)"
                >{{ summary.url }}</a-typography-link>
                <LogValueActions
                    v-if="record.url?.trim()" :copy-text="record.url" :search-label="$t('Access.quickSearch.url')" @search="searchUrl"
                />
            </div>
            <div class="secondary-line request-meta">
                <HttpStatusBadge :value="record.responseStatus" />
                <span>{{ summary.time }}</span>
                <span class="duration"><AIcon type="ClockCircleOutlined" /> {{ summary.duration }}</span>
            </div>
        </template>
        <template v-else>
            <div class="primary-line operation-line">
                <span class="ellipsis" :title="summary.action">{{ summary.action }}</span>
                <a-tag v-if="summary.username !== '-'" class="username" :title="summary.username">
                    <AIcon type="UserOutlined" /> {{ summary.username }}
                </a-tag>
            </div>
            <div class="secondary-line mono ellipsis" :title="summary.fullHandler">{{ summary.handler }}</div>
        </template>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAccessLogSummary, type AccessLogRecord } from '../accessLogPresentation';
import HttpStatusBadge from './HttpStatusBadge.vue';
import LogValueActions from '../../components/LogValueActions.vue';
import type { AccessLogQuickSearch } from '../useAccessLog';
const props = defineProps<{ record: AccessLogRecord; kind: 'source' | 'request' | 'operation' }>();
const emit = defineEmits<{
    (event: 'view', inputEvent: MouseEvent | KeyboardEvent): void;
    (event: 'search', value: AccessLogQuickSearch): void;
}>();
const { t: $t } = useI18n();
const summary = computed(() => getAccessLogSummary(props.record));
const searchUrl = () => {
    if (props.record.url?.trim()) emit('search', { column: 'url', value: props.record.url });
};
</script>
<style scoped>
.access-log-cell { min-width: 0; }
.primary-line { min-height: 1.5rem; color: var(--ink-1); }
.secondary-line { margin-top: 0.375rem; color: var(--ink-3); font-size: var(--fs-12); }
.mono { font-family: var(--font-mono, monospace); }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.request-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}
.request-path { min-width: 0; flex: 0 1 auto; user-select: text; }
.http-method { flex-shrink: 0; margin: 0; font-family: var(--font-mono, monospace); font-weight: 600; }
.request-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem 0.625rem; }
.duration { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
.operation-line { display: flex; align-items: center; gap: 0.5rem; }
.operation-line > .ellipsis { min-width: 0; }
.username { flex-shrink: 0; max-width: 8rem; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
