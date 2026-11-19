<template>
  <a-button
    type="text" class="document-center-entry"
    :aria-expanded="open" aria-haspopup="dialog"
    @click="setOpen(!open)"
  >
    <template #icon><AIcon type="ReadOutlined" /></template>
    {{ t('DocumentCenter.entry') }}
  </a-button>
  <Teleport to="body">
    <JlDrawerShell
      :open="open" :width="480" :title="t('DocumentCenter.title')"
      :get-container="false" :root-style="{ position: 'fixed' }"
      :mask="false" :push="false" :autofocus="false" destroy-on-close
      :content-wrapper-style="windowStyle" class="document-center-window"
      @update:open="setOpen"
    >
      <CloudEmpty v-if="!url" :description="t(`DocumentCenter.${unavailable}`)" />
      <div v-else-if="failed" class="document-center-feedback">
        <a-alert type="warning" show-icon :message="t('DocumentCenter.loadFailed')" />
        <a-button @click="reload">{{ t('DocumentCenter.retry') }}</a-button>
      </div>
      <div v-else class="document-center-content">
        <div v-if="loading" class="document-center-loading" role="status">
          <a-spin :tip="t('DocumentCenter.loading')" />
        </div>
        <iframe
          v-if="open" :key="frameKey" :src="frameUrl" :title="t('DocumentCenter.title')"
          class="document-center-frame" referrerpolicy="no-referrer"
          @load="onLoad" @error="onError"
        />
      </div>
      <template #foot>
        <a v-if="url" :href="url" target="_blank" rel="noopener noreferrer">
          {{ t('DocumentCenter.openCenter') }} <AIcon type="ExportOutlined" />
        </a>
      </template>
    </JlDrawerShell>
  </Teleport>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import JlDrawerShell from '@jetlinks-web-core/components/JlDrawerShell/index.vue'
import CloudEmpty from '@jetlinks-web-core/components/CloudEmpty/index.vue'
import { useDocumentCenter } from './useDocumentCenter'

const { t } = useI18n()
const { open, loading, failed, frameKey, url, frameUrl, unavailable, setOpen, reload, onLoad, onError } = useDocumentCenter()
// 浮窗为阅读容器，保留平台顶栏和背景页面的操作空间。
const windowStyle: CSSProperties = {
  top: 'max(72px, 20vh)',
  right: 'var(--space-4)',
  bottom: 'var(--space-4)',
  height: 'auto',
  borderRadius: 'var(--r-3)',
  overflow: 'hidden',
}
</script>

<style scoped lang="less">
.document-center-entry { color: inherit; }
/* 抽屉通过 Teleport 挂载，覆盖仅限本浮窗的公共壳层。 */
:global(.document-center-window .drawer-head) { background: var(--bg); }
:global(.document-center-window .drawer-body) { padding: 0; overflow: hidden; }
:global(.document-center-window .drawer-foot) { justify-content: flex-start; }
.document-center-content { position: relative; flex: 1; min-height: 0; }
.document-center-frame { display: block; width: 100%; height: 100%; border: 0; }
.document-center-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--bg);
  pointer-events: none;
}
.document-center-feedback { padding: var(--space-4); display: grid; gap: var(--space-4); }
</style>
