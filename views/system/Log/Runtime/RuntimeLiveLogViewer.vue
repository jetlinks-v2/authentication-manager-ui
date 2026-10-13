<template>
  <div class="live-log">
    <a-space class="live-log__actions" wrap>
      <span>{{ $t('runtimeLog.eventCount', { count: entries.length }) }}</span>
      <a-switch :checked="following" @change="toggleFollow" />
      <span>{{ $t('runtimeLog.follow') }}</span>
      <a-button v-if="!following" size="small" @click="backToBottom">
        {{ $t('runtimeLog.backToBottom', { count: pending }) }}
      </a-button>
    </a-space>
    <a-alert v-if="trimmed" type="info" show-icon :message="$t('runtimeLog.bufferTrimmed')" />
    <div ref="viewer" class="live-log__content" tabindex="0" :aria-label="$t('runtimeLog.content')" @scroll="onScroll">
      <pre v-for="entry in entries" :key="entry.id" :data-entry="entry.id">{{ entry.text }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { RuntimeLiveLogEntry } from './runtimeLogEvent'

const props = defineProps<{ entries: RuntimeLiveLogEntry[] }>()
const viewer = ref<HTMLElement>()
const following = ref(true)
const pending = ref(0)
const trimmed = ref(false)
let updating = false

const backToBottom = () => {
  following.value = true
  pending.value = 0
  trimmed.value = false
  if (viewer.value) viewer.value.scrollTop = viewer.value.scrollHeight
}
const toggleFollow = (enabled: boolean | string | number) => {
  if (enabled) backToBottom()
  else following.value = false
}
const onScroll = () => {
  if (updating || !viewer.value) return
  const el = viewer.value
  following.value = el.scrollHeight - el.scrollTop - el.clientHeight < 8
  if (following.value) pending.value = 0
}

watch(() => props.entries, async (entries, previous) => {
  const el = viewer.value
  if (!el) return
  updating = true
  if (!entries.length) {
    following.value = true
    pending.value = 0
    trimmed.value = false
  }
  const lastId = previous[previous.length - 1]?.id || 0
  if (!following.value) pending.value += entries.filter(entry => entry.id > lastId).length
  const anchor = Array.from(el.querySelectorAll<HTMLElement>('[data-entry]'))
    .find(item => item.getBoundingClientRect().bottom > el.getBoundingClientRect().top)
  const anchorId = anchor?.dataset.entry
  const offset = anchor ? anchor.getBoundingClientRect().top - el.getBoundingClientRect().top : 0
  await nextTick()
  if (!viewer.value) return
  if (following.value) backToBottom()
  else if (anchorId) {
    const target = el.querySelector<HTMLElement>(`[data-entry="${anchorId}"]`)
    if (target) el.scrollTop += target.getBoundingClientRect().top - el.getBoundingClientRect().top - offset
    else {
      el.scrollTop = 0
      trimmed.value = true
    }
  }
  updating = false
})
onMounted(backToBottom)
</script>

<style scoped lang="less">
.live-log { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.live-log__actions { color: rgba(0, 0, 0, .65); font-size: 12px; }
.live-log__content {
  height: 480px; max-height: 65vh; overflow: auto; overflow-anchor: none;
  padding: 16px; background: #141414; color: #e8e8e8; border-radius: 6px;
}
.live-log__content pre { margin: 0 0 8px; font: 13px/1.7 Consolas, monospace; white-space: pre; tab-size: 4; }
</style>
