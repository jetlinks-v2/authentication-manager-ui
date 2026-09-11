<template>
  <div class="quick-guide-view">
    <template v-for="(step, index) in steps" :key="step.key">
      <div
        class="step-card"
        :class="{ 'is-disabled': step.disabled }"
        :title="step.disabled ? t('packages.ProjectHome.unavailable') : (step.title + ' - ' + step.description)"
        @click="!step.disabled && $emit('action', step)"
      >
        <div class="step-card-header">
          <span class="step-badge">{{ index + 1 }}</span>
          <strong class="step-title">{{ step.title }}</strong>
        </div>
        <div class="step-card-desc">{{ step.description }}</div>
        <div class="step-card-action">
          <a-button
            type="link"
            class="action-btn"
            :disabled="step.disabled"
            @click.stop="!step.disabled && $emit('action', step)"
          >
            {{ step.actionText }} <RightOutlined class="action-arrow" />
          </a-button>
        </div>
      </div>
      <div v-if="index < steps.length - 1" class="step-separator">
        <RightOutlined />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

export interface GuideStep {
  key: string
  title: string
  description: string
  actionText: string
  menu: string
  fallbackMenu?: string
  query?: Record<string, string>
  disabled?: boolean
}

defineProps<{
  steps: GuideStep[]
}>()

defineEmits<{
  action: [step: GuideStep]
}>()

const { t } = useI18n()
</script>

<style scoped lang="less">
.quick-guide-view {
  display: flex;
  align-items: stretch;
  gap: 8px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}

.step-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  cursor: pointer;
  transition: all .2s ease;

  &:hover:not(.is-disabled) {
    border-color: #91caff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);

    .action-btn {
      color: #0958d9;
    }
  }

  &.is-disabled {
    cursor: not-allowed;
    background: #fbfbfb;
    border-color: #f0f0f0;

    .step-badge {
      background: #f0f2f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }

    .step-title {
      color: #8c8c8c;
    }

    .step-card-desc {
      color: #bfbfbf;
    }

    .action-btn {
      color: rgba(0, 0, 0, 0.25);
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}

.step-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #91caff;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}

.step-title {
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-card-desc {
  font-size: 12px;
  line-height: 18px;
  color: #667085;
  margin: 4px 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-card-action {
  margin-top: auto;
}

.action-btn {
  padding: 0;
  height: auto;
  font-size: 12px;
  font-weight: 500;
  color: #1677ff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 16px;
}

.action-arrow {
  font-size: 10px;
}

.step-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d0d5dd;
  font-size: 11px;
  flex-shrink: 0;
  user-select: none;
}

@container business-component-shell (max-width: 600px) {
  .quick-guide-view {
    flex-direction: column;
    overflow-y: auto;
  }
  .step-separator {
    display: none;
  }
}
</style>
