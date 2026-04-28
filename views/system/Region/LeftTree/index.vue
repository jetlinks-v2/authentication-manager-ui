<template>
  <a-input
    :placeholder="$t('LeftTree.index.191696-0')"
    class="search-input"
    v-model:value="searchValue"
    @change="(e) => onSearch(e.target.value)"
  >
    <template #prefix>
      <AIcon type="SearchOutlined" style="color: rgba(0, 0, 0, 0.45)" />
    </template>
  </a-input>
  <div style="display: flex; gap: 8px; margin: 18px 0">
    <a-button type="primary" class="btn" @click="() => onAdd()">{{
      $t("LeftTree.index.191696-1")
    }}</a-button>
  </div>
  <div class="tree-content">
    <ResizeObserver v-if="_treeData.length" @resize="divResize">
      <div style="height: 100%; width: 100%">
        <a-tree
          class="draggable-tree"
          draggable
          block-node
          v-model:expandedKeys="expandedKeys"
          :selectedKeys="selectedKeys"
          :tree-data="_treeData"
          :load-data="onLoadData"
          :show-line="{ showLeafIcon: false }"
          :show-icon="true"
          :field-names="{ key: 'id' }"
          :virtual="true"
          :height="heightSize"
          @drop="onDrop"
          @select="areaSelect"
        >
          <template #title="_data">
            <div class="tree-box">
              <div class="name">
                <j-ellipsis>{{ _data?.name }} ({{ _data.code }})</j-ellipsis>
              </div>
              <div class="actions">
                <a-space :size="8">
                  <a-tooltip :title="$t('LeftTree.index.191696-2')">
                    <a-button
                      @click.stop="onEdit(_data?.data)"
                      class="actions-btn"
                      type="link"
                    >
                      <AIcon type="EditOutlined" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('LeftTree.index.191696-3')">
                    <a-button
                      @click.stop="onAdd(_data?.data)"
                      class="actions-btn"
                      type="link"
                    >
                      <AIcon type="PlusCircleOutlined" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('LeftTree.index.191696-4')">
                    <j-permission-button
                      type="link"
                      style="margin: 0; padding: 0"
                      danger
                      :popConfirm="{
                        title: $t('LeftTree.index.191696-5'),
                        onConfirm: () => onRemove(_data?.id),
                      }"
                    >
                      <AIcon type="DeleteOutlined"
                    /></j-permission-button>
                  </a-tooltip>
                </a-space>
              </div>
            </div>
          </template>
        </a-tree>
      </div>
    </ResizeObserver>
    <div v-else class="tree-empty">
      <j-empty />
    </div>
  </div>
  <Save
    v-if="visible"
    :mode="mode"
    :data="current"
    :treeData="_treeData"
    :areaTree="areaTree"
    @save="onSave"
    @close="onClose"
  />
</template>
<script lang="ts" setup>
import { cloneDeep, debounce } from "lodash-es";
import { onMounted, ref, watch } from "vue";
import Save from "../Save/index.vue";
import { getRegionTree, delRegion, updateRegion,getRegion } from "@authentication-manager-ui/api/system/region";
import { useArea, useRegion } from "../hooks";
import ResizeObserver from "ant-design-vue/lib/vc-resize-observer";
import { onlyMessage } from "@jetlinks-web/utils";
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n();
const regionState = useRegion();
const treeData = ref<any[]>([]);
const _treeData = ref<any[]>([]);
const visible = ref<boolean>(false);
const current = ref<any>({});
const mode = ref<"add" | "edit">("add");
const searchValue = ref<string>();
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

const heightSize = ref(550);
const type = ref<string | undefined>(undefined);

const { areaTree } = useArea();

const emit = defineEmits(["select", "close"]);

const filterTreeNodes = (tree: any[], condition: string) => {
  return tree.filter((item) => {
    if (item?.name && item.name.includes(condition)) {
      return true;
    }

    if (item?.code && item.code.includes(condition)) {
      return true;
    }

    if (item.children) {
      item.children = filterTreeNodes(item.children, condition);
      return !!item.children.length;
    }

    return false;
  });
};

