<template>
  <PrivatePanel class="private-assets" :title="groups.length === 1 ? t(groups[0].labelKey) : t('privateOverview.devicesAndChannels')" :state="state" @retry="$emit('retry')">
    <template #extra>
      <a-button v-if="groups[0] && canOpen(groups[0].target)" type="link" size="small" @click="$emit('navigate', groups[0].target)">
        {{ t(groups[0].id === 'video' ? 'privateOverview.channelList' : 'privateOverview.deviceList') }} <RightOutlined />
      </a-button>
    </template>
    <div class="private-assets-grid" :class="{ 'is-single': groups.length === 1 }">
      <section v-for="group in groups" :key="group.id" class="private-asset-group">
        <div class="private-asset-heading">
          <button v-if="groups.length > 1" type="button" class="private-asset-link" :disabled="!canOpen(group.target)" @click="$emit('navigate', group.target)">
            {{ t(group.labelKey) }} <RightOutlined v-if="canOpen(group.target)" />
          </button>
          <span v-else class="private-asset-total-label">{{ t('privateOverview.total') }}</span>
          <span class="private-asset-total"><strong>{{ formatOverviewNumber(group.failed ? undefined : group.total, locale) }}</strong><span>{{ t(group.unitKey) }}</span></span>
        </div>
        <div class="private-health-bar" :aria-label="t('privateOverview.healthSummary', { online: formatOverviewNumber(group.failed ? undefined : group.online, locale), offline: formatOverviewNumber(group.failed ? undefined : group.offline, locale) })">
          <template v-if="!group.failed && group.total">
            <span v-if="group.online" class="is-online" :style="{ flex: group.online }" />
            <span v-if="group.offline" class="is-offline" :style="{ flex: group.offline }" />
          </template>
        </div>
        <div class="private-asset-statuses">
          <span><a-badge status="success" />{{ t('privateOverview.online') }} {{ formatOverviewNumber(group.failed ? undefined : group.online, locale) }}</span>
          <span><a-badge status="error" />{{ t('privateOverview.offline') }} {{ formatOverviewNumber(group.failed ? undefined : group.offline, locale) }}</span>
        </div>
        <div v-if="group.failed" class="private-asset-error"><span>{{ t('privateOverview.loadError') }}</span><a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button></div>
        <div v-for="item in group.breakdown" :key="item.id" class="private-asset-breakdown">
          <span class="private-asset-kind">{{ t(item.labelKey) }}</span>
          <span class="private-asset-track"><span :style="{ width: `${barPercent(item.failed ? undefined : item.value, group.breakdown)}%` }" /></span>
          <span class="private-asset-count">{{ formatOverviewNumber(item.failed ? undefined : item.value, locale) }} {{ t(group.unitKey) }}<span v-if="item.offline"> · {{ t('privateOverview.offline') }} {{ formatOverviewNumber(item.offline, locale) }}</span></span>
        </div>
        <div v-if="!group.failed && group.breakdown.some(item => item.failed)" class="private-asset-error"><span>{{ t('privateOverview.partialError') }}</span><a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button></div>
      </section>
    </div>
  </PrivatePanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import PrivatePanel from './PrivatePanel.vue'
import { formatOverviewNumber } from '../../Saas/components/presentation'
import type { HomeTarget } from '../../shared/types'
import type { PrivateAssetGroup, PrivateBreakdown } from '../types'

defineProps<{ groups: PrivateAssetGroup[]; state?: { loading?: boolean; error?: boolean; empty?: boolean }; canOpen: (target?: HomeTarget) => boolean }>()
defineEmits<{ navigate: [target?: HomeTarget]; retry: [] }>()
const { t, locale } = useI18n()
/** 构成条只比较当前分组已取得的数量，未知值不补成可见占比。 */
function barPercent(value: number | undefined, rows: PrivateBreakdown[]): number {
  const max = Math.max(1, ...rows.filter(row => !row.failed).map(row => row.value || 0))
  return typeof value === 'number' && value > 0 ? Math.max(2, Math.min(100, value / max * 100)) : 0
}
</script>

<style scoped lang="less">
.private-assets-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.private-assets-grid.is-single { grid-template-columns: minmax(0, 1fr); }
.private-asset-group { min-width: 0; }
.private-asset-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.private-asset-link { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: var(--business-component-text, #1f2329); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.private-asset-link :deep(.anticon) { font-size: 9px; color: var(--ink-4, #c9cdd4); }
.private-asset-link:hover:not(:disabled) { color: var(--business-component-primary, #1677ff); }
.private-asset-link:disabled { cursor: default; }
.private-asset-link:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 3px; }
.private-asset-total-label { color: var(--business-component-muted, #646c73); font-size: 13px; }
.private-asset-total { display: inline-flex; align-items: baseline; gap: 4px; }
.private-asset-total strong { color: var(--business-component-text, #1f2329); font-size: 20px; line-height: 26px; font-weight: 600; font-variant-numeric: tabular-nums; }
.private-asset-total > span { font-size: 12px; color: var(--business-component-muted, #646c73); }
.private-health-bar { display: flex; gap: 2px; height: 7px; margin-top: 8px; border-radius: 4px; overflow: hidden; background: var(--bg-sunken, #f2f3f5); }
.private-health-bar > span { border-radius: 4px; }
.private-health-bar .is-online { background: var(--ant-color-success, #00b42a); }
.private-health-bar .is-offline { background: var(--ant-color-error, #f53f3f); }
.private-asset-statuses { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 7px; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
.private-asset-statuses > span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.private-asset-breakdown { display: grid; grid-template-columns: minmax(48px, 64px) minmax(20px, 1fr) auto; align-items: center; gap: 8px; margin-top: 8px; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
.private-asset-kind { overflow-wrap: anywhere; }
.private-asset-track { height: 5px; overflow: hidden; border-radius: 3px; background: var(--bg-sunken, #f2f3f5); }
.private-asset-track > span { display: block; height: 100%; border-radius: inherit; background: var(--business-component-primary, #1677ff); }
.private-asset-count { color: var(--business-component-text, #1f2329); text-align: right; font-variant-numeric: tabular-nums; }
.private-asset-count > span { color: var(--business-component-muted, #646c73); }
.private-asset-error { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 8px; color: var(--business-component-muted, #646c73); font-size: 12px; }
@container (max-width: 439px) { .private-assets-grid { grid-template-columns: minmax(0, 1fr); gap: 18px; } }
</style>
