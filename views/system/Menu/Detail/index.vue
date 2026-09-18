<template>
  <!-- 斜边页签充当面板顶栏：flush 让它与布局面板贴合。 -->
  <PageChrome flush>
    <SlantedTabs
      class="menu-detail__types"
      v-model:activeKey="activeKey"
      :options="tabs"
    />
  </PageChrome>
  <div class="menu-detail">
    <BasicInfo v-if="activeKey === 'basic'" :value="initData" @refresh="onRefresh"/>
    <ButtonMange v-else :value="initData" @refresh="onRefresh" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import BasicInfo from './BasicInfo/index.vue'
import ButtonMange from './ButtonMange/index.vue'
import PageChrome from '@jetlinks-web-core/components/PageChrome/index.vue'
import SlantedTabs from '@jetlinks-web-core/components/SlantedTabs'
import type { SlantedTabOption } from '@jetlinks-web-core/components/SlantedTabs'
import { getMenuInfo } from '@authentication-manager-ui/api/system/menu'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const route = useRoute()
const activeKey = ref('basic')
const initData = ref<any>({})

// 页签文案由调用方国际化；数量能力当前未接入，省略 count。
const tabs = computed<SlantedTabOption[]>(() => [
  { key: 'basic', label: $t('Detail.index.765389-0') },
  { key: 'button', label: $t('Detail.index.765389-1') },
])

const handleSearch = (id: string) => {
  getMenuInfo(id).then((resp: any) => {
    if (resp.success) {
      initData.value = resp.result
    }
  })
}

watch(
  () => route.params.id,
  (newValue) => {
    if (newValue && newValue !== ':id') {
      handleSearch(newValue as string)
    }
  },
  {
    immediate: true,
    deep: true,
  },
)

const onRefresh = () => {
  handleSearch(route.params.id as string)
}
</script>

<style lang="less" scoped>
/*
 * 面板已由布局壳层定高，页面按内容高度排布并把滚动交给面板自身，
 * 不额外制造第二条滚动条。
 */
.menu-detail {
  min-width: 0;
}
</style>
