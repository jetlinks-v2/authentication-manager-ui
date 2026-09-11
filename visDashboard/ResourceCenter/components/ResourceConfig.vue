<template>
  <a-collapse v-model:active-key="active" ghost>
    <a-collapse-panel key="main" :header="t('resourceDashboard.keyConfig')">
      <a-form layout="vertical">
        <a-form-item :label="t('resourceDashboard.title')"><a-input :value="config.title" :maxlength="60" :placeholder="t(`resourceDashboard.${kind}`)" @update:value="update('title',$event)" /></a-form-item>
        <a-form-item v-if="kind === 'DeviceDistribution'" :label="t('resourceDashboard.defaultDevice')"><a-select :value="config.deviceType" :options="deviceOptions" @update:value="update('deviceType',$event)" /></a-form-item>
        <a-form-item v-if="['MessageTrend', 'VideoPlaybackTrend'].includes(kind)" :label="t('resourceDashboard.defaultRange')"><a-select :value="config.timeRange" :options="timeOptions" @update:value="update('timeRange',$event)" /></a-form-item>
      </a-form>
    </a-collapse-panel>
    <a-collapse-panel v-if="kind !== 'QuickStart'" key="more" :header="t('resourceDashboard.moreConfig')">
      <a-form layout="vertical">
        <a-form-item :label="t('resourceDashboard.refresh')" :help="t('resourceDashboard.refreshHelp')"><a-input-number :value="config.refreshSeconds" :min="0" :max="3600" :step="15" @update:value="update('refreshSeconds',$event)" /></a-form-item>
        <a-form-item v-if="['DeviceDistribution','NetworkCards'].includes(kind)" :label="t('resourceDashboard.limit')"><a-input-number :value="config.limit" :min="1" :max="50" :precision="0" @update:value="update('limit',$event)" /></a-form-item>
      </a-form>
    </a-collapse-panel>
  </a-collapse>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { kinds,settingsOf,typeOf,type ResourceInfo,type ResourceConfig } from '../shared'
const props = defineProps<{ activeComponent: ResourceInfo }>()
const emit = defineEmits<{ change: [value: ResourceConfig,key: string] }>()
const { t } = useI18n()
const active = ref(['main'])
const kind = computed(() => kinds.find(item => typeOf(item) === props.activeComponent.type) || 'EdgeNodes')
const config = computed(() => settingsOf(kind.value,props.activeComponent))
const deviceOptions = computed(() => ['edge','iot','video'].map(value => ({ value,label: t(`resourceDashboard.${value}`) })))
const timeOptions = computed(() => ['today','yesterday','3d','7d','30d'].map(value => ({ value,label: t(`resourceDashboard.range.${value}`) })))
/** 配置仅回写当前命名空间，由画布草稿管理应用/取消，不直接修改运行组件。 */
function update(key: keyof ResourceConfig,value: unknown) {
  const next = settingsOf(kind.value,{ componentProps: { [typeOf(kind.value)]: { ...config.value,[key]: value } } })
  emit('change',next,typeOf(kind.value))
}
</script>
