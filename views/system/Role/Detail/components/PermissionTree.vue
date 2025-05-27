<template>
  <div class="permission-tree-container">
    <a-table
        :columns="columns"
        :data-source="tableData"
        :pagination="false"
        :rowKey="'id'"
        :scroll="{ y: '50vh' }"
        ref="treeRef"
    >
      <template #headerCell="{ column }">
        <div v-if="column.key === 'menu'">
          <a-checkbox
              :checked="selectedAll.selectedAll"
              :indeterminate="selectedAll.indeterminate"
              @change="selectAllChange">
            {{ $t('components.PermissionTree.954862-0') }}
          </a-checkbox>
        </div>
        <div v-else-if="column.key === 'action'">
          <span style="">{{ $t('components.PermissionTree.954862-6') }}</span>
          <a-checkbox
              v-model:checked="action.visible"
              style="margin-left: 10px"
              @change="action.data = []"
          >{{ $t('components.PermissionTree.954862-3') }}
          </a-checkbox>
          <a-select
              v-show="action.visible"
              v-model:value="action.data"
              style="width: 200px"
              :options="action.options"
              @change="onActionChange"
              :placeholder="$t('components.PermissionTree.954862-4')"
              mode="multiple"
              :max-tag-count="1"
          />
        </div>
        <div v-else-if="column.key === 'data'">
          <span style="">{{ $t('components.PermissionTree.954862-1') }}</span>
          <a-tooltip>
            <template #title>{{ $t('components.PermissionTree.954862-2') }}</template>
            <AIcon type="QuestionCircleOutlined"/>
          </a-tooltip>
          <a-checkbox
              v-model:checked="dataPermission.visible"
              @change="dataPermission.data = undefined"
              style="margin-left: 10px"
          >
            {{ $t('components.PermissionTree.954862-3') }}
          </a-checkbox>
          <a-select
              v-show="dataPermission.visible"
              v-model:value="dataPermission.data"
              style="width: 200px"
              :options="dataPermission.options"
              @change="bulkChange"
              :placeholder="$t('components.PermissionTree.954862-4')"
          />
        </div>
        <div v-else>
          <span>{{ column.title }}</span>
        </div>
      </template>
      <!-- 表格内容 -->
      <template #bodyCell="{ column, record }">
        <div :id="record.id"></div>
        <div v-if="column.key === 'menu'">
          <MenuCheckbox
              :data="flatTableData[record.id]"
              @change="(e) => menuChange(flatTableData[record.id], e)"
          />
        </div>
        <div v-else-if="column.key === 'action'">
          <div v-if="flatTableData[record.id].buttons && flatTableData[record.id].buttons.length > 0">
            <a-checkbox
                v-for="button in flatTableData[record.id].buttons"
                v-model:checked="button.granted"
                :disabled='flatTableData[record.id].code === USER_CENTER_MENU_CODE && button.id === "view"'
                :key="button.id"
                @change="actionChange(record.id, true)"
            >{{ button.i18nName || button.name }}
            </a-checkbox>
          </div>
        </div>
        <div v-else-if="column.key === 'data'">
          <span v-if="flatTableData[record.id].accessSupport === undefined">
              {{ $t('components.PermissionTree.954862-5') }}
          </span>
          <div v-else-if="flatTableData[record.id].accessSupport.value === 'support'">
            <a-radio-group
                v-model:value="flatTableData[record.id].selectAccesses"
                @change="resetBulk"
            >
              <a-radio
                  :value="asset.supportId"
                  v-for="asset in flatTableData[record.id]?.assetAccesses || []"
                  :key="asset.name"
              >{{ asset.i18nName || asset.name }}
              </a-radio>
            </a-radio-group>
          </div>
          <span
              v-else-if="
                  record.accessSupport.value === 'indirect' ||
                  record.accessSupport.value === 'unsupported'
              "
          >{{ record.accessDescription }}</span>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup name="RolePermissionTree">
import {USER_CENTER_MENU_CODE} from '@/utils/consts'
import {useI18n} from 'vue-i18n';
import MenuCheckbox from './MenuCheckbox.vue'
import {isNoCommunity} from '@/utils/utils'
import {getPermissionTree_api} from "@authentication-manager/api/system/role";
import {paramsEncodeQuery} from "@/utils";
import {NotificationSubscriptionCode} from "@/router/menu";
import {cloneDeep, omit, uniqBy} from "lodash-es";

