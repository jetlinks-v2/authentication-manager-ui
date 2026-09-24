<template>
  <div class="project-home-shell quick-guide-shell">
    <div class="quick-guide-main">
      <h3 class="guide-title">{{ t('packages.ProjectHome.QuickGuide') }}</h3>
      <div class="quick-guide-compact">
        <template v-for="(step, index) in steps" :key="step.key">
          <a-button size="small" class="compact-step" :class="{ 'is-complete': step.status === 'complete' }"
            :disabled="step.disabled" :title="step.statusText" :aria-label="`${step.title}，${step.statusText}`"
            @click="handleAction(step)">
            <span class="compact-badge" :class="{ 'is-complete': step.status === 'complete', 'is-unknown': step.status === 'unknown' }">
              <CheckOutlined v-if="step.status === 'complete'" />
              <LoadingOutlined v-else-if="step.status === 'loading'" spin />
              <QuestionOutlined v-else-if="step.status === 'unknown'" />
              <template v-else>{{ index + 1 }}</template>
            </span>{{ step.title }}
          </a-button>
          <RightOutlined v-if="index < steps.length - 1" class="compact-arrow" />
        </template>
      </div>
    </div>
    <div class="quick-guide-content">
      <HomeView :steps="steps" @action="handleAction" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckOutlined, LoadingOutlined, QuestionOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import type { HomeInfo } from '../shared/types'
import HomeView from './components/HomeView.vue'
import { useQuickGuideSteps } from './useQuickGuideSteps'

const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const { steps, handleAction } = useQuickGuideSteps(() => props.isEdit)
</script>

<style scoped lang="less">
.quick-guide-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  container-name: business-component-shell project-home;
  container-type: size;
  overflow: hidden;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 1px 3px #1118270a;
  box-sizing: border-box;
  padding: 12px 18px 14px;
}

.quick-guide-main {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
  flex-shrink: 0;
}

.guide-title {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  color: #1a1a1a;
  flex-shrink: 0;
}

.quick-guide-content {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
}

.quick-guide-compact {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: none;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
}

.compact-step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 0 10px;
  border-radius: 8px;
  color: #1f2937;
}
.compact-step.is-complete { border-color: #91caff; background: #f5f9ff; color: #86909c; }
.compact-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid #91caff;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 11px;
}
.compact-badge.is-complete { background: #1677ff; border-color: #1677ff; color: #fff; }
.compact-badge.is-unknown { background: #f2f3f5; border-color: #d9dce3; color: #86909c; }
.compact-arrow { flex: 0 0 auto; color: #bfbfbf; font-size: 11px; }

@container project-home (max-height: 140px) {
  .quick-guide-main { flex: 1; }
  .quick-guide-content { display: none; }
  .quick-guide-compact { display: flex; }
}

@container project-home (max-width: 600px) {
  .quick-guide-main { flex: 1; }
  .quick-guide-content { display: none; }
  .quick-guide-compact { display: flex; }
}
</style>
