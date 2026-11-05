<template>
  <PrivatePanel :title="t('privateApplication.account')">
    <template #extra>
      <HomeWidgetLink @click="$emit('account')">{{ t('components.LayoutSidebarUser.accountCenter') }}</HomeWidgetLink>
    </template>
    <div class="private-account">
      <div class="private-account__identity">
        <a-avatar :size="48" :src="profile.avatar" class="private-account__avatar">
          {{ profile.name.slice(0, 1) }}
        </a-avatar>
        <div class="private-account__info">
          <strong class="private-account__name" :title="profile.name">{{ profile.name }}</strong>
          <div class="private-account__sub">
            <span class="private-account__username" :title="profile.username">{{ profile.username }}</span>
            <span v-for="role in profile.roles" :key="role" class="private-account__role-tag" :title="role">
              {{ role }}
            </span>
          </div>
        </div>
      </div>
      <dl class="private-account__fields">
        <template v-if="profile.organizations.length">
          <dt>{{ t('AccountInfo.orgs') }}</dt>
          <dd :title="profile.organizations.join('、')">{{ profile.organizations.join('、') }}</dd>
        </template>
        <template v-if="profile.latestLogin">
          <dt>{{ t('privateApplication.lastLogin') }}</dt>
          <dd>{{ formatLoginTime(profile.latestLogin) }}</dd>
        </template>
        <template v-if="entries.length">
          <dt>{{ t('privateApplication.availableFunctions') }}</dt>
          <dd ref="containerRef" class="private-account__links">
            <template v-for="(entry, index) in visibleEntries" :key="entry.id">
              <button
                type="button"
                class="private-account__link-btn"
                :disabled="entry.disabled || !!openingId"
                :title="entry.name"
                @click="$emit('open', entry.id)"
              >
                {{ entry.name }}
              </button>
              <span v-if="index < visibleEntries.length - 1" class="private-account__link-dot">·</span>
            </template>

            <a-popover v-if="hiddenCount > 0" :trigger="['hover', 'focus']" placement="bottomLeft">
              <template #content>
                <div class="private-account-popover">
                  <div class="private-account-popover__title">{{ t('privateApplication.availableFunctions') }}</div>
                  <div class="private-account-popover__list">
                    <template v-for="(entry, index) in entries" :key="entry.id">
                      <button
                        type="button"
                        class="private-account__link-btn"
                        :disabled="entry.disabled || !!openingId"
                        :title="entry.name"
                        @click="$emit('open', entry.id)"
                      >
                        {{ entry.name }}
                      </button>
                      <span v-if="index < entries.length - 1" class="private-account__link-dot">·</span>
                    </template>
                  </div>
                </div>
              </template>
              <button
                type="button"
                class="private-account__more-btn"
                :aria-label="t('privateApplication.availableFunctions')"
              >
                +{{ hiddenCount }}
              </button>
            </a-popover>
          </dd>
        </template>
      </dl>
      <p class="private-account__hint">{{ t('privateApplication.contactAdmin') }}</p>

      <span class="private-account__measure-clip" aria-hidden="true">
        <span ref="measurementRef" class="private-account__measure">
          <span
            v-for="(entry, index) in entries"
            :key="entry.id"
            class="private-account__measure-item"
            data-measure-item
          >
            <button type="button" class="private-account__link-btn">{{ entry.name }}</button>
            <span v-if="index < entries.length - 1" class="private-account__link-dot">·</span>
          </span>
          <button ref="moreMeasureRef" type="button" class="private-account__more-btn">+{{ hiddenCount || 99 }}</button>
        </span>
      </span>
    </div>
  </PrivatePanel>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import PrivatePanel from './PrivatePanel.vue'
import HomeWidgetLink from '../../shared/HomeWidgetLink.vue'
import type { PrivateAccountProfile, PrivateAccountEntry } from '../types'
import { useVisibleAccountEntries } from '../useVisibleAccountEntries'

const props = defineProps<{ profile: PrivateAccountProfile; entries: PrivateAccountEntry[]; openingId?: string }>()
defineEmits<{ account: []; open: [id: string] }>()
const { t } = useI18n()

const {
  containerRef,
  measurementRef,
  moreMeasureRef,
  visibleEntries,
  hiddenCount,
} = useVisibleAccountEntries(toRef(props, 'entries'))

const formatLoginTime = (timeStr?: string) => {
  if (!timeStr) return ''
  const date = dayjs(timeStr)
  if (!date.isValid()) return timeStr
  const now = dayjs()
  return date.year() === now.year() ? date.format('MM-DD HH:mm') : date.format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.private-account {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}
.private-account__identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.private-account__avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  font-weight: 500;
  background: var(--business-component-primary, #1677ff);
  color: #ffffff;
}
.private-account__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.private-account__name {
  color: var(--business-component-text, #1d2129);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.private-account__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.private-account__username {
  color: var(--business-component-muted, #86909c);
  font-size: 13px;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.private-account__role-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 12px;
  line-height: 18px;
  color: #4e5969;
  background: #f2f3f5;
  border-radius: 3px;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.private-account__fields {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px 16px;
  margin: 20px 0 0;
  font-size: 13px;
  line-height: 20px;
}
.private-account__fields dt {
  color: var(--business-component-muted, #86909c);
  white-space: nowrap;
}
.private-account__fields dd {
  min-width: 0;
  margin: 0;
  color: var(--business-component-text, #1d2129);
  overflow-wrap: anywhere;
}
.private-account__links {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.private-account__link-btn {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--business-component-primary, #1677ff);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: color 0.2s ease;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.private-account__link-btn:hover:not(:disabled) {
  color: var(--ant-color-primary-hover, #4096ff);
  text-decoration: underline;
}
.private-account__link-btn:disabled {
  color: var(--business-component-muted, #86909c);
  cursor: not-allowed;
  opacity: 0.6;
}
.private-account__link-btn:focus-visible {
  outline: 2px solid var(--business-component-primary, #1677ff);
  outline-offset: 2px;
}
.private-account__link-dot {
  flex-shrink: 0;
  color: #c9cdd4;
  font-size: 12px;
  user-select: none;
}
.private-account__more-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  height: 18px;
  border: 0;
  border-radius: 3px;
  background: #f2f3f5;
  color: var(--business-component-primary, #1677ff);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.private-account__more-btn:hover {
  background: #e6f4ff;
  color: var(--ant-color-primary-hover, #4096ff);
}
.private-account__more-btn:focus-visible {
  outline: 2px solid var(--business-component-primary, #1677ff);
  outline-offset: 2px;
}
.private-account__hint {
  margin: auto 0 0;
  padding-top: 24px;
  font-size: 12px;
  line-height: 18px;
  color: var(--business-component-muted, #86909c);
}
.private-account-popover {
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px;
}
.private-account-popover__title {
  font-size: 12px;
  color: var(--business-component-muted, #86909c);
  font-weight: 500;
}
.private-account-popover__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  line-height: 22px;
}
.private-account-popover__list .private-account__link-btn {
  max-width: none;
}
.private-account__measure-clip {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}
.private-account__measure {
  display: flex;
  gap: 6px;
  width: max-content;
  white-space: nowrap;
}
.private-account__measure-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