const {t: $t} = useI18n();
const emits = defineEmits(['update:selectItems']);
const route = useRoute();
const treeRef = ref();
const tableData = ref([]);
const flatTableData = reactive({});
const action = reactive({
  visible: false,
  options: [],
  data: []
});

const dataPermission = reactive({
  visible: false,
  options: [],
  data: undefined
})

const columns = computed(() => {
  const arr = [
    {
      title: $t('components.PermissionTree.954862-0'),
      dataIndex: 'menu',
      key: 'menu',
      width: '25%',
    },
    {
      title: $t('components.PermissionTree.954862-6'),
      dataIndex: 'action',
      key: 'action',
      width: '35%',
    },
  ];
  if (isNoCommunity) {
    arr.push({
      title: '数据权限',
      dataIndex: 'data',
      key: 'data',
      width: '40%',
    })
  }
  return arr
})

const selectedAll = computed(() => {
  const arr = Object.values(flatTableData)
  const selectList = arr.filter((item) => item._granted); // 第一列选中的项
  // 判断是全选/半全选
  if (selectList.length === arr.length) {
    return {
      selectedAll: true,
      indeterminate: false
    }
  } else if (selectList.length > 0) {
    return {
      selectedAll: false,
      indeterminate: true
    }
  }
  return {
    selectedAll: false,
    indeterminate: false
  }
})
const selectAllChange = (e) => {
  const checked = e.target.checked
  Object.keys(flatTableData).forEach(key => {
    const item = flatTableData[key];
    const flag = item.code === USER_CENTER_MENU_CODE
    // 改变菜单
    if (flag) {
      item._granted = checked;
      item.indeterminate = !checked;
    } else {
      item._granted = checked;
      item.indeterminate = false;
    }
    // 改变按钮
    item.buttons?.forEach((button) => {
      if (!(flag && button?.id === 'view')) {
        button.granted = checked;
      }
    });
    if (checked) {
      // 全选
      item.selectAccesses = 'creator';
    } else {
      // 取消全选
      item.selectAccesses = undefined;
    }
  });
}

const bulkChange = () => {
  if (!dataPermission.visible) return;
  Object.keys(flatTableData).forEach(key => {
    const item = flatTableData[key];
    if (item.granted && item.accessSupport && item.accessSupport.value === 'support') {
      item.selectAccesses = dataPermission.data;
    }
  });
}

const onActionChange = () => {
  if (!action.visible) return;
  Object.keys(flatTableData).forEach(key => {
    const item = flatTableData[key];
    if (item.buttons && item.buttons.length > 0) {
      item.buttons?.forEach((i) => {
        i.granted = action.data.includes(i.id)
      });
      actionChange(key, false)
    }
  });
}

const resetBulk = () => {
  action.data = [];
  action.visible = false;
  dataPermission.data = undefined;
  dataPermission.visible = false;
}

const getGrantedData = (id) => {
  const row = flatTableData[id]
  // children
  const arr = row?.children || []
  const _data = arr.filter(i => {
    return flatTableData[i.id]?._granted
  }) // 1: true, 0: 没值 -1:false
  const flag = !arr.length ? 0 : arr.length === _data.length ? 1 : -1;
  // 按钮
  const _buttons = row.buttons || []
  const __buttons = _buttons.filter(i => i.granted)
  const _flag = !_buttons.length ? 0 : _buttons.length === __buttons.length ? 1 : -1;
  if (flag === 0 && _flag === 0) {
    flatTableData[id]._granted = row.granted
    flatTableData[id].indeterminate = false
  } else if ((flag === 1 && _flag === 1) || (flag === 1 && _flag === 0) || (flag === 0 && _flag === 1)) {
    flatTableData[id]._granted = true
    flatTableData[id].indeterminate = false
  } else {
    flatTableData[id]._granted = false
    flatTableData[id].indeterminate = !!(_data.length || __buttons.length)
  }
}

const updateParent = (id) => {
  if (id) {
    getGrantedData(id)
    if (flatTableData[id].parentId) {
      updateParent(flatTableData[id].parentId)
    }
  }
}

