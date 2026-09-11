<template>
  <div class="actions" :class="{ 'actions-4': actions.length <= 4, 'actions-more': actions.length > 4 }">
    <a-button
      v-for="item in actions"
      :key="item.key"
      class="action"
      :disabled="item.disabled"
      @click="$emit('open', item.menu)"
    >
      <div class="icon-wrap">
        <img v-if="iconMap[item.key]" :src="iconMap[item.key]" class="action-img" alt="" />
        <span v-else class="icon" :class="item.key"><AIcon :type="item.icon" /></span>
      </div>
      <div class="copy">
        <span class="title">{{ t(`resourceDashboard.action.${item.key}`) }}</span>
        <small class="desc">{{ t(`resourceDashboard.actionDescription.${item.key}`) }}</small>
      </div>
      <RightOutlined class="arrow" />
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import iconEdge from '../assets/quick-start-edge.png'
import iconIot from '../assets/quick-start-iot.png'
import iconVideo from '../assets/quick-start-video.png'
import iconScreen from '../assets/quick-start-screen.png'
import iconCollector from '../assets/quick-start-collector.svg'
import iconCard from '../assets/quick-start-card.svg'

defineProps<{ actions: { key: string; icon: string; menu: string; disabled: boolean }[] }>()
defineEmits<{ open: [menu: string] }>()

const { t } = useI18n()

const iconMap: Record<string, string> = {
  edge: iconEdge,
  iot: iconIot,
  video: iconVideo,
  screen: iconScreen,
  collector: iconCollector,
  card: iconCard,
}
</script>

<style scoped>
.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  height: 100%;
  min-height: 0;
}
.actions.actions-4 {
  grid-template-rows: repeat(2, minmax(0, 1fr));
}
.actions.actions-more {
  grid-template-rows: repeat(3, minmax(0, 1fr));
}
.action {
  display: flex;
  align-items: center;
  text-align: left;
  padding: 8px 14px;
  height: 100% !important;
  min-height: 0;
  white-space: normal;
  border: 1px solid #E5EFFD;
  border-radius: 4px;
  box-shadow: none;
  background: linear-gradient(90deg, #F0F6FF 0%, #FCFEFF 100%);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
  box-sizing: border-box;
}
.action:not(:disabled):hover {
  background: #EEF5FF;
  border-color: #BFD8FF;
  box-shadow: 0 2px 8px rgba(30, 114, 240, 0.08);
  outline: none !important;
}
.action:not(:disabled):hover .title {
  color: #1E72F0;
}
.action:not(:disabled):hover .arrow {
  color: #1E72F0;
  transform: translateX(2px);
}
.action:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 1px;
}
.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin-right: 12px;
}
.action-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
}
.icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 16px;
  color: #1E72F0;
  background: #E8F3FF;
}
.copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
}
.title {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #1D2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}
.desc {
  color: #86909C;
  font-size: 12px;
  line-height: 16px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.arrow {
  flex-shrink: 0;
  color: #C9CDD4;
  font-size: 12px;
  margin-left: 8px;
  transition: all 0.2s;
}
@container resource-widget (max-width: 480px) {
  .actions {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .actions.actions-4 {
    grid-template-rows: repeat(4, 1fr);
  }
  .actions.actions-more {
    grid-template-rows: repeat(6, 1fr);
  }
  .action {
    padding: 6px 10px;
  }
  .icon-wrap, .icon {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }
  .action-img {
    width: 28px;
    height: 28px;
  }
  .arrow {
    display: none;
  }
}
</style>
