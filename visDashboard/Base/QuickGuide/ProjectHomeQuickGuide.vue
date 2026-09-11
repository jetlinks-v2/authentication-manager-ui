<template>
  <div ref="shellRef" class="project-home-shell quick-guide-shell" :class="{ 'is-compact': isCompact }">
    <div class="quick-guide-header">
      <h3 class="guide-title">{{ t('packages.ProjectHome.QuickGuide') }}</h3>
      <div v-if="isCompact" class="inline-steps">
        <template v-for="(step, index) in steps" :key="step.key">
          <span
            class="inline-step"
            :class="{ 'is-disabled': step.disabled }"
            :title="step.disabled ? t('packages.ProjectHome.unavailable') : step.title"
            @click="handleAction(step)"
          >
            <span class="inline-badge">{{ index + 1 }}</span>
            <span class="inline-title">{{ step.title }}</span>
          </span>
          <RightOutlined v-if="index < steps.length - 1" class="inline-arrow" />
        </template>
      </div>
    </div>
    <div v-if="!isCompact" class="quick-guide-content">
      <HomeView :steps="steps" @action="handleAction" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import type { HomeInfo } from '../shared/types'
import HomeView, { type GuideStep } from './components/HomeView.vue'

const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const menuStore = useMenuStore()

const shellRef = ref<HTMLElement>()
const isCompact = ref(false)
let resizeObserver: ResizeObserver | null = null
let rafId: number | null = null

function updateSize(entries: ResizeObserverEntry[]) {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = null
    const entry = entries[0]
    if (!entry) return
    // 使用 borderBoxSize 或 offsetHeight 测量卡片外层尺寸，不受内部 padding 切换影响，根治死循环
    const height = entry.borderBoxSize?.[0]?.blockSize || shellRef.value?.offsetHeight || 0
    if (height <= 0) return

    // 当卡片被缩放到极小高度（例如 h<=3 约 84px）时，自动转为单行步骤形式
    // 高度在 h>=4（约 118px 及以上，包括常见的 h=5 与 h=6）时，卡片内单行描述和按钮均能舒适完整展现
    if (height < 105) {
      isCompact.value = true
    } else if (height >= 120) {
      isCompact.value = false
    }
  })
}

onMounted(() => {
  if (!shellRef.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(shellRef.value)
})

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
})

const resolveMenu = (step: { menu: string; fallbackMenu?: string }) => {
  if (menuStore.getMenu(step.menu)) return step.menu
  if (step.fallbackMenu && menuStore.getMenu(step.fallbackMenu)) return step.fallbackMenu
  return undefined
}

const steps = computed<GuideStep[]>(() => [
  {
    key: 'gateway',
    title: t('packages.ProjectHome.QuickGuide_step1'),
    description: t('packages.ProjectHome.QuickGuide_step1_desc'),
    actionText: t('packages.ProjectHome.QuickGuide_step1_action'),
    menu: 'iot-user/edge-gateway',
    fallbackMenu: 'edge/Device',
    query: { type: 'gateway', action: 'create' },
  },
  {
    key: 'device',
    title: t('packages.ProjectHome.QuickGuide_step2'),
    description: t('packages.ProjectHome.QuickGuide_step2_desc'),
    actionText: t('packages.ProjectHome.QuickGuide_step2_action'),
    menu: 'iot-user/device/list',
    fallbackMenu: 'iot-user-device-list',
    query: { type: 'device', action: 'create' },
  },
  {
    key: 'space',
    title: t('packages.ProjectHome.QuickGuide_step3'),
    description: t('packages.ProjectHome.QuickGuide_step3_desc'),
    actionText: t('packages.ProjectHome.QuickGuide_step3_action'),
    menu: 'space/AreaManagement',
    query: { action: 'create' },
  },
  {
    key: 'algorithm',
    title: t('packages.ProjectHome.QuickGuide_step4'),
    description: t('packages.ProjectHome.QuickGuide_step4_desc'),
    actionText: t('packages.ProjectHome.QuickGuide_step4_action'),
    menu: 'algorithm-center',
    fallbackMenu: 'project/algorithm-center',
    query: { action: 'create' },
  },
].map(step => ({
  ...step,
  disabled: !props.isEdit && !resolveMenu(step),
})))

function handleAction(step: GuideStep) {
  if (props.isEdit || step.disabled) return
  const target = resolveMenu(step)
  if (target) {
    menuStore.jumpPage(target, { query: step.query })
  }
}
</script>

<style scoped lang="less">
.quick-guide-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  container-name: business-component-shell project-home;
  container-type: size;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px #1118270a;
  box-sizing: border-box;
  padding: 12px 18px 14px;
}

.quick-guide-shell.is-compact {
  justify-content: center;
  padding: 0 20px;

  .quick-guide-header {
    justify-content: flex-start;
    gap: 20px;
  }
}

.quick-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.guide-title {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 400;
  color: #1a1a1a;
  flex-shrink: 0;
}

.inline-steps {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.inline-step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 3px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
  position: relative;
  z-index: 10;
  transition: all .2s;

  &:hover:not(.is-disabled) {
    border-color: #91caff;
    background: #f0f7ff;
  }

  &.is-disabled {
    cursor: not-allowed;
    background: #fbfbfb;
    border-color: #f0f0f0;
    opacity: 0.65;

    .inline-badge {
      background: #f0f2f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }

    .inline-title {
      color: #8c8c8c;
    }

    .inline-arrow {
      color: #d9d9d9;
    }
  }
}

.inline-badge {
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

.inline-title {
  font-size: 13px;
  color: #1f2937;
}

.inline-arrow {
  color: #bfbfbf;
  font-size: 11px;
}

.quick-guide-content {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
}
</style>
