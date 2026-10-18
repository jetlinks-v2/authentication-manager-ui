import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'

const menuRequest = request as {
  post<T>(url: string, data: unknown): Promise<AxiosResponseRewrite<T>>
}

/** 菜单定义保留服务端扩展字段，owner 只由本地菜单配置确定。 */
export interface MenuDefinition {
  id?: string
  key?: string
  code: string
  name?: string
  i18nName?: string
  owner?: string | null
  parentId?: string | null
  sortIndex?: number
  options?: { show?: boolean; [key: string]: unknown }
  showPage?: string[]
  permissions?: MenuPermission[]
  buttons?: MenuButton[]
  children?: MenuDefinition[] | null
}

export interface MenuPermission {
  permission: string
  actions?: string[]
  [key: string]: unknown
}

export interface MenuButton {
  id: string
  permissions?: MenuPermission[]
  [key: string]: unknown
}

/** 查询平铺定义，避免按 owner 过滤后丢失跨 owner 父级下的节点。 */
export const getMenuDefinitions = () => menuRequest.post<MenuDefinition[]>('/menu/_query/no-paging', {
  paging: false,
  sorts: [{ name: 'sortIndex', order: 'asc' }],
  terms: [{ terms: [
    { column: 'owner', termType: 'in', value: ['iot', 'app'] },
    { column: 'owner', termType: 'isnull', value: '1', type: 'or' },
    { column: 'owner', termType: 'eq', value: '', type: 'or' },
  ] }],
})

/**
 * 获取当前用户可访问菜单
 * @param data 
 * @returns 
 */
export const getMenuTree = (data: any) => request.post(`/menu/_all/tree`, data);

/**
 * 获取当前用户可访问菜单 包含权限
 * @param data 
 * @returns 
 */
export const getOwnMenuThree = (data: any) => request.post<any>('/menu/user-own/tree', data)
/**
 * 校验编码唯一性
 * @param data 
 */
export const validMenuCode = (data: any) => request.get(`/menu/code/_validate`,data);

/**
 * 获取资产类型
 * @returns 
 */
export const getAssetsType = () => request.get(`/asset/types`);

/**
 * 获取菜单详情
 * @returns 
 */
export const getMenuInfo = (id: string) => request.get(`/menu/${id}`);

/**
 * 编辑菜单信息
 * @returns 
 */
export const updateMenu = (data: any) => request.patch(`/menu`, data);

/**
 * 新增菜单信息
 * @returns 
 */
export const addMenu = (data: any) => request.post(`/menu`, data);

/**
 * 删除菜单信息
 * @returns 
 */
export const delMenu = (id: string) => request.remove(`/menu/${id}`);

/**
 * 获取支持的数采协议
 */
export const getProviders = () => request.get(`/data-collect/channel/providers`);

// 获取当前用户可访问菜单
export const getMenuTree_api = (data: object) => request.post(`/menu/_all/tree`, data);

/**
 * 校验编码唯一性
 * @param data
 */
export const validCode_api = (data:object) => request.get(`/menu/code/_validate`,data);

// 获取菜单详情
export const getMenuInfo_api = (id:string) => request.get(`/menu/${id}`);
// 编辑菜单信息
export const saveMenuInfo_api = (data: object) => request.patch(`/menu`, data);
// 新增菜单信息
export const addMenuInfo_api = (data: object) => request.post(`/menu`, data);
// 删除菜单信息
export const delMenuInfo_api = (id: string) => request.remove(`/menu/${id}`);
