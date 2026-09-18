/**
 * 基础配置页分组标题的图标，取值为运行时 `svg-icon` 的 type：
 * `模块名/图标相对路径`，图标文件位于 `modules/authentication-manager-ui/icons/system/`。
 *
 * 纯展示层常量，与 `types.ts` 的分组业务类型无关。
 * 注意：`background` 目前复用 `basic-info` 图标（只有设计给了 3 个 svg），
 * 拿到登录背景图的专用图标后替换这一项即可。
 */
export const BASIS_SECTION_ICON = {
  basic: 'authentication-manager-ui/system/basic-info',
  map: 'authentication-manager-ui/system/map-config',
  domain: 'authentication-manager-ui/system/custom-domain',
  background: 'authentication-manager-ui/system/basic-info',
} as const
