<template>
  <HomeWidget feature="RuleEngine" :info="info" :is-edit="isEdit">
    <template #default="{ rows, chart, canOpen, open }">
      <div class="rule-engine-list">
        <ResourceItem
          v-for="row in rows"
          :key="row.id"
          :row="row"
          :show-icon="chart.showIcon"
          :can-open="canOpen"
          @navigate="open"
        />
        <ol class="rule-flow">
          <li v-for="step in ['ruleTrigger', 'ruleCondition', 'ruleExecute']" :key="step">
            <strong>{{ t('packages.ProjectHome.' + step) }}</strong>
            <span>{{ t('packages.ProjectHome.' + step + 'Desc') }}</span>
          </li>
        </ol>
        <p class="rule-hint">{{ t('packages.ProjectHome.ruleHint') }}</p>
      </div>
    </template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from "../shared/HomeWidget.vue"
import { useI18n } from 'vue-i18n'
import ResourceItem from "../shared/ResourceItem.vue"
import type { HomeInfo } from "../shared/types"

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
</script>
<style scoped lang="less">
.rule-engine-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
}
</style>
<style scoped>
.rule-flow { list-style: decimal inside; margin: 0; padding: 0; display: grid; gap: 10px; }
.rule-flow li { color: var(--business-component-primary); font-size: 12px; }
.rule-flow strong { color: var(--business-component-text); font-weight: 500; }
.rule-flow span { display: block; padding-top: 3px; color: var(--business-component-muted); }
.rule-hint { margin: 0; color: var(--business-component-muted); font-size: 12px; line-height: 18px; }
</style>
