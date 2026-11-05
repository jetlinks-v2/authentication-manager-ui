import { defineAsyncComponent, markRaw, onErrorCaptured, ref, shallowRef, type AsyncComponentLoader, type Component } from 'vue'
import PageRouteSkeleton from '@jetlinks-web-core/components/PageRouteSkeleton/index.vue'

/** 组件加载由自身立即展示占位，避免外层路由 Suspense 将独立卡片合并等待。 */
export function createOverviewAsyncComponent(loader: AsyncComponentLoader, loadingComponent: Component) {
  return defineAsyncComponent({ loader, loadingComponent, delay: 0, suspensible: false })
}

/** 只加载当前部署的页面容器；失败后重新创建加载实例，不刷新整个应用。 */
export function useOverviewLayout(loader: AsyncComponentLoader) {
  const failed = ref(false)
  const createLayout = () => markRaw(createOverviewAsyncComponent(loader, PageRouteSkeleton))
  const component = shallowRef(createLayout())
  onErrorCaptured(error => {
    failed.value = true
    console.error('[ProjectOverview] Failed to load overview layout:', error)
    return false
  })
  function retry() {
    failed.value = false
    component.value = createLayout()
  }
  return { component, failed, retry }
}
