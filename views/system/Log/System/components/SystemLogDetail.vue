<template>
    <JlDrawerShell
        :open="open" :width="drawerWidth" :title="$t('System.index.112006-0')"
        :mask="false" :push="false" :autofocus="false"
        class="system-log-detail" @update:open="$emit('update:open', $event)"
    >
        <template #head>
            <div class="log-summary">
                <div class="summary-heading">
                    <SystemLogLevelBadge :value="record?.level" />
                    <span class="summary-time"><AIcon type="CalendarOutlined" /> {{ summary.fullTime }}</span>
                </div>
                <div class="summary-meta">
                    <span :title="$t('System.index.112006-5')"><AIcon type="ClusterOutlined" /> {{ summary.server === '-' ? $t('System.list.noService') : summary.server }}</span>
                    <span :title="$t('System.detail.threadName')"><AIcon type="BranchesOutlined" /> {{ summary.thread }}</span>
                </div>
            </div>
        </template>
        <div :key="contentVersion" class="detail-content">
            <a-collapse v-model:activeKey="sectionKeys" ghost class="detail-sections">
                <a-collapse-panel key="message">
                    <template #header><span class="section-title"><AIcon type="FileTextOutlined" /> {{ $t('System.index.112006-4') }}</span></template>
                    <template v-if="summary.message !== '-'" #extra>
                        <span @click.stop><a-typography-text :copyable="{ text: summary.message }" /></span>
                    </template>
                    <CodeBlock v-if="summary.message !== '-'" variant="light" :content="summary.message" />
                    <p v-else class="empty-text">{{ $t('System.detail.noMessage') }}</p>
                </a-collapse-panel>
                <a-collapse-panel v-if="summary.exception" key="exception">
                    <template #header><span class="section-title"><AIcon type="ExceptionOutlined" /> {{ $t('System.detail.exceptionStack') }}</span></template>
                    <template #extra>
                        <span @click.stop><a-typography-text :copyable="{ text: summary.exception }" /></span>
                    </template>
                    <CodeBlock variant="light" :content="summary.exception" :wrap="false" />
                </a-collapse-panel>
                <a-collapse-panel key="context">
                    <template #header>
                        <span class="section-title"><AIcon type="ProfileOutlined" /> {{ $t('System.detail.context') }} <span class="count">{{ visibleContext.length }} / {{ context.length }}</span></span>
                    </template>
                    <template v-if="context.length > commonContext.length" #extra>
                        <a-button type="link" size="small" :aria-expanded="allContext" @click.stop="allContext = !allContext">
                            {{ $t(allContext ? 'System.detail.commonContext' : 'System.detail.allContext') }}
                        </a-button>
                    </template>
                    <LogFieldsTable v-if="visibleContext.length" :entries="visibleContext" copyable />
                    <p v-else class="empty-text">{{ $t(context.length ? 'System.detail.noCommonContext' : 'System.detail.noContext') }}</p>
                </a-collapse-panel>
                <a-collapse-panel key="location">
                    <template #header><span class="section-title"><AIcon type="BranchesOutlined" /> {{ $t('System.detail.location') }}</span></template>
                    <LogFieldsTable :entries="locationFields" copyable />
                </a-collapse-panel>
            </a-collapse>
        </div>
    </JlDrawerShell>
</template>
<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import JlDrawerShell from '@jetlinks-web-core/components/JlDrawerShell/index.vue';
import CodeBlock from '@jetlinks-web-core/components/CodeBlock/index.vue';
import LogFieldsTable from '../../components/LogFieldsTable.vue';
import { useSystemLogDetail } from '../useSystemLogDetail';
import type { SystemLogRecord } from '../systemLogPresentation';
import SystemLogLevelBadge from './SystemLogLevelBadge.vue';
const props = defineProps<{ open: boolean; record?: SystemLogRecord }>();
defineEmits<{ (event: 'update:open', value: boolean): void }>();
const { t: $t } = useI18n();
const { drawerWidth, contentVersion, summary, allContext, context, commonContext, visibleContext, sectionKeys, locationFields } =
    useSystemLogDetail(toRef(props, 'record'), toRef(props, 'open'));
</script>
<style scoped>
.log-summary { min-width: 0; }
.summary-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.summary-time { display: inline-flex; align-items: center; gap: 0.375rem; font-size: var(--fs-12); font-variant-numeric: tabular-nums; }
.summary-meta { display: flex; flex-wrap: wrap; gap: 0.375rem 0.75rem; margin-top: 0.75rem; color: var(--ink-3); font-size: var(--fs-12); overflow-wrap: anywhere; }
.summary-meta span { display: inline-flex; align-items: center; gap: 0.375rem; }
</style>
<style scoped src="../../components/logDetailSections.css"></style>
