<template>
  <PrivateMyApplications v-if="isApplications && account.applicationEntry" :entries="account.applicationEntry.entries.value"
    :state="{ loading: account.applicationEntry.applicationsLoading.value, error: account.applicationEntry.applicationsError.value, openingId: account.applicationEntry.openingId.value }"
    :display="{ limit: 0, showAll: account.applicationEntry.canOpenAll.value }"
    @open="account.open" @retry="account.applicationEntry.retry" @all="account.openAll" />
  <PrivateAccount v-else-if="isAccount" :profile="account.profile.value" :entries="account.entries.value" :opening-id="account.openingId.value"
    @account="account.openAccount" @open="account.open" />
  <a-card
    v-else
    class="saas-utility-card saas-utility-card--help"
    :bordered="false"
    :title="$t('packages.ProjectHome.SaasHelp')"
  >
    <template #extra>
      <HomeWidgetLink @click="openHelpCenter">{{ $t('packages.ProjectHome.saasHelpCenter') }}</HomeWidgetLink>
    </template>
    <HelpDocuments :documents="documents" @open="openHelp" />
  </a-card>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import HomeWidgetLink from '../shared/HomeWidgetLink.vue'
import PrivateAccount from '../Private/components/PrivateAccount.vue'
import PrivateMyApplications from '../Private/components/PrivateMyApplications.vue'
import HelpDocuments from './components/HelpDocuments.vue'
import { useSaasAccount, useSaasUtilities } from './useSaasUtilities'
import type { HomeInfo } from '../shared/types'
const props = withDefaults(defineProps<{ info?: HomeInfo & { type?: string }; isEdit?: boolean }>(), { isEdit: false })
const isAccount = computed(() => props.info?.type === 'projectHomeSaasAccount')
const isApplications = computed(() => props.info?.type === 'projectHomeSaasMyApplications')
const { documents, openHelp, openHelpCenter } = useSaasUtilities(() => props.isEdit)
const account = useSaasAccount(() => props.isEdit)
</script>
<style scoped lang="less">
.saas-utility-card {
  height: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--r-3, 8px);
  container-name: project-home;
  container-type: inline-size;

  &.saas-utility-card--help :deep(.ant-card-body) {
    padding: 0 !important;
  }
}
.saas-utility-card :deep(.ant-card-head) { flex-shrink: 0; min-height: 46px; border-bottom: 1px solid var(--line, #f2f3f5); padding: 0 18px; font-size: 15px; }
.saas-utility-card :deep(.ant-card-head-title) { padding: 0; line-height: 22px; font-weight: 600; }
.saas-utility-card :deep(.ant-card-extra .ant-btn) {
  padding: 0;
  height: auto;
  font-size: 13px;
  line-height: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color .2s;
}
.saas-utility-card :deep(.ant-card-extra .ant-btn-link:not(:disabled)) { color: var(--business-component-primary, #1677ff); }
.saas-utility-card :deep(.ant-card-extra .ant-btn-link:hover:not(:disabled)) { color: var(--ant-color-primary-hover, #4096ff); }
.saas-utility-card :deep(.ant-card-body) { flex: 1; min-height: 0; padding: 14px 18px 18px; }
</style>
