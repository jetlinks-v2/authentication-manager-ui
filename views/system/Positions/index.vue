<script setup name="Positions">
import { useI18n } from 'vue-i18n';
import { useColumns } from './data';
import {useMenuStore} from "@jetlinks-web-core/store";
import { queryPage, del } from '@authentication-manager-ui/api/system/positions';
import {useRoute} from "vue-router";
import {onlyMessage} from "@jetlinks-web/utils";
import {transformConditionTerms} from '@authentication-manager-ui/views/system/conditionFilterUtils';
import PageHeader from '@jetlinks-web-core/components/PageHeader';

const { t: $t } = useI18n();
const params = ref({});
const permission = 'system/Positions';
const columns = useColumns(permission);
const menuStore = useMenuStore()
const tableRef = ref()

const _query = useRoute().query

const onAdd = (dt = {}) => {
  menuStore.jumpPage('system/Positions/Detail', {
    params: {
      id: ':id',
    },
    query: dt
  })
}

const onEdit = (record) => {
  menuStore.jumpPage('system/Positions/Detail', {
    params: {
      id: record.id,
    },
  })
}

const onDelete = (id) => {
  del(id).then(() => {
    onlyMessage($t('components.Item.641816-0'))
    tableRef.value.reload()
  })
}

onMounted(() => {
  if (_query.save) {
    setTimeout(() => {
      onAdd({sourceId: _query.sourceId})
    })
  }
})

const onSearch = ({filter}) => {
  params.value = {
    terms: transformConditionTerms(filter.terms, (term) => {
      if (term.column !== 'roles') {
        return term
      }

      // 关联查询列已包含查询语义，后端不接收额外的 termType。
      const {termType, ...rest} = term
      return {
        ...rest,
        column: 'id$position-role$position',
      }
    }),
  }
}

</script>

<template>
  <j-page-container>
    <PageHeader class="authentication-system-list-page__header" :title="$t('SystemList.positions')">
      <template #actions>
        <ConditionFilter
          class="authentication-system-list-page__filter"
          :columns="columns"
          target="system-position"
          @change="onSearch"
        />
        <j-permission-button
          class="authentication-system-list-page__primary-action"
          :hasPermission="`${permission}:add`"
          type="primary"
          @click="onAdd"
        >
          <AIcon type="PlusOutlined" />{{ $t('User.index.673867-0') }}
        </j-permission-button>
      </template>
    </PageHeader>
    <full-page>
      <j-pro-table
        ref="tableRef"
        mode="TABLE"
        :request="queryPage"
        :params="params"
        :columns="columns"
        :defaultParams="{
            sorts: [
                { name: 'createTime', order: 'desc' },
            ],
        }"
        :scroll="{ y: 'calc(100% - 3.75rem)' }"
      >
        <template #roles="record">
          <j-ellipsis>
            {{ record.roles?.map(item => item.name).join(',') || '' }}
          </j-ellipsis>
        </template>
        <template #parentId="record">
          <j-ellipsis>
            {{ record.parentName || '--' }}
          </j-ellipsis>
        </template>
        <template #orgId="record">
          <j-ellipsis>{{ record.orgName || record.orgId }}</j-ellipsis>
        </template>
        <template #action="slotProps">
          <a-space>
            <j-permission-button
              type="link"
              :hasPermission="`${permission}:update`"
              :tooltip="{ title: $t('User.index.673867-3') }"
              @click="onEdit(slotProps)"
            >
              <template #icon>
                <AIcon type="EditOutlined" />
              </template>
            </j-permission-button>
            <j-permission-button
              type="link"
              danger
              :hasPermission="`${permission}:delete`"
              :tooltip="{ title: $t('User.index.673867-8') }"
              :popConfirm="{
                title: $t('User.index.673867-9'),
                onConfirm: () => onDelete(slotProps.id),
              }"
            >
              <template #icon>
                <AIcon type="DeleteOutlined" />
              </template>
            </j-permission-button>
          </a-space>
        </template>
      </j-pro-table>
    </full-page>
  </j-page-container>
</template>

<style scoped lang="less">

</style>
