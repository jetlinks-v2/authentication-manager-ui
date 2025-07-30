<template>
  <j-pro-table
    mode="TABLE"
    type="TREE"
    :columns="columns"
    :request="getTreeData_api"
    :multiple="false"
    :defaultParams="{
      paging: false,
      sorts: [
        { name: 'sortIndex', order: 'asc' },
        { name: 'name', order: 'asc' }
      ]
    }"
    :scroll="{ y: '300px' }"
    :rowSelection="{
      type: 'radio',
      selectedRowKeys,
      onSelect,
      onSelectNone,
    }"
  >

  </j-pro-table>
</template>

<script setup lang="ts">
import { getTreeData_api } from '@authentication-manager/api/system/department'
const columns = [
  {
    title: '名称',
    key: 'name',
    dataIndex: 'name',
    search: {
      type: 'string'
    }
  },
  {
    title: '排序',
    key: 'sort',
    dataIndex: 'sort'
  }
]

const selectedRowKeys = ref<string[]>([])

const onSelect = (record: Record<string, any>) => {
  selectedRowKeys.value = [record.id]
}

const onSelectNone = () => {
  selectedRowKeys.value = [];
}
</script>

<style scoped lang="less">

</style>