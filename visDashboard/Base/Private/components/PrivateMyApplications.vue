<template>
  <PrivatePanel :title="t('privateApplication.title')" :state="{ loading: state.loading, error: state.error, empty: !entries.length }" @retry="$emit('retry')">
    <template v-if="display.showAll !== false" #extra>
      <HomeWidgetLink @click="$emit('all')">{{ t('packages.ProjectHome.saasApplicationsMore') }}</HomeWidgetLink>
    </template>
    <template #empty><CloudEmpty :description="t('privateApplication.empty')" :image-style="{ height: '48px' }" /></template>
    <div class="private-my-apps" :style="{ '--application-columns': columns }">
      <button
        v-for="entry in displayEntries"
        :key="entry.id"
        type="button"
        class="private-my-app"
        :disabled="entry.disabled || !!state.openingId"
        :aria-busy="state.openingId === entry.id"
        @click="$emit('open', entry.id)"
      >
        <span class="private-my-app__icon">
          <a-spin v-if="state.openingId === entry.id" size="small" />
          <CardAvatar v-else :avatar="entry.avatar" />
        </span>
        <span class="private-my-app__body">
          <strong class="private-my-app__title" :title="entry.name">{{ entry.name }}</strong>
          <span class="private-my-app__desc" :title="entry.description || t('packages.ProjectHome.appNoDescription')">
            {{ entry.description || t('packages.ProjectHome.appNoDescription') }}
          </span>
        </span>
        <span class="private-my-app__action">
          <span>{{ t(entry.disabled ? 'packages.ProjectHome.appDisabled' : 'packages.ProjectHome.appEnter') }}</span>
          <RightOutlined class="private-my-app__arrow" />
        </span>
      </button>
    </div>
  </PrivatePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import CardAvatar from '@jetlinks-web-core/components/CardBox/CardAvatar.vue'
import CloudEmpty from '@jetlinks-web-core/components/CloudEmpty/index.vue'
import PrivatePanel from './PrivatePanel.vue'
import HomeWidgetLink from '../../shared/HomeWidgetLink.vue'
import type { PrivateApplicationEntry } from '../types'

const props = withDefaults(defineProps<{ entries: PrivateApplicationEntry[]; state: { loading: boolean; error: boolean; openingId?: string }; display?: { limit?: number; showAll?: boolean } }>(), { display: () => ({}) })
defineEmits<{ open: [id: string]; retry: []; all: [] }>()
const { t } = useI18n()
// 普通卡片保留两项摘要；仅应用工作台展示当前账号的完整授权名单。
const displayEntries = computed(() => (props.display.limit ?? 2) > 0 ? props.entries.slice(0, props.display.limit ?? 2) : props.entries)
const columns = computed(() => {
  const count = displayEntries.value.length
  return count > 0 && count % 3 === 0 ? 3 : Math.min(count || 1, 2)
})
</script>

<style scoped>
.private-my-apps {
  display: grid;
  grid-template-columns: repeat(var(--application-columns, 2), minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}
.private-my-app {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  min-height: 160px;
  padding: 20px;
  border: 1px solid #ebedf0;
  border-radius: var(--r-3, 8px);
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.private-my-app:hover:not(:disabled) {
  border-color: var(--business-component-primary, #1677ff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
.private-my-app:hover:not(:disabled) .private-my-app__arrow {
  transform: translateX(3px);
}
.private-my-app:focus-visible {
  outline: 2px solid var(--business-component-primary, #1677ff);
  outline-offset: 2px;
}
.private-my-app:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.private-my-app__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  margin-bottom: 14px;
}
.private-my-app__icon :deep(.card-avatar) {
  width: 40px;
  height: 40px;
  line-height: 40px;
  border-radius: var(--r-3, 8px);
  border: none;
  background: var(--business-component-primary, #1677ff);
  color: #ffffff;
  font-size: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(22, 119, 255, 0.16);
}
.private-my-app__icon :deep(.card-avatar img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--r-3, 8px);
}
.private-my-app__icon :deep(.anticon) {
  color: #ffffff;
  font-size: 20px;
}
.private-my-app__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
  margin-bottom: 16px;
}
.private-my-app__title {
  color: var(--business-component-text, #1d2129);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.private-my-app__desc {
  color: var(--business-component-muted, #86909c);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
  min-height: 18px;
}
.private-my-app__action {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--business-component-primary, #1677ff);
  font-size: 13px;
  line-height: 20px;
  font-weight: 400;
}
.private-my-app__arrow {
  font-size: 11px;
  transition: transform 0.2s ease;
}
@container (max-width: 520px) {
  .private-my-apps {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
