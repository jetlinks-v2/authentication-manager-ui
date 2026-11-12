import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SlantedTabKey, SlantedTabOption } from '@jetlinks-web-core/components/SlantedTabs'

type ApplicationDetailTab = 'settings' | 'users' | 'roles'

/** 保留原 a-tabs 的首次访问挂载与草稿保留；切换应用时重置访问记录。 */
export function useApplicationDetailTabs(applicationId: Ref<string>, initialTab: () => unknown) {
  const { t } = useI18n()
  const activeTab = ref<ApplicationDetailTab>('settings')
  const visitedTabs = shallowRef(new Set<ApplicationDetailTab>())
  const tabOptions = computed<SlantedTabOption[]>(() => ['settings', 'users', 'roles'].map(key => ({
    key, label: t(`ProjectApplication.detail.tab.${key}`),
  })))

  watch(activeTab, key => {
    visitedTabs.value = new Set([...visitedTabs.value, key])
  }, { flush: 'sync' })

  watch(applicationId, () => {
    // 沿用原详情入口仅 roles 深链优先、其余进入 settings 的规则。
    activeTab.value = initialTab() === 'roles' ? 'roles' : 'settings'
    visitedTabs.value = new Set([activeTab.value])
  }, { immediate: true, flush: 'sync' })

  function changeTab(key: SlantedTabKey) {
    if (key === 'settings' || key === 'users' || key === 'roles') activeTab.value = key
  }

  return { activeTab, tabOptions, visitedTabs, changeTab }
}
