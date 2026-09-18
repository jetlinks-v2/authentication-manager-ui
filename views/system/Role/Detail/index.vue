<template>
    <!-- 斜边页签充当面板顶栏：flush 让它与布局面板贴合。 -->
    <j-page-container>
	    <PageChrome flush>
		    <SlantedTabs
			    class="role-detail__types"
			    :activeKey="activeKey"
			    :options="tabs"
			    @change="activeKey = String($event)"
		    />
	    </PageChrome>
	    <FullPage flex transparent-background class="role-detail">
		    <div class="role-detail__content">
			    <User v-if="activeKey === 'user'" />
			    <Permission v-else />
		    </div>
	    </FullPage>
    </j-page-container>
</template>

<script setup lang="ts" name="RoleDetail">
import Permission from './Permission/index.vue';
import User from './User/index.vue';
import FullPage from "@jetlinks-web-core/layout/FullPage.vue";
import PageChrome from "@jetlinks-web-core/components/PageChrome/index.vue";
import SlantedTabs from "@jetlinks-web-core/components/SlantedTabs";
import type { SlantedTabOption } from "@jetlinks-web-core/components/SlantedTabs";
import {useI18n} from "vue-i18n";

const { t: $t } = useI18n();
const activeKey = ref('permission');

// 页签文案由调用方国际化；数量能力当前未接入，省略 count。
const tabs = computed<SlantedTabOption[]>(() => [
  { key: 'permission', label: $t('Detail.index.386725-0') },
  { key: 'user', label: $t('Detail.index.386725-1') },
]);
</script>

<style lang="less" scoped>
.role-detail {
  min-width: 0;
  min-height: 0;
  /*
   * 作为布局面板的 flex 项：收缩到面板内容高度，
   * 页内滚动交给各页签内容自身，避免出现第二条滚动条。
   */
  flex: 0 1 auto;
  overflow: hidden;

  &__content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }
}
</style>
