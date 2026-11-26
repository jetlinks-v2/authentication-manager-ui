 <template>

  <DefineEmptyCreate>
    <j-permission-button
      class="authentication-system-list-page__primary-action"
      type="primary"
      :hasPermission="`${permission}:add`"
      @click="toDetails({})"
    >
      <AIcon type="PlusOutlined" />{{ $t('Menu.index.599742-0') }}
    </j-permission-button>
  </DefineEmptyCreate>
  <j-page-container v-bind="$attrs">
    <div class="menu-container">
      <FullPage :fixed="false" transparentBackground>
        
          <a-alert v-if="failed" type="error" show-icon :message="$t('MenuSetting.loadFailed')">
            <template #action><a-button size="small" @click="reload">{{ $t('AccountCenter.retry') }}</a-button></template>
          </a-alert>
          <!-- rows 已按一级菜单切页；使用原生 children 展开，避免 TREE 模式再次分页。 -->
          <j-pro-table
            class="pro-table__no-padding"
            :columns="columns"
            :data-source="rows"
            :loading="loading"
            :scroll="false"
            mode="TABLE"
            noPagination
            v-model:expandedRowKeys="expandedRowKeys"
          >
            <template #emptyText>
              <CloudEmpty :search="queryParams.terms" :search-name="$t('ProjectApplication.role.menu')">
                <EmptyCreateButton />
              </CloudEmpty>
            </template>
            <template #headerLeftRender>
              <div class="menu-list-toolbar">
                <h2 class="menu-list-title">{{ $t('SystemList.menuManagement') }}</h2>
              </div>
            </template>
            <template #headerRightRender>
              <a-flex :gap="16">
                <ConditionFilter
                  class="authentication-system-list-page__filter"
                  :labelWidth="56"
                  :columns="columns"
                  target="category"
                  @change="handleSearch"
                />
                <EmptyCreateButton />
                <a-button
                  v-if="isSuperAdmin"
                  @click="menuStore.jumpPage('system/Menu/Setting')"
                >{{ $t('Menu.index.599742-17') }}</a-button>
              </a-flex>
            </template>
            <template #createTime="slotProps">
            <span v-time-format="'YYYY-MM-DD HH:mm:ss'">
              {{ slotProps.createTime }}
            </span>
            </template>
            <template #name="slotProps">
              {{ slotProps?.i18nName || slotProps?.name }}
            </template>
            <template #action="slotProps">
              <a-space :size="16">
                <j-permission-button
                  type="link"
                  :hasPermission="`${permission}:add`"
                  @click="toDetails(slotProps)"
                  style="padding: 0"
                  :tooltip="{ title: $t('Menu.index.599742-1') }"
                >
                  <AIcon type="EditOutlined" />
                </j-permission-button>

                <j-permission-button
                  type="link"
                  :hasPermission="`${permission}:add`"
                  :tooltip="{ title: slotProps.level >= 3 ? $t('Setting.index.113436-9') : $t('Menu.index.599742-2') }"
                  style="padding: 0"
                  @click="addChildren(slotProps)"
                  :disabled="slotProps.level >= 3"
                >
                  <AIcon type="PlusCircleOutlined" />
                </j-permission-button>
                <j-permission-button
                  type="link"
                  :hasPermission="`${permission}:delete`"
                  :tooltip="{ title: $t('Menu.index.599742-3') }"
                  danger
                  style="padding: 0"
                  :popConfirm="{
                  title: $t('Menu.index.599742-4'),
                  onConfirm: () => clickDel(slotProps),
                }"
                >
                  <AIcon type="DeleteOutlined" />
                </j-permission-button>
              </a-space>
            </template>
          </j-pro-table>
          <CorePagination :current="current" :page-size="pageSize" :total="total" @change="changePage" />
        
      </FullPage>
    </div>
  </j-page-container>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'

