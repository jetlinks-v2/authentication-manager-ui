<template>
  <section v-if="state.available" class="vision-ranking resource-ranking" :aria-label="state.title">
    <header class="ranking-header">
      <h3>{{ state.title }}</h3>
      <div class="ranking-toolbar">
        <a-segmented v-model:value="state.metric" :options="state.tabs" size="small" class="ranking-switch" />
        <a-button type="link" size="small" class="action-link" @click="state.moreOpen = true">{{ t('resourceDashboard.visionRanking.more') }}<RightOutlined class="action-arrow" /></a-button>
      </div>
    </header>
    <VisionTaskRankingContent :state="contentState" @retry="state.refresh">
      <ResourceRankList :rows="state.cardRows" :interactive="!state.preview && !!state.detailComponent" @select="state.openTask" />
    </VisionTaskRankingContent>
    <a-modal v-model:open="state.moreOpen" :title="t('resourceDashboard.VisionTaskRanking')" :footer="null"
      :width="'min(900px, calc(100vw - 32px))'" wrap-class-name="vision-ranking-modal" centered destroy-on-close>
      <div class="more-toolbar">
        <div class="group-controls">
          <a-button v-for="action in groupActions" :key="action.key" type="text" size="small" class="group-control"
            :aria-label="t(`resourceDashboard.visionRanking.${action.key}`)"
            :aria-pressed="action.expanded ? state.allExpanded : state.allCollapsed"
            :disabled="state.loading || !state.groups.length" @click="state.setGroupsExpanded(action.expanded)">
            {{ t(`resourceDashboard.visionRanking.${action.key}`) }}
          </a-button>
        </div>
        <div class="more-actions">
          <a-segmented v-model:value="state.metric" :options="state.tabs" size="small" class="ranking-switch" />
          <a-button v-if="state.canConfigure" type="primary" size="small" class="configure-button" @click="state.configure()">{{ t('resourceDashboard.algorithmConfig') }}</a-button>
        </div>
      </div>
      <div class="more-content">
        <VisionTaskRankingContent :state="contentState" @retry="state.refresh">
          <a-collapse v-model:active-key="state.expanded" :bordered="false" class="ranking-groups">
            <a-collapse-panel v-for="group in state.groups" :key="group.id">
              <template #header>
                <span class="group-heading"><HddOutlined /><span class="group-name">{{ group.name }}</span><span class="group-count">{{ group.rows.length }}</span></span>
              </template>
              <template #extra>
                <a-button v-if="state.canConfigureGateway" type="link" size="small" class="action-link" @click.stop="state.configure(group.id)">{{ t('resourceDashboard.algorithmConfig') }}<RightOutlined class="action-arrow" /></a-button>
              </template>
              <ResourceRankList :rows="group.rows" :interactive="!state.preview && !!state.detailComponent" @select="state.openTask" />
            </a-collapse-panel>
          </a-collapse>
        </VisionTaskRankingContent>
      </div>
    </a-modal>
    <component :is="state.detailComponent" v-if="state.selected && state.detailComponent" :key="state.selected.id"
      :task="state.selected" @close="state.selected = undefined" />
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { HddOutlined, RightOutlined } from '@ant-design/icons-vue'
import ResourceRankList from '../components/ResourceRankList.vue'
import VisionTaskRankingContent from '../components/VisionTaskRankingContent.vue'
import { useVisionTaskRanking } from '../hooks/useVisionTaskRanking'
import type { ResourceInfo } from '../shared'
const props = withDefaults(defineProps<{ info?: ResourceInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const state = reactive(useVisionTaskRanking(toRef(props, 'info'), toRef(props, 'isEdit')))
const groupActions = [
  { key: 'expand', expanded: true },
  { key: 'collapse', expanded: false },
] as const
const contentState = computed(() => ({ loading: state.loading, error: state.error, unsupported: state.unsupported,
  hasRows: state.rows.length > 0, metadataFailed: state.metadataFailed }))
</script>
<style scoped src="../components/resourceRanking.css" />
<style scoped>
.more-toolbar, .more-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.more-toolbar { justify-content: space-between; margin-bottom: 12px; }
.group-controls { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid #eceff3; border-radius: 6px; background: #f7f8fa; }
.group-control.ant-btn { display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 4px; color: #667085; font-size: 12px; }
.group-control.ant-btn[aria-pressed="true"] { color: #1677ff; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, .06); }
.configure-button.ant-btn { height: 26px; padding: 0 10px; font-size: 12px; line-height: 24px; }
.more-content { max-height: 65vh; overflow: auto; min-height: 200px; }
.ranking-groups { background: transparent; }
.ranking-groups :deep(.ant-collapse-item) { margin-bottom: 10px; border: 1px solid #eceff3; border-radius: 8px; overflow: hidden; }
.ranking-groups :deep(.ant-collapse-header) { align-items: center; padding: 10px 12px; background: #f8fafc; }
.ranking-groups :deep(.ant-collapse-header-text) { min-width: 0; }
.ranking-groups :deep(.ant-collapse-content-box) { padding: 8px 10px; }
.group-heading { display: flex; align-items: center; gap: 8px; min-width: 0; color: #1d2939; font-size: 13px; font-weight: 500; }
.group-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-count { padding: 0 6px; border-radius: 4px; background: #eef2f6; color: #86909c; font-size: 11px; font-weight: 400; }
:global(.vision-ranking-modal .ant-modal-content) { padding: 0; overflow: hidden; }
:global(.vision-ranking-modal .ant-modal-header) { margin-bottom: 0; padding: 16px 20px; background: linear-gradient(100deg, #f0f7ff, #fff); }
:global(.vision-ranking-modal .ant-modal-content .ant-modal-header .ant-modal-title) { border-bottom: 0; padding-bottom: 0; }
:global(.vision-ranking-modal .ant-modal-body) { padding: 16px 20px; }
</style>
