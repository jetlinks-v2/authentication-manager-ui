<template>
    <div class="product-container">
        <pro-search
            :columns="columns"
            target="category-product"
            noMargin
            @search="(params:any)=>queryParams = {...params}"
            ref="searchRef"
        />
        <FullPage :extraHeight="24">
            <j-pro-table
                ref="tableRef"
                :request="table.requestFun"
                :gridColumn="2"
                :gridColumns="[2]"
                modeValue="CARD"
                :params="queryParams"
                :rowSelection="{
                    selectedRowKeys: tableData._selectedRowKeys,
                    onSelect: table.onSelect,
                    onSelectAll: table.onSelectAll,
                    onSelectNone: table.cancelSelect
                }"
                :columns="columns"
            >
                <template #headerLeftRender>
                    <a-space>
                        <j-permission-button
                            :hasPermission="`${permission}:assert`"
                            type="primary"
                            @click="dialogs.addShow = true"
                        >
                            <AIcon type="PlusOutlined" />{{ $t('product.index.083446-0') }}
                        </j-permission-button>
                        <a-dropdown trigger="hover">
                            <a-button>{{ $t('product.index.083446-1') }}</a-button>
                            <template #overlay>
                                <a-menu>
                                    <a-menu-item>
                                        <j-permission-button
                                            :hasPermission="`${permission}:bind`"
                                            :popConfirm="{
                                                title: $t('product.index.083446-2'),
                                                onConfirm: () =>
                                                    table.clickUnBind(),
                                            }"
                                        >
                                            <AIcon
                                                type="DisconnectOutlined"
                                            />{{ $t('product.index.083446-3') }}
                                        </j-permission-button>
                                    </a-menu-item>
                                    <a-menu-item>
                                        <j-permission-button
                                            :hasPermission="`${permission}:assert`"
                                            @click="() => table.clickEdit()"
                                        >
                                            <AIcon
                                                type="EditOutlined"
                                            />{{ $t('product.index.083446-4') }}
                                        </j-permission-button>
                                    </a-menu-item>
                                </a-menu>
                            </template>
                        </a-dropdown>
                    </a-space>
                </template>

                <template #card="slotProps">
                    <CardBox
                        :value="slotProps"
                        :actions="table.getActions(slotProps, 'card')"
                        v-bind="slotProps"
                        :active="
                            tableData._selectedRowKeys.includes(slotProps.id)
                        "
                        @click="table.onSelectChange"
                        :status="slotProps.state?.value"
                        :statusText="slotProps.state?.text"
                        :statusNames="{
                            online: 'processing',
                            offline: 'error',
                        }"
                    >
                        <template #img>
                            <slot name="img">
                                <img
                                    :src="systemImg.deviceProductImg"
                                    style="cursor: pointer"
                                />
                            </slot>
                        </template>
                        <template #content>
                            <h3 class="card-item-content-title" style='margin-bottom: 18px;'>
                                {{ slotProps.name }}
                            </h3>
                            <a-row>
                                <a-col :span="12">
                                    <div class="card-item-content-text">ID</div>
                                    <j-ellipsis style="width: calc(100% - 20px);">
                                    <div
                                        style="cursor: pointer"
                                        class="card-item-content-value"
                                    >
                                        {{ slotProps.id }}
                                    </div>
                                    </j-ellipsis>
                                </a-col>
                                <a-col :span="12">
                                    <div class="card-item-content-text">
                                        {{ $t('product.index.083446-5') }}
                                    </div>
                                    <j-ellipsis style="width: calc(100% - 20px);">
                                    <div
                                        style="cursor: pointer"
                                        class="card-item-content-value"
                                    >
                                        {{
                                            tableData.permissionList.length &&
                                            table.getPermissLabel(
                                                slotProps.permission,
                                            )
                                        }}
                                    </div>
                                    </j-ellipsis>
                                </a-col>
                            </a-row>
                        </template>
                        <template #actions="item">
                            <a-tooltip
                                v-bind="item.tooltip"
                                :title="item.disabled && item.tooltip.title"
                            >
                                <a-dropdown
                                    placement="bottomRight"
                                    v-if="item.key === 'others'"
                                >
                                    <a-button>
                                        <AIcon :type="item.icon" />
                                        <span>{{ item.text }}</span>
                                    </a-button>
                                    <template #overlay>
                                        <a-menu>
                                            <a-menu-item
                                                v-for="(o, i) in item.children"
                                                :key="i"
                                            >
                                                <a-button
                                                    type="link"
                                                    @click="o.onClick"
                                                >
                                                    <AIcon :type="o.icon" />
                                                    <span>{{ o.text }}</span>
                                                </a-button>
                                            </a-menu-item>
                                        </a-menu>
                                    </template>
                                </a-dropdown>
                                <j-permission-button
                                    v-else
                                    :hasPermission="item.permission"
                                    :tooltip="item.tooltip"
                                    :pop-confirm="item.popConfirm"
                                    @click="item.onClick"
                                    :disabled="item.disabled"
                                >
                                    <AIcon :type="item.icon" />
                                    <span v-if="item.key !== 'delete'">{{
                                        item.text
                                    }}</span>
                                </j-permission-button>
                            </a-tooltip>
                        </template>
                    </CardBox>
                </template>

                <template #permission="slotProps">
                    {{
                        tableData.permissionList.length &&
                        table.getPermissLabel(slotProps.permission)
                    }}
                </template>
                <template #state="slotProps">
                    <j-badge-status
                        :status="slotProps.state.value"
                        :text="slotProps.state.text"
                        :statusNames="{
                            online: 'processing',
                            offline: 'error',
                        }"
                    ></j-badge-status>
                </template>
                <template #action="slotProps">
                    <a-space :size="16">
                        <j-permission-button
                            v-for="i in table.getActions(slotProps, 'table')"
                            :hasPermission="i.permission"
                            type="link"
                            :key="i.key"
                            :tooltip="i?.tooltip"
                            :pop-confirm="i.popConfirm"
                            @click="i.onClick"
                            :disabled="i?.disabled"
                        >
                            <AIcon :type="i.icon" />
                        </j-permission-button>
                    </a-space>
                </template>
            </j-pro-table>
        </FullPage>

        <div class="dialogs">
            <AddDeviceOrProductDialog
                v-if="dialogs.addShow"
                v-model:visible="dialogs.addShow"
                :query-columns="columns"
                :parent-id="parentId"
                :all-permission="tableData.permissionList"
                asset-type="product"
                @confirm="table.addConfirm"
                @next="nextAction"
            />
            <EditPermissionDialog
                v-if="dialogs.editShow"
                v-model:visible="dialogs.editShow"
                :ids="dialogs.selectIds"
                :permission-list="dialogs.permissList"
                :parent-id="parentId"
                :all-permission="tableData.permissionList"
                asset-type="product"
                :defaultPermission="tableData.defaultPermission"
                @confirm="table.refresh"
            />
            <NextDialog
                v-if="dialogs.nextShow"
                v-model:visible="dialogs.nextShow"
                @confirm="nextConfirm"
            />
        </div>
    </div>
