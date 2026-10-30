<template>
  <ContentPanel fill class="announcement-list-filter-panel">
    <div class="announcement-list-filter">
      <a-input-search
        v-model:value="keyword"
        allow-clear
        class="announcement-list-filter__keyword"
        :placeholder="$t('Announcement.search.keywordPlaceholder')"
        @search="submitFilters"
      />
      <a-select
        v-model:value="state"
        class="announcement-list-filter__state"
        :options="stateOptions"
        @change="submitFilters"
      />
      <a-button @click="resetFilters">
        {{ $t('Announcement.action.reset') }}
      </a-button>
    </div>
  </ContentPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ContentPanel } from '@jetlinks-web-core/components'
import type { AnnouncementState } from '../types'

type StateFilter = 'all' | AnnouncementState

const emit = defineEmits<{
  (event: 'change', filter: { keyword: string; state: StateFilter }): void
}>()

const { t: $t } = useI18n()
const keyword = ref('')
const state = ref<StateFilter>('all')
const stateOptions = computed(() => [
  { value: 'all', label: $t('Announcement.search.allStatus') },
  { value: 'published', label: $t('Announcement.status.published') },
  { value: 'unpublished', label: $t('Announcement.status.unpublished') },
])

function submitFilters() {
  emit('change', { keyword: keyword.value.trim(), state: state.value })
}

function resetFilters() {
  keyword.value = ''
  state.value = 'all'
  submitFilters()
}
</script>

<style scoped lang="less">
.announcement-list-filter-panel {
  overflow: visible;
  flex: 0 0 auto;
}

.announcement-list-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.announcement-list-filter__keyword {
  width: 20rem;
}

.announcement-list-filter__state {
  width: 11rem;
}
</style>
