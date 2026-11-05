import { request } from '@jetlinks-web/core'
import { getMenuGrantDetail } from '@jetlinks-web-core/api/system/menu'

// 获取角色列表
export const getRoleList_api = (data: any): Promise<any> => request.post(`/role/_query/`, data);
// 删除角色
export const delRole_api = (id: string): Promise<any> => request.remove(`/role/${id}`);
// 保存角色
export const saveRole_api = (data: any): Promise<any> => request.post(`/role`, data);
// 更新角色信息
export const updateRole_api = (data: any): Promise<any> => request.patch(`/role`, data);
// 获取角色详细信息
export const getRoleDetails_api = (id: string): Promise<any> => request.get(`/role/${id}`);
// 获取角色菜单与独立资产授权，候选和已保存策略由详情接口分别返回。
export const getPermissionDetail_api = (id: string, data?: Record<string, unknown>) => getMenuGrantDetail('role', id, data);
/** @deprecated 授权编辑使用 getPermissionDetail_api；旧菜单树读取方保留 result 数组结构。 */
export const getPermissionTree_api = async (id: string, data?: Record<string, unknown>) => {
  const response = await getPermissionDetail_api(id, data);
  return { ...response, result: response.result?.menus };
};
export const getGrantableAssetAccesses_api = (menus: any[]): Promise<any> => request.post('/menu/asset-accesses/grantable', menus);
// 更新角色对应的权限树
export const updatePermissionTree_api = (id: string, data:any): Promise<any> => request.put(`/menu/role/${id}/_grant`,data);
// 获取角色列表
export const getRoleListNoPaging_api = () => request.get(`/role/_query/no-paging?paging=false`);

// 获取用户列表
export const getUserByRole_api = (data: any): Promise<any> => request.post(`/user/_query/`, data);

// 获取用户列表不分页
export const getUserByRoleNoPaging_api = (data: any): Promise<any> => request.post(`/user/_query/no-paging?paging=false`, data);
// 将用户与角色绑定
export const bindUser_api = (roleId:string, data: string[]): Promise<any> => request.post(`/role/${roleId}/users/_bind`, data);
// 将用户与角色解绑
export const unbindUser_api = (roleId:string, data: string[]): Promise<any> => request.post(`/role/${roleId}/users/_unbind`, data);
//查询分组
export const queryRoleGroup = (data:any) => request.post('/role/group/_query/no-paging',data)
//保存分组
export const saveRoleGroup = (data:any) => request.patch('/role/group',data)
//删除分组
export const deleteRoleGroup = (id:string) => request.remove(`/role/group/${id}`)

