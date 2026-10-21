<template>
  <section class="runtime-log-page" :class="{ 'runtime-log-page--embedded': embedded }">
    <header v-if="!embedded" class="runtime-log-page__header">
      <h1>{{ $t('runtimeLog.title') }}</h1>
      <p>{{ $t('runtimeLog.description') }}</p>
    </header>

    <a-alert v-if="error || streamError" type="error" show-icon :message="error || streamError" />

    <div class="runtime-log-page__controls">
      <a-form layout="vertical" class="runtime-log-page__selectors">
        <a-form-item :label="$t('runtimeLog.node')">
          <a-select v-model:value="nodeId" :options="nodeOptions" :loading="nodeLoading"
            :disabled="nodeLoading || downloading" :placeholder="$t('runtimeLog.selectNode')" />
        </a-form-item>
        <a-form-item :label="$t('runtimeLog.provider')">
          <a-select v-model:value="providerId" :options="providerOptions" :loading="providerLoading"
            :disabled="!nodeId || providerLoading || downloading" :placeholder="$t('runtimeLog.selectProvider')" />
        </a-form-item>
        <a-form-item :label="$t('runtimeLog.resource')" class="runtime-log-page__resource">
          <a-select v-model:value="resourceId" :options="resourceOptions" :loading="resourceLoading"
            :disabled="!providerId || resourceLoading || downloading" :placeholder="$t('runtimeLog.selectResource')" />
        </a-form-item>
        <a-button class="runtime-log-page__refresh" :loading="loading" :disabled="downloading" @click="refreshResources">
          <template #icon><AIcon type="ReloadOutlined" /></template>
          {{ $t('runtimeLog.refreshResources') }}
        </a-button>
      </a-form>

      <!-- 条件由 useRuntimeLog 管理；无 model 的 Form 不会触发 finish，直接处理 submit。 -->
      <a-form v-if="canRead || canSubscribe" layout="vertical" class="runtime-log-page__filters" @submit="query">
        <a-form-item v-if="canRead && !canSubscribe" :label="$t('runtimeLog.lineCount')" class="runtime-log-page__line-count"
          :validate-status="validLineCount ? '' : 'error'"
          :help="validLineCount ? undefined : $t('runtimeLog.invalidLineCount')">
          <a-input-number v-model:value="lineCount" :min="1" :max="5000" :step="1" :precision="0" />
        </a-form-item>
        <a-form-item v-if="supportsFilter('keyword')" :label="$t('runtimeLog.keyword')">
          <a-input v-model:value="keyword" allow-clear :placeholder="$t('runtimeLog.keywordHint')">
            <template #prefix><AIcon class="runtime-log-page__input-icon" type="SearchOutlined" /></template>
          </a-input>
        </a-form-item>
        <a-form-item v-if="supportsFilter('levels')" :label="$t('runtimeLog.levels')" class="runtime-log-page__levels">
          <a-select v-model:value="levels" mode="multiple" allow-clear :options="levelOptions"
            :placeholder="$t('runtimeLog.allLevels')" />
        </a-form-item>
        <a-form-item v-if="supportsFilter('regex')" :label="$t('runtimeLog.regex')" class="runtime-log-page__regex">
          <a-input v-model:value="regex" allow-clear :placeholder="$t('runtimeLog.regexHint')" />
        </a-form-item>
        <a-form-item class="runtime-log-page__query">
          <a-button type="primary" html-type="submit" :loading="reading"
            :disabled="!canSubscribe && !validLineCount">
            <template #icon><AIcon type="SearchOutlined" /></template>
            {{ $t(canSubscribe ? 'runtimeLog.applyFilter' : 'runtimeLog.query') }}
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <div class="runtime-log-page__console" :class="{ 'runtime-log-page__console--wrap': wrapLines }">
      <div class="runtime-log-page__toolbar">
        <div class="runtime-log-page__identity">
          <span class="runtime-log-page__file-icon"><AIcon :type="canSubscribe ? 'CodeOutlined' : 'FileTextOutlined'" /></span>
          <span class="runtime-log-page__filename" :title="resource?.displayName || resource?.name">
            {{ resource?.displayName || resource?.name || $t('runtimeLog.content') }}
          </span>
          <span v-if="hasRead" class="runtime-log-page__count">{{ $t('runtimeLog.resultCount', { count: lines.length }) }}</span>
          <a-tag v-if="canSubscribe" :color="streamActive ? 'processing' : 'default'">
            {{ $t(`runtimeLog.state.${streamState}`) }}
          </a-tag>
        </div>
        <a-space class="runtime-log-page__actions" :size="8" wrap>
          <a-tooltip :title="$t('runtimeLog.wrap')">
            <a-button type="text" :aria-label="$t('runtimeLog.wrap')" :aria-pressed="wrapLines"
              :class="{ 'runtime-log-page__wrap-active': wrapLines }" @click="wrapLines = !wrapLines">
              <template #icon><AIcon type="AlignLeftOutlined" /></template>
            </a-button>
          </a-tooltip>
          <a-button v-if="canSubscribe && streamActive" size="small" @click="stopStream">
            <template #icon><AIcon type="PauseOutlined" /></template>{{ $t('runtimeLog.stop') }}
          </a-button>
          <a-button v-else-if="canSubscribe" size="small" type="primary" @click="query">
            <template #icon><AIcon type="CaretRightOutlined" /></template>{{ $t('runtimeLog.start') }}
          </a-button>
          <j-permission-button v-if="canDownload" :hasPermission="downloadPermission" size="small"
            :loading="downloading" @click="download">
            <template #icon><AIcon type="DownloadOutlined" /></template>{{ $t('runtimeLog.download') }}
          </j-permission-button>
        </a-space>
      </div>

      <RuntimeLiveLogViewer v-if="canSubscribe" :entries="liveEntries" :wrap-lines="wrapLines" />
      <div v-else class="runtime-log-page__viewer">
        <a-spin :spinning="resource ? reading : loading">
          <pre v-if="canRead && hasRead && lines.length" ref="contentRef" class="runtime-log-page__content"
            tabindex="0" :aria-label="$t('runtimeLog.content')">{{ text }}</pre>
          <div v-else class="runtime-log-page__empty">
            <CloudEmpty :description="!resource ? loading ? $t('runtimeLog.loading') : $t('runtimeLog.noResources')
              : canRead ? reading ? $t('runtimeLog.reading') : hasRead ? $t('runtimeLog.noMatches') : $t('runtimeLog.queryHint')
              : resource.compressed ? $t('runtimeLog.archiveOnly') : $t('runtimeLog.noRead')" />
          </div>
        </a-spin>
      </div>

      <footer class="runtime-log-page__footer">
        <AIcon type="InfoCircleOutlined" />
        <span>{{ $t(canSubscribe ? 'runtimeLog.liveHint' : 'runtimeLog.windowHint') }}</span>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts" name="RuntimeLogPanel">