const findNodeById = (nodes: any[], targetId: string): any => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const getTreeId = (data: any[], cb: (id: string) => void) => {
  data.forEach((item) => {
    if (item.children) {
      cb?.(item.id);
      getTreeId(item.children, cb);
    }
  });
};

const onSearch = debounce((v: string) => {
  _treeData.value = v
    ? filterTreeNodes(cloneDeep(treeData.value), v)
    : cloneDeep(treeData.value);
  expandedKeys.value = [];
  if (v) {
    getTreeId(_treeData.value, (id: string) => {
      expandedKeys.value.push(id);
    });
    expandedKeys.value = [...expandedKeys.value];
  }
}, 300);

const onSave = async () => {
  visible.value = false;

  // 如果是编辑顶级节点，只更新该节点的数据，保留其children和展开状态
  if (mode.value === 'edit' && !current.value?.parentId) {
    // 获取最新的节点数据
    const resp = await getRegion({
      paging: false,
      terms: [{
        column: 'id',
        value: current.value.id,
        termType: "eq",
      }],
    });

    if (resp.success && resp.result && resp.result.length > 0) {
      const updatedData = resp.result[0];

      // 递归更新树节点，保留children
      const updateNodeData = (nodes: any[]): any[] => {
        return nodes.map(node => {
          if (node.id === current.value.id) {
            return {
              ...updatedData,
              key: updatedData.id,
              title: updatedData.name,
              isLeaf: node.isLeaf,
              children: node.children, // 保留原有的children
            };
          }
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: updateNodeData(node.children)
            };
          }
          return node;
        });
      };

      treeData.value = updateNodeData(treeData.value);
    }
  }
  // 如果是添加顶级节点，重新加载根节点
  else if (mode.value === 'add' && !current.value?.parentId) {
    await handleSearch();
  }
  // 如果是添加或编辑子节点,重新加载父节点的子节点数据
  else {
    const parentNode = findNodeById(treeData.value, current.value.parentId);
    if (parentNode) {
      // 保存父节点下已展开的子节点ID
      const childExpandedKeys = expandedKeys.value.filter(key => {
        const node = findNodeById(parentNode.children || [], key);
        return !!node;
      });

      // 通过重新创建树结构来标记节点需要重新加载
      const markNodeForReload = (nodes: any[], targetId: string): any[] => {
        return nodes.map(node => {
          if (node.id === targetId) {
            // 删除children属性,标记为需要重新加载
            const { children, ...rest } = node;
            return rest;
          }
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: markNodeForReload(node.children, targetId)
            };
          }
          return node;
        });
      };

      // 标记父节点需要重新加载
      treeData.value = markNodeForReload(treeData.value, current.value.parentId);

      // 重新加载父节点
      const reloadedParent = findNodeById(treeData.value, current.value.parentId);
      if (reloadedParent) {
        await onLoadData(reloadedParent);
      }

      // 递归重新加载已展开的子节点数据
      const reloadExpandedChildren = async (parentId: string) => {
        const parent = findNodeById(treeData.value, parentId);
        if (!parent || !parent.children || parent.children.length === 0) return;

        // 先收集需要重新加载的子节点ID
        const childrenToReload = parent.children
          .filter(child => childExpandedKeys.includes(child.id))
          .map(child => child.id);

        // 逐个标记并重新加载
        for (const childId of childrenToReload) {
          // 标记节点需要重新加载
          treeData.value = markNodeForReload(treeData.value, childId);

          // 重新获取节点并加载
          const childNode = findNodeById(treeData.value, childId);
          if (childNode) {
            await onLoadData(childNode);
            await reloadExpandedChildren(childId);
          }
        }
      };

      if (childExpandedKeys.length > 0) {
        await reloadExpandedChildren(current.value.parentId);
      }

      // 确保父节点保持展开状态
      if (!expandedKeys.value.includes(current.value.parentId)) {
        expandedKeys.value.push(current.value.parentId);
      }
    }
  }
};

const onClose = () => {
  visible.value = false;
  emit("close");
};

const divResize = ({height}) => {
  setTimeout(() => {
    heightSize.value = height;
  }, 300);
};

const onEdit = (_data: any) => {
  mode.value = "edit";
  current.value = _data;
  visible.value = true;
  selectedKeys.value = [_data.id];
  emit("select", _data?.code, _data);
};

