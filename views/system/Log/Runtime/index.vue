<template>
    <section class="runtime-log-page">
      <header class="runtime-log-page__header">
        <div>
          <h1>{{ $t('runtimeLog.title') }}</h1>
          <p>{{ $t('runtimeLog.description') }}</p>
        </div>
        <a-button :loading="loading" :disabled="downloading" @click="refreshResources">
          <template #icon><AIcon type="ReloadOutlined" /></template>
          {{ $t('runtimeLog.refreshResources') }}
        </a-button>
      </header>

      <a-alert v-if="error || streamError" type="error" show-icon :message="error || streamError" />
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
      </a-form>

      <a-form v-if="canRead || canSubscribe" layout="vertical" class="runtime-log-page__filters" @finish="query">
        <a-form-item v-if="canRead && !canSubscribe" :label="$t('runtimeLog.lineCount')"
          :validate-status="validLineCount ? '' : 'error'"
          :help="validLineCount ? undefined : $t('runtimeLog.invalidLineCount')">
          <a-input-number v-model:value="lineCount" :min="1" :max="5000" :step="1" :precision="0"
            style="width: 100%" />
        </a-form-item>
        <a-form-item v-if="supportsFilter('keyword')" :label="$t('runtimeLog.keyword')">
          <a-input v-model:value="keyword" allow-clear :placeholder="$t('runtimeLog.keywordHint')" />
        </a-form-item>
        <a-form-item v-if="supportsFilter('levels')" :label="$t('runtimeLog.levels')">
          <a-select v-model:value="levels" mode="multiple" allow-clear :options="levelOptions"
            :placeholder="$t('runtimeLog.allLevels')" />
        </a-form-item>
        <a-form-item v-if="supportsFilter('regex')" :label="$t('runtimeLog.regex')">
          <a-input v-model:value="regex" allow-clear :placeholder="$t('runtimeLog.regexHint')" />
        </a-form-item>
        <a-form-item class="runtime-log-page__query">
          <a-button type="primary" html-type="button" :loading="reading" @click="query"
            :disabled="!canSubscribe && !validLineCount">
            {{ $t(canSubscribe ? 'runtimeLog.applyFilter' : 'runtimeLog.query') }}
          </a-button>
        </a-form-item>
      </a-form>

      <template v-if="resource">
        <div class="runtime-log-page__toolbar">
          <span class="runtime-log-page__filename" :title="resource.displayName || resource.name">
            {{ resource.displayName || resource.name }}
          </span>
          <a-space wrap>
            <a-tag v-if="canSubscribe" :color="streamActive ? 'processing' : 'default'">
              {{ $t(`runtimeLog.state.${streamState}`) }}
            </a-tag>
            <a-button v-if="canSubscribe && streamActive" @click="stopStream">{{ $t('runtimeLog.stop') }}</a-button>
            <a-button v-else-if="canSubscribe" type="primary" @click="query">{{ $t('runtimeLog.start') }}</a-button>
            <span v-if="hasRead" class="runtime-log-page__count">{{ $t('runtimeLog.resultCount', { count: lines.length }) }}</span>
            <j-permission-button v-if="canDownload" hasPermission="system/Log/Runtime:export"
              :loading="downloading" @click="download">
              <AIcon type="DownloadOutlined" />{{ $t('runtimeLog.download') }}
            </j-permission-button>
          </a-space>
        </div>
        <template v-if="canSubscribe">
          <p class="runtime-log-page__hint">{{ $t('runtimeLog.liveHint') }}</p>
          <RuntimeLiveLogViewer :entries="liveEntries" />
        </template>
        <template v-else-if="canRead">
          <p class="runtime-log-page__hint">{{ $t('runtimeLog.windowHint') }}</p>
          <a-spin :spinning="reading" class="runtime-log-page__viewer">
            <pre v-if="hasRead && lines.length" ref="contentRef" class="runtime-log-page__content"
              tabindex="0" :aria-label="$t('runtimeLog.content')">{{ text }}</pre>
            <a-empty v-else class="runtime-log-page__empty"
              :description="reading ? $t('runtimeLog.reading') : hasRead ? $t('runtimeLog.noMatches') : $t('runtimeLog.queryHint')" />
          </a-spin>
        </template>
        <a-empty v-else class="runtime-log-page__empty"
          :description="resource.compressed ? $t('runtimeLog.archiveOnly') : $t('runtimeLog.noRead')" />
      </template>
      <a-spin v-else :spinning="loading">
        <a-empty class="runtime-log-page__empty" :description="loading ? $t('runtimeLog.loading') : $t('runtimeLog.noResources')" />
      </a-spin>
    </section>
</template>

<script setup lang="ts" name="RuntimeLog">
import { nextTick, ref, watch } from 'vue'
import RuntimeLiveLogViewer from './RuntimeLiveLogViewer.vue'
import { useRuntimeLog } from './useRuntimeLog'

const {
  nodeId, providerId, resourceId, nodeOptions, providerOptions, resourceOptions,
  loading, nodeLoading, providerLoading, resourceLoading, reading, downloading, error,
  resource, canRead, canSubscribe, canDownload, supportsFilter, lineCount, validLineCount,
  keyword, levels, regex, lines, text, hasRead, query, download,
  liveEntries, streamState, streamError, streamActive, stopStream, refreshResources,
} = useRuntimeLog()
const contentRef = ref<HTMLElement>()
const levelOptions = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'].map(value => ({ value, label: value }))

// 文件响应保持物理行顺序；定位到末尾即本次窗口中最新的日志。
watch(lines, async () => {
  await nextTick()
  if (contentRef.value) contentRef.value.scrollTop = contentRef.value.scrollHeight
})
</script>

<style scoped lang="less">
.runtime-log-page {
  min-height: 100%;
}
.runtime-log-page__header, .runtime-log-page__toolbar {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.runtime-log-page__header { margin-bottom: 20px; }
.runtime-log-page__header h1 { margin: 0; color: var(--ink-1); font-size: var(--fs-20); font-weight: 600; }
.runtime-log-page__header p { margin: 8px 0 0; color: var(--ink-3); font-size: var(--fs-13); }
.runtime-log-page__selectors, .runtime-log-page__filters {
  display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; margin-bottom: 16px;
}
.runtime-log-page__selectors :deep(.ant-form-item) { flex: 1 1 180px; min-width: 0; margin-bottom: 0; }
.runtime-log-page__selectors .runtime-log-page__resource { flex: 2 1 260px; }
.runtime-log-page__filters :deep(.ant-form-item) { flex: 1 1 200px; min-width: 0; margin-bottom: 0; }
.runtime-log-page__filters .runtime-log-page__query { flex: 0 0 auto; padding-top: 30px; }
.runtime-log-page__toolbar { margin: 20px 0 12px; align-items: center; }
.runtime-log-page__filename { overflow-wrap: anywhere; font-weight: 500; }
.runtime-log-page__hint, .runtime-log-page__count { color: var(--ink-3); font-size: var(--fs-12); }
.runtime-log-page__viewer { min-width: 0; }
.runtime-log-page__content {
  margin: 0; padding: 16px; height: 480px; max-height: 65vh; overflow: auto;
  background: #141414; color: #e8e8e8; border-radius: 6px;
  font-family: Consolas, monospace; font-size: 13px; line-height: 1.7; white-space: pre;
}
.runtime-log-page__empty { margin: 80px 0; }
</style>
