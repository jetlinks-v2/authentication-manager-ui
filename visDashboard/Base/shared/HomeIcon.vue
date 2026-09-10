<template>
  <component :is="icon.component" class="home-icon" :style="{ color: neutral ? 'currentColor' : icon.color }" aria-hidden="true" />
</template>
<script setup lang="ts" name="ProjectHomeIcon">
import { computed, type Component } from 'vue'
import {
  AlertOutlined, ApiOutlined, AppstoreAddOutlined, AppstoreOutlined, BlockOutlined,
  DashboardOutlined, DatabaseOutlined, DeploymentUnitOutlined, EyeOutlined, FundOutlined,
  GatewayOutlined, PictureOutlined, RobotOutlined, ThunderboltOutlined,
  VideoCameraAddOutlined, VideoCameraOutlined, WifiOutlined,
} from '@ant-design/icons-vue'
const props = withDefaults(defineProps<{ name?: string; neutral?: boolean }>(), { name: '', neutral: false })
// 以原型业务含义匹配标准图标；新增图标优先 Ant Design，再检查已接入的私有图标库。
const icons: Record<string, { component: Component; color: string }> = {
  devices: { component: DatabaseOutlined, color: '#6387df' },
  video: { component: VideoCameraOutlined, color: '#5b9b6d' },
  addVideo: { component: VideoCameraAddOutlined, color: '#5b9b6d' },
  gateway: { component: ApiOutlined, color: '#6387df' },
  createApplication: { component: AppstoreAddOutlined, color: '#6387df' },
  applications: { component: AppstoreOutlined, color: '#6387df' },
  algorithm: { component: EyeOutlined, color: '#59a7a5' },
  coverage: { component: DeploymentUnitOutlined, color: '#6387df' },
  space: { component: BlockOutlined, color: '#6387df' },
  visionAlarm: { component: VideoCameraOutlined, color: '#d79c42' },
  deviceAlarm: { component: AlertOutlined, color: '#d79c42' },
  collector: { component: FundOutlined, color: '#d79c42' },
  card: { component: WifiOutlined, color: '#6387df' },
  screen: { component: DashboardOutlined, color: '#7980d4' },
  template: { component: BlockOutlined, color: '#d79c42' },
  image: { component: PictureOutlined, color: '#5b9b6d' },
  component: { component: AppstoreOutlined, color: '#bd6a9f' },
  model: { component: GatewayOutlined, color: '#59a7a5' },
  agent: { component: RobotOutlined, color: '#966dc2' },
  scene: { component: ThunderboltOutlined, color: '#d79c42' },
}
const icon = computed(() => icons[props.name] || icons.applications)
</script>
<style scoped>
.home-icon { width: 18px; height: 18px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; }
.home-icon :deep(svg) { width: 100%; height: 100%; }
</style>