</template>

<script setup lang="ts" name="product">

import AddDeviceOrProductDialog from '../components/AddDeviceOrProductDialog.vue';
import EditPermissionDialog from '../components/EditPermissionDialog.vue';
import NextDialog from '../components/NextDialog.vue';
import { onlyMessage } from '@/utils/comm';
import {
    getDeviceOrProductList_api,
    getPermission_api,
    getPermissionDict_api,
    unBindDeviceOrProduct_api,
    getBindingsPermission,
} from '@authentication-manager/api/system/department';
import { intersection } from 'lodash-es';
import { useDepartmentStore } from '@/store/department';
import {systemImg} from "@authentication-manager/assets";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const permission = 'system/Department';

const departmentStore = useDepartmentStore();
const emits = defineEmits(['openDeviceBind']);
const props = defineProps<{
    parentId: string;
}>();

const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        ellipsis: true,
        fixed: 'left',
        search: {
            type: 'string',
        },
        width: 120
    },
    {
        title: $t('product.index.083446-6'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        search: {
            type: 'string',
            first: true,
        },
    },
    {
        title: $t('product.index.083446-5'),
        dataIndex: 'permission',
        key: 'permission',
        ellipsis: true,
        scopedSlots: true,
        width: 300,
    },
    {
        title: $t('product.index.083446-7'),
        dataIndex: 'describe',
        key: 'describe',
        ellipsis: true
    },
    {
        title: $t('product.index.083446-8'),
        dataIndex: 'state',
        key: 'state',
        ellipsis: true,
        width: 80,
        search: {
            type: 'select',
            options: [
                {
                    label: $t('product.index.083446-9'),
                    value: 1,
                },
                {
                    label: $t('product.index.083446-10'),
                    value: 0,
                },
            ],
        },
        scopedSlots: true,
    },
    {
        title: $t('product.index.083446-11'),
        dataIndex: 'action',
        key: 'action',
        fixed: 'right',
        width: 100,
        scopedSlots: true,
    },
];
const queryParams = ref({});

