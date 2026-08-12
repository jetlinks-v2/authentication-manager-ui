<template>
  <j-page-container>
    <FullPage>
      <EqualHeightColumns
        class="department-container"
        left-width="18.75rem"
        right-width="1fr"
      >
        <template #left>
          <LeftTree @change="onChange" />
        </template>
        <template #right>
          <a-tabs
            v-if="isNoCommunity"
            v-model:activeKey="activeKey"
            destroyInactiveTabPane
          >
            <a-tab-pane
              v-for="tab in departmentTabs"
              :key="tab.key"
              :tab="$t(tab.label)"
            >
              <Position
                v-if="tab.key === 'position'"
                :parentId="departmentId"
                @changeTabs="onChangeTabs"
              />
              <User
                v-else-if="tab.key === 'user'"
                :parentId="departmentId"
                :positionId="positionId"
              />
              <Property
                v-else-if="tab.key === 'property'"
                :department-id="departmentId"
              />
            </a-tab-pane>
          </a-tabs>
          <User v-else :parentId="departmentId" />
        </template>
      </EqualHeightColumns>
    </FullPage>
  </j-page-container>
</template>

<script setup lang="ts" name="Department">
import { useRegistryOptions } from '@jetlinks-web-core/hooks'
import { isNoCommunity } from '@jetlinks-web-core/utils'
import LeftTree from './components/LeftTree.vue'

type DepartmentTabKey = 'position' | 'user' | 'property'

interface DepartmentTabOption {
  key: DepartmentTabKey
  label: string
}

const Position = defineAsyncComponent(() => import('./positions/index.vue'))
const User = defineAsyncComponent(() => import('./user/index.vue'))
const Property = defineAsyncComponent(() => import('./property/index.vue'))

const baseTabs = shallowRef<DepartmentTabOption[]>([
  {
    key: 'position',
    label: 'Department.index.945805-3',
  },
  {
    key: 'user',
    label: 'Department.index.945805-2',
  },
  {
    key: 'property',
    label: 'Department.index.945805-4',
  },
])
const { mergedOptions: departmentTabs } = useRegistryOptions<DepartmentTabOption>({
  baseOptions: baseTabs,
  code: 'department-tabs',
})

const activeKey = ref<DepartmentTabKey | undefined>('position')
const departmentId = ref('')
const positionId = ref<string>()

const onChange = (id: string) => {
  departmentId.value = id
}

const onChangeTabs = (id: string) => {
  positionId.value = id
  activeKey.value = 'user'
  setTimeout(() => {
    positionId.value = undefined
  }, 100)
}

watch(departmentTabs, (tabs) => {
  if (tabs.some(tab => tab.key === activeKey.value)) return

  // 外部模块隐藏当前页签时切到首个可见项，避免内容区停留在无效 key。
  activeKey.value = tabs[0]?.key
}, { immediate: true })
</script>

<style lang="less" scoped>
.department-container {
  background-color: #fff;
}
</style>