import { nextTick, ref, watch, type PropType } from 'vue'
import RuntimeLiveLogViewer from './RuntimeLiveLogViewer.vue'
import { useRuntimeLog } from './useRuntimeLog'

defineProps({
  embedded: { type: Boolean, default: false },
  downloadPermission: { type: [String, Array] as PropType<string | string[]>, default: 'system/Log/Runtime:export' },
})

const {
  nodeId, providerId, resourceId, nodeOptions, providerOptions, resourceOptions,
  loading, nodeLoading, providerLoading, resourceLoading, reading, downloading, error,
  resource, canRead, canSubscribe, canDownload, supportsFilter, lineCount, validLineCount,
  keyword, levels, regex, lines, text, hasRead, query, download,
  liveEntries, streamState, streamError, streamActive, stopStream, refreshResources,
} = useRuntimeLog()
const contentRef = ref<HTMLElement>()
const wrapLines = ref(false)
const levelOptions = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'].map(value => ({ value, label: value }))

// 文件响应保持物理行顺序；定位到末尾即本次窗口中最新的日志。
watch(lines, async () => {
  await nextTick()
  if (contentRef.value) contentRef.value.scrollTop = contentRef.value.scrollHeight
})
</script>

<style scoped lang="less">
.runtime-log-page {
  --log-bg: #101823;
  --log-line: #253142;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 520px;
  height: 100%;
  container-type: inline-size;
}
.runtime-log-page--embedded { min-height: 420px; }
.runtime-log-page__header h1 { margin: 0; color: var(--ink-1); font-size: var(--fs-20); font-weight: 600; }
.runtime-log-page__header p { margin: 6px 0 0; color: var(--ink-3); font-size: var(--fs-13); }
.runtime-log-page__controls {
  flex: none;
  padding: 12px 16px;
  border: 1px solid var(--line, #e6eaf0);
  border-radius: var(--r-3, 10px);
  background: var(--bg, #fff);
}
.runtime-log-page__selectors {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(160px, 1fr) minmax(180px, 1.5fr) auto;
  align-items: end;
  gap: 12px;
}
.runtime-log-page__controls :deep(.ant-form-item) { min-width: 0; margin-bottom: 0; }
.runtime-log-page__controls :deep(.ant-form-item-label) { padding-bottom: 6px; }
.runtime-log-page__controls :deep(.ant-form-item-label > label) { color: var(--ink-2, #526078); font-size: 12px; }
.runtime-log-page__selectors :deep(.ant-form-item-row) { flex-direction: row; align-items: center; }
.runtime-log-page__selectors :deep(.ant-form-item-label) { flex: none; padding: 0 10px 0 0; }
.runtime-log-page__selectors :deep(.ant-form-item-control) { flex: 1; min-width: 0; }
.runtime-log-page__controls :deep(.ant-select),
.runtime-log-page__controls :deep(.ant-input-number) { width: 100%; }
.runtime-log-page__refresh { align-self: end; white-space: nowrap; }
.runtime-log-page__filters {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line, #e6eaf0);
}
.runtime-log-page__filters :deep(.ant-form-item) { flex: 1 1 180px; }
.runtime-log-page__filters .runtime-log-page__line-count { flex: 0 0 142px; }
.runtime-log-page__filters .runtime-log-page__levels { flex: 0.8 1 160px; }
.runtime-log-page__filters .runtime-log-page__regex { flex: 1.2 1 200px; }
.runtime-log-page__filters .runtime-log-page__query { flex: 0 0 auto; padding-top: 25px; }
.runtime-log-page__query :deep(.ant-btn) { min-width: 88px; }
.runtime-log-page__input-icon { color: var(--ink-3, #8792a2); margin-right: 3px; }
.runtime-log-page__console {
  display: flex;
  flex: 1 0 240px;
  flex-direction: column;
  min-height: 240px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--log-line);
  border-radius: var(--r-3, 10px);
  background: var(--log-bg);
}
.runtime-log-page__console > * { border-radius: 0; }
.runtime-log-page__toolbar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--log-line);
  background: var(--log-bg);
}
.runtime-log-page__identity { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.runtime-log-page__file-icon { color: #87b5ff; font-size: 16px; line-height: 1; }
.runtime-log-page__filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #dbe5f2; font-size: 13px; font-weight: 600; }
.runtime-log-page__count { flex: none; padding: 2px 8px; border-radius: 4px; background: #223044; color: #a5b5ca; font-size: 12px; }
.runtime-log-page__identity :deep(.ant-tag) { flex: none; margin-inline-end: 0; }
.runtime-log-page__actions { flex: none; }
.runtime-log-page__actions :deep(.ant-btn-text),
.runtime-log-page__actions :deep(.ant-btn-default) { color: #c7d3e3; background: transparent; }
.runtime-log-page__actions :deep(.ant-btn-default) { border-color: #3a485d; box-shadow: none; }
.runtime-log-page__actions :deep(.ant-btn:not(.ant-btn-primary):hover),
.runtime-log-page__actions :deep(.ant-btn.runtime-log-page__wrap-active) { color: #93bdff; background: #223044; }
.runtime-log-page__viewer { display: flex; flex: 1; min-height: 0; min-width: 0; }
.runtime-log-page__viewer :deep(.ant-spin-nested-loading) { display: flex; flex: 1; min-height: 0; min-width: 0; }
.runtime-log-page__viewer :deep(.ant-spin-container) { display: flex; flex: 1; min-height: 0; min-width: 0; height: 100%; }
.runtime-log-page__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  margin: 0;
  border-radius: 0;
  background: var(--log-bg);
  padding: 18px 20px;
  overflow: auto;
  color: #ced8e5;
  font: 13px/1.85 'Cascadia Code', Consolas, 'SFMono-Regular', monospace;
  white-space: pre;
  tab-size: 4;
  scrollbar-width: thin;
  scrollbar-color: #465366 transparent;
}
.runtime-log-page__console--wrap .runtime-log-page__content { white-space: pre-wrap; overflow-wrap: anywhere; }
.runtime-log-page__empty { display: grid; flex: 1; min-height: 180px; place-items: center; }
.runtime-log-page__empty :deep(.ant-empty-description) { color: #8b9bb0; }
.runtime-log-page__footer {
  display: flex;
  flex: none;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-top: 1px solid var(--log-line);
  color: #8e9cb0;
  background: var(--log-bg);
  font-size: 12px;
  line-height: 1.5;
}
@container (max-width: 800px) {
  .runtime-log-page__selectors { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; }
  .runtime-log-page__selectors .runtime-log-page__resource { grid-column: 1 / 3; }
  .runtime-log-page__refresh { grid-column: 3; grid-row: 2; }
  .runtime-log-page__filters :deep(.ant-form-item),
  .runtime-log-page__filters .runtime-log-page__line-count,
  .runtime-log-page__filters .runtime-log-page__levels,
  .runtime-log-page__filters .runtime-log-page__regex { flex: 1 1 40%; }
  .runtime-log-page__filters .runtime-log-page__query { flex: 0 0 auto; padding-top: 0; align-self: flex-end; }
  .runtime-log-page__toolbar { padding: 10px 12px; }
  .runtime-log-page__selectors :deep(.ant-form-item-row) { flex-direction: column; align-items: stretch; }
  .runtime-log-page__selectors :deep(.ant-form-item-label) { padding: 0 0 6px; }
}
</style>
