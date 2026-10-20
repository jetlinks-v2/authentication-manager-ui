<template>
  <div class="live-log">
    <a-space class="live-log__actions" wrap>
      <span>{{ $t('runtimeLog.eventCount', { count: entries.length }) }}</span>
      <a-switch size="small" :checked="following" :aria-label="$t('runtimeLog.follow')" @change="toggleFollow" />
      <span>{{ $t('runtimeLog.follow') }}</span>
      <a-button v-if="!following" size="small" @click="backToBottom">
        {{ $t('runtimeLog.backToBottom', { count: pending }) }}
      </a-button>
    </a-space>
    <a-alert v-if="trimmed" type="info" show-icon :message="$t('runtimeLog.bufferTrimmed')" />
    <div ref="viewer" class="live-log__content" :class="{ 'live-log__content--wrap': wrapLines }" tabindex="0" :aria-label="$t('runtimeLog.content')" @scroll="onScroll">
      <pre v-for="entry in entries" :key="entry.id" :data-entry="entry.id">{{ entry.text }}</pre>
      <CloudEmpty v-if="!entries.length" :description="$t('runtimeLog.noEvents')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { RuntimeLiveLogEntry } from './runtimeLogEvent'

const props = defineProps<{ entries: RuntimeLiveLogEntry[]; wrapLines?: boolean }>()
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
.live-log { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.live-log__actions { flex: none; padding: 10px 16px; border-bottom: 1px solid #253142; color: #9caec4; font-size: 12px; }
.live-log__content {
  flex: 1; min-height: 0; overflow: auto; overflow-anchor: none;
  padding: 18px 20px; color: #ced8e5; scrollbar-width: thin; scrollbar-color: #465366 transparent;
}
.live-log__content pre { margin: 0 0 12px; font: 13px/1.85 'Cascadia Code', Consolas, 'SFMono-Regular', monospace; white-space: pre; tab-size: 4; }
.live-log__content--wrap pre { white-space: pre-wrap; overflow-wrap: anywhere; }
.live-log__content :deep(.ant-empty) { display: grid; height: 100%; align-content: center; justify-content: center; margin: 0; }
.live-log__content :deep(.ant-empty-description) { color: #8b9bb0; }
</style>