const tableRef = ref();
const searchRef = ref();
const tableData = reactive({
    _selectedRowKeys: [] as string[],
    selectedRows: [] as any[],
    permissionList: [] as any[],
    defaultPermission: [] as string[]
});
const table = {
    init: () => {
        table.getPermissionDict();
        watch(
            () => props.parentId,
            () => {
              table.refresh();
              searchRef.value?.reset?.()
            },
        );
    },

    getActions: (
        data: Partial<Record<string, any>>,
        type: 'card' | 'table',
    ) => {
        if (!data) return [];
        else
            return [
                {
                    permission: `${permission}:assert`,
                    key: 'edit',
                    tooltip: { title: $t('product.index.083446-12') },
                    icon: 'EditOutlined',
                    onClick: () => table.clickEdit(data),
                },
                {
                    permission: `${permission}:bind`,
                    key: 'unbind',
                    tooltip: { title: $t('product.index.083446-13') },
                    popConfirm: {
                        title: $t('product.index.083446-14'),
                        onConfirm: () => table.clickUnBind(data),
                    },
                    icon: 'DisconnectOutlined',
                },
            ];
    },

    // 获取权限数据字典
    getPermissionDict: () => {
        getPermissionDict_api().then((resp: any) => {
            tableData.permissionList = resp.result;
        });
    },
    // 获取权限名称
    getPermissLabel: (values: string[]) => {
        const permissionList = tableData.permissionList;
        if (permissionList.length < 1 || values.length < 1) return '';
        const result = values.map(
            (key) => permissionList.find((item: any) => item.id === key)?.name,
        );
        return result.join(',');
    },
    // 选中
    onSelectChange: (row: any) => {
        const index = tableData._selectedRowKeys.indexOf(row.id);

        if (index === -1) {
            tableData._selectedRowKeys.push(row.id);
            tableData.selectedRows.push(row);
        } else {
            tableData._selectedRowKeys.splice(index, 1);
            tableData.selectedRows.splice(index, 1);
        }
    },
    // 取消全选
    cancelSelect: () => {
        // console.log(1111);
        tableData._selectedRowKeys = [];
        tableData.selectedRows = [];
    },
    onSelect: (record: any, selected: boolean) => {
        const arr = [...tableData._selectedRowKeys]
        const _index = arr.findIndex(item => item === record?.id)
        if (selected) {
            if (!(_index > -1)) {
                tableData._selectedRowKeys.push(record.id)
                tableData.selectedRows.push(record)
            }
        } else {
            if (_index > -1) { // 去掉数据
                tableData._selectedRowKeys.splice(_index, 1)
                tableData.selectedRows.splice(_index, 1)
            }
        }
    },
    onSelectAll: (selected: boolean, _: any[], changeRows: any) => {
        if (selected) {
            changeRows.map((i: any) => {
                if (!tableData._selectedRowKeys.includes(i.id)) {
                    tableData._selectedRowKeys.push(i.id)
                    tableData.selectedRows.push(i)
                }
            })
        } else {
            const arr = changeRows.map((item: any) => item.id)
            const _arr: string[] = [];
            const _ids: string[] = [];
            [...tableData.selectedRows].map((i: any) => {
                if (!arr.includes(i?.id)) {
                    _arr.push(i)
                    _ids.push(i.id)
                }
            })
            tableData._selectedRowKeys = _ids
            tableData.selectedRows = _arr
        }
    },
    // 获取并整理数据
    getData: (params: object, parentId: string) =>
        new Promise((resolve) => {
            getDeviceOrProductList_api(params).then((resp) => {
                type resultType = {
                    data: any[];
                    total: number;
                    pageSize: number;
                    pageIndex: number;
                };
                const { pageIndex, pageSize, total, data } =
                    resp.result as resultType;
                const ids = data.map((item) => item.id);
                getPermission_api('product', ids, parentId).then(
                    (perResp: any) => {
                        const permissionObj = {};
                        perResp.result.forEach((item: any) => {
                            permissionObj[item.assetId] =
                                item.grantedPermissions;
                        });
                        data.forEach((item) => {
                            item.permission = permissionObj[item.id];
                            item.state = {
                                value:
                                    item.state === 1
                                        ? 'online'
                                        : item.state === 0
                                        ? 'offline'
                                        : '',
                                text:
                                    item.state === 1
                                        ? $t('product.index.083446-9')
                                        : item.state === 0
                                        ? $t('product.index.083446-10')
                                        : '',
                            };
                        });

                        resolve({
                            code: 200,
                            result: {
                                data: data,
                                pageIndex,
                                pageSize,
                                total,
                            },
                            status: 200,
                        });
                    },
                );
            });
        }),
    // 整理参数并获取数据
    requestFun: async (oParams: any) => {
        if (props.parentId) {
            const params = {
                ...oParams,
                sorts: [{ name: 'createTime', order: 'desc' }],
                terms: [
                    ...oParams.terms,
                    {
                        column: 'id',
                        termType: 'dim-assets',
                        value: {
                            assetType: 'product',
                            targets: [
                                {
                                    type: 'org',
                                    id: props.parentId,
                                },
                            ],
                        },
                    },
                ],
            };
            const resp: any = await table.getData(params, props.parentId);
            return {
                code: resp.status,
                result: resp.result,
                status: resp.status,
                success: true
            };
        } else {
            return {
                code: 200,
                result: {
                    data: [],
                    pageIndex: 0,
                    pageSize: 0,
                    total: 0,
                },
                status: 200,
            };
        }
    },
    queryPermissionList: async (ids: string[]) => {
        const resp: any = await getBindingsPermission('product', ids)
        if(resp.status === 200){
            const arr = resp.result.map((item: any) => {
                return item?.permissionInfoList?.map((i: any) => i?.id)
            })
            return intersection(...arr)
        }
        return []
    },
    clickEdit: async (row?: any) => {
        const ids = row ? [row.id] : [...tableData._selectedRowKeys];
        if (ids.length < 1) return onlyMessage($t('product.index.083446-15'), 'warning');
        tableData.defaultPermission = row ? row?.permission : intersection(...tableData.selectedRows.map(
            (item) => item.permission,
        )) as string[]
        const _result = await table.queryPermissionList(ids)
        dialogs.selectIds = ids;
        dialogs.permissList = _result as string[];
        dialogs.editShow = true;
    },
    clickUnBind: (row?: any) => {
        const ids = row ? [row.id] : [...tableData._selectedRowKeys];
        if (ids.length < 1) return onlyMessage($t('product.index.083446-16'), 'warning');
        const params = [
            {
                targetType: 'org',
                targetId: props.parentId,
                assetType: 'product',
                assetIdList: ids,
            },
        ];
        const response = unBindDeviceOrProduct_api('product', params)
        response.then(() => {
            tableData._selectedRowKeys = [];
            onlyMessage($t('product.index.083446-17'));
            table.refresh();
        });
        return response
    },
    refresh: () => {
        nextTick(() => {
            tableRef.value.reload();
            table.cancelSelect()
        });
    },
    addConfirm: () => {
        table.refresh();
        dialogs.nextShow = true;
    },
};

table.init();

const dialogs = reactive({
    selectIds: [] as string[],
    permissList: [] as string[],
    addShow: false,
    editShow: false,
    nextShow: false,
});

watch(
    () => props.parentId,
    () => {
        tableData._selectedRowKeys = [];
        tableData.selectedRows = [];
    },
);

watch(
    () => dialogs.addShow,
    (val: boolean) => {
        if (!val) tableData.selectedRows = [];
    },
);
let Temporary:any = '';

const nextAction = (data:any) =>{
    Temporary = data
}
const nextConfirm = () =>{
    departmentStore.setProductId(Temporary);
    emits('openDeviceBind')
}
</script>

<style lang="less" scoped>
.product-container {
    :deep(.ant-table td) { white-space: nowrap; }
    :deep(.ant-table-tbody) {
        .ant-table-cell {
            .ant-space-item {
                .ant-btn-link {
                    padding: 0;
                }
            }
        }
    }
    .card {
        .card-warp {
            &.active {
                .card-item-content-value {
                    color: #2f54eb;
                }
            }
        }
        .card-tools {
            span {
                color: #252525;
            }
        }
    }
}
</style>