// 更新一个数据需要考虑该条数据的父、子，buttons, selectAccesses
const updateRowData = (row, checked) => {
  row._granted = checked;
  row.indeterminate = false;
  // 修改buttons
  if (row.buttons && row.buttons.length > 0) {
    row.buttons.forEach((button) => {
      button.granted = checked
    })
  }
  // 修改数据权限
  if (row.assetAccesses && row.assetAccesses.length > 0) {
    row.selectAccesses = checked ? (row.selectAccesses || 'creator') : undefined
  }
  // 修改children的值
  if (row.children && row.children.length > 0) {
    row.children.forEach((child) => {
      updateRowData(flatTableData[child.id], checked)
    })
  }
  // 父节点
  if (row.parentId) {
    updateParent(row.parentId)
  }
}

const menuChange = (row, checked) => {
  // 关闭批量操作
  resetBulk()
  updateRowData(row, checked)
}

/**
 * 修改按钮的权限
 */
const actionChange = (id, flag) => {
  // 关闭批量操作
  if (flag) {
    resetBulk()
  }
  getGrantedData(id)
  if (flatTableData[id].parentId) {
    updateParent(flatTableData[id].parentId)
  }
}

const handleData = (_dt = []) => {
  return _dt.filter(i => (i.code !== NotificationSubscriptionCode)).map((item) => {
    // 默认选中个人中心相关设置
    if (item.code === USER_CENTER_MENU_CODE) {
      item.buttons = item.buttons.map(buttonItem => {
        if (buttonItem.id === 'view') {
          buttonItem.granted = true
        }
        return buttonItem
      })
    }
    // 数据权限处理
    if (item.accessSupport && item.accessSupport.value === 'support') {
      const select = item.assetAccesses?.find((assetItem) => assetItem.granted) || {};
      item.selectAccesses = select.supportId || undefined;
    }
    // 按钮数据组件内部自己处理
    if (item.children && item.children.length > 0) {
      item.children = handleData(item.children)
    }
    flatTableData[item.id] = item;
    getGrantedData(item.id)
    return item
  });
}

function sortAndDeduplicate(arr) {
  // 统计每个id的出现次数
  const countMap = arr.reduce((acc, cur) => {
    acc[cur.id] = (acc[cur.id] || 0) + 1;
    return acc;
  }, {});

  // 根据id出现次数降序排序，次数相同则保持原顺序（稳定排序）
  const sorted = [...arr].sort((a, b) => {
    return countMap[b.id] - countMap[a.id];
  });

  // 去重，保留每个id的第一个出现项
  const seen = new Set();
  return sorted.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const getAllPermission = async () => {
  const id = route.params.id;
  if (!id) return;
  // 查询权限树
  const resp = await getPermissionTree_api(id, paramsEncodeQuery({
    terms: [
      {
        value: "%show\":false%",
        termType: "nlike",
        column: "options"
      }
    ]
  }))
  if (resp.success) {
    const _result = resp.result
    let assets = [];
    let _buttons = []
    tableData.value = handleData(_result)
    // 根据所有权限, 取assetAccesses并集数据
    const arr = Object.values(flatTableData)

    arr?.forEach((item) => {
      if (isNoCommunity) {
        assets = [...assets, ...item.assetAccesses];
      }
      _buttons = [..._buttons, ...(item.buttons || [])];
    });
    // 下拉框中显示的数据为所有操作按钮名称（去重显示），按照出现频次从大到小排列
    action.options = sortAndDeduplicate(_buttons).map((m) => ({
      label: `${(m.i18nName || m.name)}(${m.id})`,
      value: m.id,
    }));
    dataPermission.options = uniqBy(assets, 'supportId')?.map((m) => ({
      label: m.i18nName || m.name,
      value: m.supportId,
    }));
  }
}

const onSave = () => {
  const arr = Object.values(flatTableData);
  // 深克隆表格数据的扁平版  因为会做一些改动 该改动只用于反馈给父组件，本组件无需变化
  const selected = cloneDeep(arr).filter(item => (item.indeterminate && item.buttons) || (item._granted));
  selected.forEach((item) => {
    if (item.accessSupport && item.accessSupport.value === 'support' && item.selectAccesses) {
      item.assetAccesses?.forEach((asset) => {
        if (asset.supportId === item.selectAccesses) {
          asset.granted = true;
        } else {
          asset.granted = false;
        }
      });
      delete item.selectAccesses;
    }
    delete item.indeterminate;
    item.granted = true;
  });
  return selected
}

onMounted(() => {
  getAllPermission();
});

defineExpose({onSave})
</script>

<style lang="less" scoped>
.permission-tree-container {
  :deep(.ant-checkbox-wrapper) {
    margin-left: 0;
  }
}
</style>
