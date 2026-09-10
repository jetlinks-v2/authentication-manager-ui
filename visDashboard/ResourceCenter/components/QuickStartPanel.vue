<template>
  <div class="actions">
    <a-button v-for="item in actions" :key="item.key" class="action" :disabled="item.disabled" @click="$emit('open', item.menu)">
      <span class="icon" :class="item.key"><AIcon :type="item.icon" /></span>
      <span class="copy"><span>{{ t(`resourceDashboard.action.${item.key}`) }}</span><small>{{ t(`resourceDashboard.actionDescription.${item.key}`) }}</small></span>
      <RightOutlined class="arrow" />
    </a-button>
  </div>
</template>
<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
defineProps<{ actions: { key: string; icon: string; menu: string; disabled: boolean }[] }>()
defineEmits<{ open: [menu: string] }>()
const { t } = useI18n()
</script>
<style scoped>
.actions { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
.action { display: flex; align-items: center; text-align: left; padding: 10px 12px; height: auto; min-height: 56px; white-space: normal; border: 1px solid #eef0f3; border-radius: 10px; box-shadow: none; background: #fff; }
.action:not(:disabled):hover { border-color: #b7d4ff; background: #fafcff; }
.action:focus-visible { outline: 2px solid #1677ff; outline-offset: 2px; }
.icon { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; margin-right: 10px; border-radius: 8px; color: #4278ed; background: #edf3ff; font-size: 20px; }
.edge { color: #722ed1; background: #f5f0ff; }.video { color: #73b83a; background: #f4faed; }.screen { color: #5ebbb7; background: #eaf8f7; }.collector { color: #ea913c; background: #fff7e9; }.card { color: #cc4299; background: #fff0f7; }
.copy { display: flex; flex: 1; min-width: 0; flex-direction: column; font-size: 13px; font-weight: 400; line-height: 15px; color: #4b5563; }
small { color: #00000073; font-size: 11px; line-height: 13px; margin-top: 2px; }
.arrow { flex-shrink: 0; color: #00000040; font-size: 13px; margin-left: 8px; }
@container resource-widget (max-width: 650px) {
  .actions { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
  .action { padding: 8px; min-height: 52px; }
  .icon { width: 28px; height: 28px; margin-right: 8px; font-size: 18px; }
}
@container resource-widget (max-width: 360px) { .actions { grid-template-columns: 1fr; } }
</style>