const onRemove = async (id: string) => {
  const response = delRegion(id);
  response.then(async (resp) => {
    if (resp.success) {
      onlyMessage($t("LeftTree.index.191696-6"));

      // 从树中移除被删除的节点,保持其他节点的展开状态
      const removeNodeById = (nodes: any[], targetId: string): any[] => {
        return nodes.filter(node => {
          if (node.id === targetId) {
            return false;
          }
          if (node.children && node.children.length > 0) {
            node.children = removeNodeById(node.children, targetId);
          }
          return true;
        });
      };

      treeData.value = removeNodeById(treeData.value, id);

      // 从expandedKeys中移除被删除的节点
      expandedKeys.value = expandedKeys.value.filter(key => key !== id);

      // 如果删除的是当前选中的节点,清空选中状态
      if (selectedKeys.value.includes(id)) {
        selectedKeys.value = [];
        // 默认选择第一个根节点
        const firstNode = treeData.value?.[0];
        if (firstNode) {
          selectedKeys.value = [firstNode.id];
          emit("select", firstNode.code, firstNode);
        }
      }
    }
  });
  return response;
};

const onAdd = (_data?: any) => {
  mode.value = "add";
  const _children = _data ? _data.children || [] : _treeData.value;
  const lastItem = _children.length ? _children[_children.length - 1] : null;
  const sortIndex = lastItem ? lastItem.sortIndex + 1 : 1;
  current.value = _data
    ? {
        parentId: _data.id,
        parentFullName: _data.fullName,
        sortIndex: sortIndex,
      }
    : {
        parentId: undefined,
        parentFullName: undefined,
        sortIndex: sortIndex,
      };

  visible.value = true;
};

const onDrop = (info: any) => {
  const dropKey = info.node.key;
  const dragKey = info.dragNode.key;
  const dropPos = info.node.pos.split("-");
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

  const loop = (
    data: any,
    key: string | number,
    callback: any,
    parent?: any,
  ) => {
    data.forEach((item: any, index: number) => {
      if (item.id === key) {
        return callback(item, index, data, parent);
      }
      if (item.children) {
        return loop(item.children, key, callback, item);
      }
    });
  };
  const data = [...treeData.value];
  // // Find dragObject
  let dragObj: any;
  loop(data, dragKey, (item: any, index: number, arr: any[]) => {
    arr.splice(index, 1);
    dragObj = item;
  });

  if (!info.dropToGap) {
    // Drop on the content
    loop(data, dropKey, (item: any) => {
      item.children = item.children || [];
      /// where to insert 示例添加到头部，可以是随意位置
      dragObj.parentId = item.id;
      item.children.unshift(dragObj);
      item.children = item.children.map((cl: any, clIndex: number) => {
        cl.sortIndex = clIndex + 1;
        return cl;
      });
      updateRegion(dragObj);
    });
  } else if (
    (info.node.children || []).length > 0 && // Has children
    info.node.expanded && // Is expanded
    dropPosition === 1 // On the bottom gap
  ) {
    loop(
      data,
      dropKey,
      (item: any, index: number, _data: any[], parent: any) => {
        item.children = item.children || [];
        // where to insert 示例添加到头部，可以是随意位置
        dragObj.parentId = item.parentId;
        item.children = item.children.map((cl: any, clIndex: number) => {
          cl.sortIndex = clIndex + 1;
          return cl;
        });

        _data.splice(index + 1, 0, dragObj);
        // 获取item的父级，将dragObj放入同级
        updateRegion(item);
        updateRegion(dragObj);
      },
    );
  } else {
    loop(
      data,
      dropKey,
      (_item: any, index: number, arr: any[], parent: any) => {
        dragObj.parentId = parent ? parent.id : "";
        dragObj.sortIndex = dropPosition === -1 ? index : index + 1;
        arr.splice(dragObj.sortIndex, 0, dragObj);
        const sortArray = arr.map((cl: any, clIndex: number) => {
          cl.sortIndex = clIndex + 1;
          return cl;
        });
        if (parent) {
          parent.children = sortArray;
          updateRegion(parent);
        } else {
          updateRegion(arr);
        }
      },
    );
  }

  treeData.value = data;
};

