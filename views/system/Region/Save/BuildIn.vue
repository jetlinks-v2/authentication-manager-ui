<template>
  <a-tree-select
      showSearch
      :placeholder="$t('Save.BuildIn.317807-0')"
      :tree-data="areaTree"
      :value="_value"
      :field-names="{
            label: 'name',
            value: 'code'
        }"
      tree-node-filter-prop="name"
      :loadData="onLoadData"
      @select="onSelect"
  >
    <template #title="{ name, code }">
      <span v-if="code">{{ name }} | {{ code }}</span>
    </template>
  </a-tree-select>
  <a-checkbox
      v-model:checked="mySync"
      @change="onCheckChange"
      style="margin-top: 5px"
  >{{ $t('Save.BuildIn.317807-1') }}</a-checkbox
  >
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {getAreaList, getAreaParentList} from "@authentication-manager/api/system/region";

const { t: $t } = useI18n();
const props = defineProps({
  value: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  children: {
    type: Array,
    default: () => [],
  },
  // areaTree: {
  //   type: Array,
  //   default: () => [],
  // },
  sync: {
    type: Boolean,
    default: true
  }
});

const emits = defineEmits(['update:value', 'update:name', 'update:children', 'update:sync']);

const features = ref<any>({});
const _value = ref<string>();
const mySync = ref<boolean>(props.sync);
const areaTree = ref([])

const findChildren = (data: any, code: string) => {
  let children: any[] = []

  data.some((item: any) => {
    if (item.code === code) {
      children = item.children
      return true
    }

    if (item.children) {
      children = findChildren(item.children, code)
      return !!children.length
    }

    return false
  })

  return children
}

const onCheckChange = (e: any) => {
  emits('update:sync', e.target.checked)
};

const getObj = (node: any): any => {
  const _children = (node?.children || []).map((item: any) => {
    return {
      code: item.code,
      name: item.name,
      parentId: item.parentId,
    };
  });
  return {
    code: node.code,
    name: node.name,
    parentId: node.parentId,
    children: _children,
  };
};

const onSelect = (val: string, node: any) => {

  _value.value = val;

  emits('update:name', node.name);
  emits('update:value', node.code);
};

const onLoadData = (treeNode: any) => {
  return new Promise((resolve) => {
    if (treeNode.children) {
      resolve();
      return;
    }
    const params = {
      terms: [{
        column: 'parentId',
        value: treeNode.key
      }]
    }

    getAreaList(params).then(resp => {
      if (resp.success) {
        treeNode.dataRef.children = resp.result
        resolve()
      }
    })
  })
}

getAreaList().then(resp => {
  if (resp.success) {
    areaTree.value = resp.result
  }
})

const getAllChildren = (pId: string) => {

  // 递归获取所有子级
  const getChildren = (data: any[]) => {
    getAreaList({
      terms: [{
        column: 'parentId',
        value: data[0].id
      }]
    }).then(resp => {
      if (resp.success) {
        data[0].children = resp.result
        if (data[0].children) {
          getChildren(data[0].children)
        }
      }
    })
  }

  // 根据当前id获取所有父级
  getAreaParentList([pId]).then(resp => {
    if (resp.success) {
      areaTree.value = resp.result
      if (resp.children) {
        getChildren(areaTree.value)
      }
    }
  })
}

if (props.value) {
  getAllChildren(_value.value)
}

watch(
    () => props.value,
    () => {
      if (props.value) {
        _value.value = props.value as string

        //
      } else {
        emits('update:name', $t('Save.BuildIn.317807-2'));
        emits('update:value', '100000');
      }
    },
    {
      deep: true,
      immediate: true,
    },
);

watch(() => props.sync, () => {
  mySync.value = props.sync
}, { immediate: true})
</script>
