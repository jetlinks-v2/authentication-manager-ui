<template>
    <JlDrawerShell
        :open="open" :width="drawerWidth" :title="$t('Access.detail.title')"
        :mask="false" :push="false" :autofocus="false"
        class="access-log-detail" @update:open="$emit('update:open', $event)"
    >
        <template #head>
            <div class="request-summary">
                <div class="request-line log-value">
                    <a-tag class="http-method">{{ summary.httpMethod }}</a-tag>
                    <a-typography-text class="request-path">{{ summary.url }}</a-typography-text>
                    <LogValueActions v-if="record?.url?.trim()" :copy-text="record.url" />
                </div>
                <div class="summary-badges">
                    <HttpStatusBadge :value="record?.responseStatus" />
                    <a-tag class="duration"><AIcon type="ClockCircleOutlined" /> {{ summary.duration }}</a-tag>
                </div>
                <div class="summary-meta">
                    <span :title="$t('Access.index.480752-5')"><AIcon type="CalendarOutlined" /> {{ summary.time }}</span>
                    <span class="log-value" :title="$t('Access.index.480752-13')">
                        <AIcon type="UserOutlined" /> {{ summary.username }}
                        <LogValueActions
                            v-if="usernameSearchValue?.trim()" :search-label="$t('Access.quickSearch.username')"
                            @search="searchSame('username', usernameSearchValue)"
                        />
                    </span>
                    <span :title="$t('Access.list.source')"><AIcon type="GlobalOutlined" /> {{ summary.ip }}</span>
                </div>
                <p class="summary-action">{{ summary.action }}</p>
            </div>
        </template>
        <div :key="contentVersion" class="detail-content">
            <a-collapse v-model:activeKey="sectionKeys" ghost class="detail-sections">
                <a-collapse-panel key="headers">
                    <template #header>
                        <span class="section-title"><AIcon type="ProfileOutlined" /> {{ $t('Access.detail.headers') }} <span class="count">{{ headerFields.length }} / {{ headers.length }}</span></span>
                    </template>
                    <template v-if="headers.length > commonHeaders.length" #extra>
                        <a-button type="link" size="small" :aria-expanded="allHeaders" @click.stop="allHeaders = !allHeaders">
                            {{ $t(allHeaders ? 'Access.detail.commonHeaders' : 'Access.detail.allHeaders') }}
                        </a-button>
                    </template>
                    <LogFieldsTable v-if="headerFields.length" :entries="headerFields" copyable />
                    <p v-else class="empty-text">{{ $t(headers.length ? 'Access.detail.noCommonHeaders' : 'Access.detail.noHeaders') }}</p>
                </a-collapse-panel>
                <a-collapse-panel key="parameters">
                    <template #header><span class="section-title"><AIcon type="CodeOutlined" /> {{ $t('Access.detail.parameters') }}</span></template>
                    <template v-if="parametersPresent" #extra>
                        <a-space :size="4" @click.stop>
                            <a-button
                                v-if="!rawParameters" type="link" size="small" :aria-expanded="expandedParameters"
                                @click="expandedParameters = !expandedParameters"
                            >{{ $t(expandedParameters ? 'Access.detail.collapseAll' : 'Access.detail.expandAll') }}</a-button>
                            <a-button type="link" size="small" @click="rawParameters = !rawParameters">
                                {{ $t(rawParameters ? 'Access.detail.structured' : 'Access.detail.raw') }}
                            </a-button>
                            <a-typography-text :copyable="{ text: parameterText }" />
                        </a-space>
                    </template>
                    <template v-if="parametersPresent">
                        <CodeBlock v-if="rawParameters" variant="light" :content="parameterText" />
                        <JsonViewer
                            v-else :key="String(expandedParameters)" :value="parameters"
                            :expand-depth="expandedParameters ? 100 : 2" class="parameters-tree"
                        />
                    </template>
                    <p v-else class="empty-text">{{ $t('Access.detail.noParameters') }}</p>
                </a-collapse-panel>
                <a-collapse-panel v-if="exception" key="exception">
                    <template #header><span class="section-title"><AIcon type="ExceptionOutlined" /> {{ $t('Access.index.480752-9') }}</span></template>
                    <template #extra><span @click.stop><a-typography-text :copyable="{ text: exception }" /></span></template>
                    <CodeBlock variant="light" :content="exception" :wrap="false" />
                </a-collapse-panel>
                <a-collapse-panel key="location">
                    <template #header><span class="section-title"><AIcon type="BranchesOutlined" /> {{ $t('Access.detail.location') }}</span></template>
                    <LogFieldsTable :entries="locationFields" copyable>
                        <template #valueActions="{ entry }">
                            <LogValueActions
                                v-if="entry.key === 'traceId' && record?.traceId?.trim()" :search-label="$t('Access.quickSearch.traceId')"
                                @search="searchSame('traceId', record?.traceId)"
                            />
                        </template>
                    </LogFieldsTable>
                </a-collapse-panel>
            </a-collapse>
        </div>
    </JlDrawerShell>
</template>
<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { JsonViewer } from 'vue3-json-viewer';
import 'vue3-json-viewer/dist/index.css';
import JlDrawerShell from '@jetlinks-web-core/components/JlDrawerShell/index.vue';
import CodeBlock from '@jetlinks-web-core/components/CodeBlock/index.vue';
import LogFieldsTable from '../../components/LogFieldsTable.vue';
import LogValueActions from '../../components/LogValueActions.vue';
import type { AccessLogRecord } from '../accessLogPresentation';
import type { AccessLogQuickSearch } from '../useAccessLog';
import { useAccessLogDetail } from '../useAccessLogDetail';
import HttpStatusBadge from './HttpStatusBadge.vue';
const props = defineProps<{ open: boolean; record?: AccessLogRecord }>();
const emit = defineEmits<{
    (event: 'update:open', value: boolean): void;
    (event: 'search', value: AccessLogQuickSearch): void;
}>();
const { t: $t } = useI18n();
const { allHeaders, rawParameters, expandedParameters, sectionKeys, contentVersion, drawerWidth,
    summary, usernameSearchValue, headers, commonHeaders, headerFields, parameters, parameterText, parametersPresent, exception, locationFields } =
    useAccessLogDetail(toRef(props, 'record'), toRef(props, 'open'));
const searchSame = (column: AccessLogQuickSearch['column'], value?: string) => {
    if (value?.trim()) emit('search', { column, value });
};
</script>
<style scoped>
.request-summary { min-width: 0; }
.request-line { display: flex; align-items: flex-start; gap: 0.625rem; }
.http-method { flex-shrink: 0; margin: 0; font-family: var(--font-mono, monospace); font-weight: 600; }
.request-path { color: var(--ink-1); font-size: var(--fs-14); font-family: var(--font-mono, monospace); font-weight: 600; overflow-wrap: anywhere; }
.summary-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.duration { display: inline-flex; align-items: center; gap: 0.375rem; margin: 0; }
.summary-meta { display: flex; flex-wrap: wrap; gap: 0.375rem 0.75rem; margin-top: 0.75rem; color: var(--ink-3); font-size: var(--fs-12); overflow-wrap: anywhere; }
.summary-meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
.summary-action { margin: 0.5rem 0 0; color: var(--ink-2); font-size: var(--fs-12); overflow-wrap: anywhere; }
.parameters-tree { overflow-x: auto; }
.parameters-tree :deep(.jv-code) { padding: 0.5rem 0; }
</style>
<style scoped src="../../components/logDetailSections.css"></style>