watch(
  () => treeData.value,
  () => {
    if (searchValue.value) {
      onSearch(searchValue.value);
    } else {
      _treeData.value = treeData.value;
    }
  },
  {
    deep: true,
    immediate: true,
  },
);

/**
 * 区域选择
 */
const areaSelect = (key, { node }) => {
  if (!key.length) return;
  selectedKeys.value = key;
  emit("select", node?.code, node);
};

const handleSearch = async () => {
  // 只加载根节点数据（level = 1 或 parentId 为空的节点）
  const resp = await getRegion({
    paging: false,
    sorts: [{name: "sortIndex", order: "asc"}],
    terms: [{
      column: 'level',
      value: 1,
      termType: "eq",
    }],
  });

  if (resp.success) {
    // 处理根节点数据，设置异步加载所需的属性
    const rootNodes = (resp.result || []).map((item: any) => ({
      ...item,
      key: item.id,
      title: item.name,
      isLeaf: false, // 默认都不是叶子节点，允许展开查询
      // children设置为undefined表示未加载,空数组表示已加载但没有子节点
    }));

    treeData.value = rootNodes;

    // 默认选择第一个数据
    const dt = treeData.value?.[0];
    if (dt) {
      selectedKeys.value = dt?.id ? [dt?.id] : [];
      emit("select", dt?.code, dt);
    }
  }
};

// 异步加载子节点数据
const onLoadData = async (treeNode: any) => {
  return new Promise<void>(async (resolve) => {
    // 修改检查逻辑:只要children不是undefined,就说明已经加载过
    if (treeNode.children !== undefined && treeNode.children !== null) {
      resolve();
      return;
    }

    try {
      const params = {
        paging: false,
        sorts: [{name: "sortIndex", order: "asc"}],
        terms: [{
          column: 'parentId',
          value: treeNode.id,
          termType: "eq",
        }],
      };

      const resp = await getRegion(params);
      if (resp.success) {
        const children = (resp.result || []).map((item: any) => ({
          ...item,
          key: item.id,
          title: item.name,
          isLeaf: false, // 默认都不是叶子节点，允许展开查询
        }));

        // 递归更新树节点
        const updateTreeNode = (nodes: any[], targetId: string, newChildren: any[]): any[] => {
          return nodes.map(node => {
            if (node.id === targetId) {
              return {
                ...node,
                // 不管有没有子节点,都设置为数组,表示已加载
                children: newChildren,
                isLeaf: newChildren.length === 0
              };
            }
            if (node.children && node.children.length > 0) {
              return {
                ...node,
                children: updateTreeNode(node.children, targetId, newChildren)
              };
            }
            return node;
          });
        };

        // 更新树数据
        treeData.value = updateTreeNode(treeData.value, treeNode.id, children);
      }
    } catch (error) {
      console.error('加载子节点失败:', error);
    }

    resolve();
  });
};

// const getRegionTreeById = async (id?:string) => {
//   const params:any = {
//     paging: false,
//     sorts: [{ name: "sortIndex", order: "asc" }],
//     terms: [{
//       column:'level',
//       value: 1,
//       termType: "eq",
//     }],
//   }
//   if(id){
//     params.terms.push({
//       column: "id",
//       value: id,
//       type: "and",
//       termType: "eq",
//     })
//   }
//   const resp = await getRegion(params);
//   if (resp.success) {
//     console.log('====',resp);
//     // return resp?.result || [];
//   }
// };

const openSave = (geoJson: Record<string, any>) => {
  if (geoJson) {
    regionState.saveCache.geoJson = geoJson;
  }
  current.value = regionState.saveCache;
  visible.value = true;
  regionState.treeMask = false;
};

defineExpose({
  openSave: openSave,
});

onMounted(() => {
  handleSearch();
});
</script>

<style lang="less" scoped>
.btn {
  flex: 1;
  min-width: 0;
}

.tree-content {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;

  .tree-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 100px;
    width: 100%;
  }
}

:deep(.ant-tree-node-content-wrapper) {
  transform: translateY(-4px) !important;
}

.tree-box {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .actions {
    padding-right: 4px;

    .actions-btn {
      margin: 0;
      padding: 0;
    }
  }
}
</style>