import { delMenu } from '@authentication-manager-ui/api/system/menu'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { onlyMessage } from '@jetlinks-web/utils'
import CorePagination from '@jetlinks-web-core/components/CorePagination'
import { useMenuRootPage } from './useMenuRootPage'
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@jetlinks-web-core/store/user';
import { storeToRefs } from 'pinia'
import type {ConditionFilterChangePayload} from '@jetlinks-web-core/components/ConditionFilter'

defineOptions({ name: 'Menu' })

const { t: $t } = useI18n();
const permission = 'system/Menu'

const menuStore = useMenuStore()

const { isSuperAdmin } = storeToRefs(useUserStore());

const columns = [
  {
    title: $t('Menu.index.599742-5'),
    dataIndex: 'code',
    key: 'code',
    ellipsis: true,
    fixed: 'left',
    search: {
      type: 'string',
      componentProps: {
        placeholder: $t('Menu.index.599742-6'),
      },
    },
    width: 300,
  },
  {
    title: $t('Menu.index.599742-7'),
    dataIndex: 'name',
    key: 'name',
    scopedSlots: true,
    ellipsis: true,
    search: {
      type: 'string',
      componentProps: {
        placeholder: $t('Menu.index.599742-8'),
      },
    },
  },
  {
    title: $t('Menu.index.599742-9'),
    dataIndex: 'url',
    key: 'url',
    ellipsis: true,
    search: {
      type: 'string',
      componentProps: {
        placeholder: $t('Menu.index.599742-10'),
      },
    },
  },
  {
    title: $t('Menu.index.599742-11'),
    dataIndex: 'sortIndex',
    key: 'sortIndex',
    ellipsis: true,
    search: {
      type: 'number',
      componentProps: {
        placeholder: $t('Menu.index.599742-12'),
      },
    },
    width: 80,
  },
  {
    title: $t('Menu.index.599742-13'),
    dataIndex: 'describe',
    key: 'describe',
    ellipsis: true,
    columnEmpty: $t('comm.table.empty')
  },
  {
    title: $t('Menu.index.599742-14'),
    dataIndex: 'createTime',
    key: 'createTime',
    search: {
      type: 'date',
    },
    width: 200,
    scopedSlots: true,

  },
  {
    title: $t('Menu.index.599742-15'),
    dataIndex: 'action',
    key: 'action',
    fixed: 'right',
    scopedSlots: true,
    width: 140,
  },
]
const queryParams = ref<ConditionFilterChangePayload['filter']>({ terms: [] })
const { rows, total, current, pageSize, changePage, nextSortIndex, loading, failed, reload } = useMenuRootPage(queryParams)
const expandedRowKeys = ref<string[]>([])
const handleSearch = ({filter}: ConditionFilterChangePayload) => {
  queryParams.value = filter
  if (!filter.terms.length) {
    expandedRowKeys.value = []
  }
}

const addChildren = (row: any) => {
  let sortIndex = 0
  if (row && row.children) {
    sortIndex = row.children.filter(a => a.sortIndex !== 9999).sort((a, b) => a.sortIndex - b.sortIndex).pop().sortIndex
  }
  menuStore.jumpPage('system/Menu/Detail', {
    params: {
      id: ':id',
    },
    query: {
      pid: row.id,
      basePath: row.url || '',
      sortIndex: sortIndex + 1,
    },
  })
}
// 跳转至详情页
const toDetails = (row: any) => {
  menuStore.jumpPage('system/Menu/Detail', {
    params: {
      id: row.id || ':id',
    },
    query: {
      pid: row.parentId,
      basePath: row.url || '',
      sortIndex: nextSortIndex.value,
    },
  })
}
// 删除
const clickDel = (row: any) => {
  delMenu(row.id).then((resp: any) => {
    if (resp.status === 200) {
      void reload()
      onlyMessage($t('Menu.index.599742-16'))
    }
  })
}

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>

<style scoped lang="less">
.menu-list-toolbar {
  display: flex;
  flex: 1;
  align-items: center;
}

.menu-list-title {
  margin: 0;
  color: rgba(0, 0, 0, 0.85);
  font-size: var(--fs-18);
  font-weight: 600;
  line-height: 32px;
  white-space: nowrap;
}
</style>
