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
            <a-alert v-if="error" type="error" show-icon :message="$t('Permission.index.071527-3')">
              <template #action><a-button @click="load">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
            </a-alert>
            <a-spin v-else-if="loading" />
            <template v-else-if="detail">
              <User v-if="activeKey === 'user'" :key="detail.kind === 'global' ? detail.role.id : detail.context.role.id"
                :role-id="detail.kind === 'global' ? detail.role.id : detail.context.role.id" :application-id="application?.scope.applicationId" />
              <Permission v-else :key="detail.kind === 'global' ? detail.role.id : detail.context.role.id" :application="application" />
            </template>
		    </div>
	    </FullPage>
    </j-page-container>
</template>

<script setup lang="ts">
import Permission from './Permission/index.vue';
import User from './User/index.vue';
import FullPage from "@jetlinks-web-core/layout/FullPage.vue";
import PageChrome from "@jetlinks-web-core/components/PageChrome/index.vue";
import SlantedTabs from "@jetlinks-web-core/components/SlantedTabs";
import { useRoleDetail } from './useRoleDetail'

defineOptions({ name: 'RoleDetail' })

const { detail, application, loading, error, activeKey, tabs, load } = useRoleDetail()
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
