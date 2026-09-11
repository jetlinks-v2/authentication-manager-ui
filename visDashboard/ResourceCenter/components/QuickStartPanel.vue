<template>
  <div class="actions" :class="{ 'actions-4': actions.length <= 4 }">
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
.actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, 1fr); gap: 8px 10px; height: 100%; min-height: 0; }
.actions.actions-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, 1fr); }
.action { display: flex; align-items: center; text-align: left; padding: 6px 12px; height: 100%; min-height: 0; white-space: normal; border: 1px solid #f0f2f5; border-radius: 8px; box-shadow: none; background: #fff; transition: all .2s; }
.action:not(:disabled):hover { border-color: #b7d4ff; background: #fafcff; }
.action:focus-visible { outline: 2px solid #1677ff; outline-offset: 2px; }
.icon { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; margin-right: 8px; border-radius: 6px; color: #4278ed; background: #edf3ff; font-size: 16px; }
.edge { color: #722ed1; background: #f5f0ff; }.video { color: #73b83a; background: #f4faed; }.screen { color: #5ebbb7; background: #eaf8f7; }.collector { color: #ea913c; background: #fff7e9; }.card { color: #cc4299; background: #fff0f7; }
.copy { display: flex; flex: 1; min-width: 0; flex-direction: column; justify-content: center; }
.copy span { font-size: 13px; font-weight: 500; line-height: 18px; color: #1d2129; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
small { color: #86909c; font-size: 11px; line-height: 14px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.arrow { flex-shrink: 0; color: #c9cdd4; font-size: 11px; margin-left: 4px; }
@container resource-widget (max-width: 480px) {
  .actions { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, 1fr); gap: 8px; }
  .action { padding: 6px 8px; }
  .icon { width: 28px; height: 28px; margin-right: 6px; font-size: 16px; }
  .arrow { display: none; }
}
@container resource-widget (max-width: 320px) { .actions { grid-template-columns: 1fr; grid-template-rows: repeat(6, 1fr); } }
</style>
