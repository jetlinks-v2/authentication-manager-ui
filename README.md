# Authentication Manager UI

`authentication-manager-ui` provides account, organization, permission, system application, and related management pages for the operations UI.

## Application ownership filter

Delivery: [PR #119](https://github.com/jetlinks-v2/authentication-manager-ui/pull/119), targeting `2.20`.

The application list uses `createAssetOwnershipField` for `business_application`. `register.ts` registers organization and tenant capabilities from `ProjectApplication/ownershipSelectors.ts`; creator selectors search users by name or username and resolve selected IDs. Labels display name and username with the suffix after the last `@` removed. Context determines directory availability; the initial page load does not query Context or directories. Tenant targets accept IDs without a directory request.

Organizations use `OwnershipOrganizationTree.vue` and `useOwnershipOrganizationTree.ts`: independent checkbox selection, path labels, default root and selected-ancestor expansion, debounced local search and virtual rows. Clearing search restores expansion; stale responses cannot replace current selections. “Include descendants” submits the backend closure condition. Selected tags occupy at most two rows beside that control; `useSelectedTagOverflow.ts` reserves space for `+N`, whose popover shows all selections in the editor's stacking context.

Requires [Web Core #186](https://github.com/jetlinks-v2/jetlinks-web-core/pull/186) and the backend Context from [Components #1655](https://github.com/jetlinks-v2/jetlinks-components/pull/1655) / [Tenant #48](https://github.com/jetlinks-v2/jetlinks-tenant/pull/48). Regression command: `node --test tests/assetOwnershipCreator.test.mjs tests/assetOwnershipOrganizationTree.test.mjs`; coverage includes lazy registration, user query mapping, the actual setup-name transform, tag overflow and local filtering of over 20,000 nodes. Full type checking retains existing errors; final visual verification remains pending because the browser connection times out.

## 菜单多资产表单兼容

状态：已实施，专项回归与模块构建通过；登录环境验收待执行。

目标与范围：运营端 `ui/modules/authentication-manager-ui` 的菜单新增、编辑表单支持选择多个资产类型。沿用现有详情页和 Ant Design Vue 表单；资产目录仍来自 `/asset/types`，菜单仍通过现有 `/menu` 接口保存。

字段与兼容规则：

- 表单字段、校验路径及提交主字段统一为 `assetTypes: string[]`。读取时与后端 `MenuEntity#getEffectiveAssetTypes` 保持一致：非空 `assetTypes` 优先，否则将旧 `assetType` 转为单元素数组；去重并保留目录中暂不可见的已有资产 ID，不合并两套字段以免恢复已取消项。
- 保存单个资产时同步 `assetType`，保留旧字段读取方的单资产兼容性；保存多个资产时显式提交 `assetType: ""`，避免旧值残留及隐式退化为某一个资产。切换为不支持或间接控制时提交 `assetTypes: []`、`assetType: ""`，继续沿用关联菜单的现有规则。
- `accessSupport` 回显兼容字符串及枚举对象；切换模式或切换菜单时重置本表单的资产/关联菜单状态，避免上一份草稿残留。

实施入口：`api/system/menu.ts` 声明新旧资产字段和资产目录返回类型；`views/system/Menu/Detail/BasicInfo/permissionForm.ts` 集中处理回显、草稿隔离与提交兼容；`Permission.vue` 使用现有 `a-select mode="multiple"`，按数组校验至少一项。`BasicInfo/index.vue` 合并载荷时优先采用权限表单结果，更新成功后刷新父级详情，避免随后编辑按钮时重新提交旧资产字段；更新失败保留草稿。中英文沿用现有翻译键提示可多选，本次两个 Vue 文件均未超过 300 行。

范围之外：不修改 `runtime-ui/`、公共权限组件、后端权限判定或数据库结构，不批量迁移菜单种子、已保存菜单和已有授权数据，不执行菜单初始化。

兼容边界：多选无法用旧标量字段完整表达，因此多选时清空旧字段，完整资产集合由当前已支持多资产的后端读取。现有仅含旧字段的数据无需预先迁移；真实保存后的回显及权限效果仍需登录环境验证。

验证结果：

- 模块目录执行 `node --test tests/menuAssetTypes.test.mjs`，10 项全部通过。使用真实 Vue SFC 的 setup/template、状态和保存编排，替换目录/保存 I/O 与渲染控件，并使用 Ant Design Vue 所依赖的 `async-validator` 校验模板规则；覆盖旧标量、非空数组优先、去重及不可见 ID 保留、空/标量输入拒绝、模式切换、菜单切换、POST/PATCH 字段、新旧字段冲突、成功刷新及失败保留草稿/重试。
- 在 `ui/` 执行 `pnpm check:ui-style -- --files modules/authentication-manager-ui/views/system/Menu/Detail/BasicInfo/Permission.vue modules/authentication-manager-ui/views/system/Menu/Detail/BasicInfo/index.vue`、`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`，均通过；生产构建转换 10,741 个模块，用时 18.83 秒，仍有现有 Rollup 输出选项、CSS 注释与大包提示。中英文 JSON 可解析且仅修改资产选择提示，`git diff --check` 通过。模块及工作区未配置 lint 脚本。
- `pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false` 未通过，共 628 项工作区诊断；本次变更行和资产目录调用方没有诊断。`api/system/menu.ts` 的剩余诊断位于与 HEAD 一致、未改动的 `getOwnMenuThree` 泛型调用，完整类型检查仍需清理既有问题后重跑同一命令。
- 相邻回归 `node --test tests/menuSettingOwners.test.mjs tests/thirdPartyLoginMenu.test.mjs tests/applicationTemplateMenuPreview.test.mjs` 为 21/22 通过；唯一失败是 `thirdPartyLoginMenu.test.mjs` 仍期望开放平台父节点为 `application-center`，而当前 `baseMenu.json` 为 `platform/settings`，两份文件与 HEAD 均一致，本轮未调整菜单结构。

待验证：登录环境中打开旧菜单、选择两项后保存重开、删到一项、切换支持/间接/不支持，以及保存后的真实授权效果。本轮自动化测试没有写入真实菜单或授权数据；源码与虚拟组件回归不替代真实接口验收。

## 用户表格行操作

交付入口：代码提交 `6cc39dc3174ee51afbef68291efbcb1109914823`；[PR #109：完善角色分组权限与列表操作](https://github.com/jetlinks-v2/authentication-manager-ui/pull/109)，目标分支 `2.20`。

目标与范围：`views/system/User/index.vue` 的操作列复用运行时 core 的 `TableActions` / `TableActionsItem`，编辑、重置密码行内显示，启用/禁用和删除收进更多面板并显示文字；操作列宽为 100，移除页面显式的横向 scroll 配置。保留现有权限、状态判断、确认弹窗及业务回调；不修改接口、共享组件或运营端页面。

实施：用全局注册的子项包裹原有权限按钮并标记常用项，面板操作复用既有翻译键。四个按钮的权限、回调、确认配置、禁用条件和 Tooltip 与改动前一致，已通过模板 AST 比对。

验证：与 `2.20` 模板 AST 对照确认四个按钮的权限、禁用条件、Tooltip、确认配置与回调保持一致，并核对编辑/重置密码为常用项；脚本、模板和 scoped LESS 编译通过。`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 生产构建通过（11,758 个模块，39.79 秒），`git diff --check` 通过。模块和工作区未配置 lint 脚本；在 `runtime-ui` 执行 `pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false` 仍有 605 项诊断，将 4 个改动 Vue 文件与 `baseMenu.json` 替换为 `2.20` 基线内容后，忽略行号位移的完整诊断一致，无新增类型错误。整体类型检查仍未通过，清理既有错误后需重跑同一命令；登录后的更多面板、键盘操作、状态确认与启用用户禁止删除的真实交互尚待验证。

## 角色表格行操作

目标与范围：`views/system/Role/RoleRight/index.vue` 的操作列复用运行时 core 的 `TableActions` / `TableActionsItem`，前两个按钮“编辑”和“权限配置”常驻，“复制”和“删除”收进更多面板并展示既有操作文字。保留权限、禁用状态、回调和删除确认；不修改操作定义、接口、共享组件或其他页面。

实施：循环项使用权限 key 与图标组成的唯一稳定 key，区分两个同为 `update` 权限的操作；按索引标记前两项为常用项，间距交由共享组件处理，仅更多面板展示操作文字。业务处理逻辑与样式保持原样，操作列宽调整为 120。

验证：模板 AST 核对按钮权限、禁用与确认回调，且 `getActions` 操作定义与 `2.20` 基线保持一致；循环 key 区分两个 update 操作，脚本、模板及 scoped LESS 编译通过。模块生产构建通过（11,758 个模块，39.79 秒），`git diff --check` 通过。模块未配置 lint 脚本；完整类型检查仍有与基线一致的 605 项诊断，无新增错误，待清理既有类型问题后重跑上述模块检查命令。登录后的更多面板、复制弹窗及删除确认交互尚待验证。

## 角色分组树节点图标

目标与范围：仅调整 `views/system/Role/RoleLeft/index.vue` 的角色分组树标题，父节点使用现有图标 `icon-jiaose`，叶子节点（包括编辑中）使用 `icon-moren`。不改树数据、接口、权限、选中/展开、编辑/删除或其他前端工作区。

实施：在现有标题插槽添加图标并保持文字、操作入口与行内编辑布局；使用运行时已有的 `AIcon` 和图标资源，不新增组件或图标文件。风险是图标与树线、标题及行内输入框的间距；验证以本地角色管理页面可见的父/叶节点图标、交互检查、模块构建和 diff 检查为准。

验证：本地 `http://localhost:9200/#/system/ou/role` 的父节点和叶子节点分别显示 `icon-jiaose`、`icon-moren`，点击“默认”后叶节点正常选中，再切回“全局角色”正常选中；`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 通过（10,799 个模块，38.33 秒），`git diff --check` 通过。构建仅保留现有的 Rollup output option、CSS 注释与大包提示；未触发节点编辑/删除的后端写入验证。

节点操作显示：`views/system/Role/RoleLeft/index.vue` 的编辑、删除入口改为带 Tooltip 的小尺寸图标按钮，操作容器默认 `display: none`，鼠标悬浮当前节点时切换为 `display: flex`。名称使用剩余宽度并允许在操作出现时收缩；保留管理员可见性、默认分组限制、点击隔离与原有回调。登录后仍需复核长名称在悬浮前后的布局以及图标按钮的点击交互。

验证：模板 AST 与 `2.20` 对照确认管理员/默认分组保护、点击隔离、禁用与删除确认回调保持一致，脚本未变；当前模板和 scoped LESS 编译通过。模块生产构建通过（11,758 个模块，39.79 秒），`git diff --check` 通过。完整类型检查仍有 605 项基线一致诊断，本组件无诊断；模块未配置 lint 脚本。长名称悬浮前后布局和编辑/删除的实际页面交互待登录后验证。

## 组织树节点图标

目标与范围：仅调整 `views/system/Department/components/LeftTree.vue` 的组织树节点标题。当前展示树中有子节点的组织使用 `icon-zuzhiguanli`，无子节点的组织使用 `icon-zuzhi`；搜索重建树产生的空 `children` 数组仍按叶节点显示。不修改组织接口、树数据、筛选、选中/展开、权限按钮或其他前端工作区。

实施：在现有标题插槽的文字左侧复用 `AIcon`，用 `children?.length` 选择图标，沿用局部间距 token 并保持省略文本的收缩能力。风险集中在长名称、操作按钮同排时的宽度；验证本地页面图标与展开/选中表现、模块构建及 diff 检查。

验证：本地 `http://localhost:9200/#/system/ou/department` 的父节点显示 `icon-zuzhiguanli`、叶子节点显示 `icon-zuzhi`，展开父节点后子节点图标仍按其子级判断；随后恢复原有折叠与选中状态。`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 通过（10,799 个模块，27.51 秒），`git diff --check` 通过；构建仅有既有的 Rollup output option、CSS 注释与大包提示。未触发编辑、删除或导入等写入操作。

## 组织树搜索结果展开

目标与范围：`views/system/Department/components/LeftTree.vue` 搜索组织名称时，保留命中节点的完整父级路径并自动展开，使深层组织直接可见；仅涉及运行时 `authentication-manager-ui` 的树搜索，不修改接口、权限、节点操作、路由或运营端前端。

实施：复用现有 `expandParentNodes` 补齐全部祖先，并将父级 ID 去重后同步到 `expandedKeys`；移除仅补回直接父级的 `dig`。清空搜索沿用原有全量刷新与展开重置，搜索后仍可手动折叠节点。

验证：在 `http://192.168.35.97:9201/#/system/ou/department` 搜索“三级”，直接显示展开的“一级组织 → 二级组织 → 三级组织”；搜索“组织”同时显示两个顶层组织及命中的子级；无匹配显示空态，清空恢复全量折叠树，手动折叠二级组织可隐藏三级节点。`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 通过（11,521 个模块，57.77 秒），`git diff --check` 通过。模块未配置 lint 脚本；`pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` 修改前后均有 605 项既有诊断，忽略本组件行号偏移后输出完全一致，无新增诊断。全量类型检查仍未通过，剩余风险为既有类型问题；清理后需重跑同一命令。本次不修改组织数据，未创建四级及更深的节点进行页面验证。

## 组织树底部操作菜单

目标与范围：仅调整 `views/system/Department/components/LeftTree.vue` 的顶层操作布局。参考 `modules/jetlinks-space-ui/views/space/AreaManagement/components/AreaTreePanel.vue` 的底部点击式菜单：移除标题栏的批量导入图标，点击底部“新增”按钮后显示“批量导入”和“新增”。沿用现有弹窗、文案和新增权限；不改树节点操作、接口、树数据、搜索或其他前端模块。

实施与风险：复用 Ant Design Vue 的 `a-dropdown` / `a-menu`，将导入和新增分别接到现有 `batchImportVisible` 与 `openDialog()`；新增菜单项继续按 `system/Department:add` 控制可见性。检查无新增权限时仍可打开原有不受该权限限制的导入入口，以及菜单在树底部向上弹出。

验证方式：执行模块构建与 `git diff --check`；如有本地登录态页面，再检查底部菜单及两个弹窗的点击交互。

验证结果：本地 `http://localhost:9200/#/system/ou/department` 显示底部“新增”按钮，点击后菜单向上弹出“批量导入”和“新增”；分别点击可打开原有导入和新增弹窗，关闭后未提交数据。`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 通过（10,823 个模块）；`git diff --check` 通过。模块未配置 lint 脚本；`pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` 被工作区既有的 637 项诊断阻断，其中本组件的 3 项均位于本次未改动的树选择、展开键类型和删除回调代码。未验证无新增权限账号的菜单显示状态；其可见性沿用 `usePermission` 的 `system/Department:add` 判断。

交付入口：提交 `96cf99b`；PR https://github.com/jetlinks-v2/authentication-manager-ui/pull/97。

概览页的系统公告组件（`visDashboard/Base/Announcements/ProjectHomeAnnouncements.vue`）隐藏标题右侧及空态的整个“更多”入口，包括文字与箭头；公告条目点击打开详情的交互保持不变。`shared/HomeWidget.vue` 的其余组件仍显示原有入口。两个组件的 Vue 模板和脚本编译检查通过，未运行整仓构建。

## 角色、组织与数据字典左侧树布局统一计划

状态：已实施并验证；组织树导入入口的后续调整见上方“组织树底部操作菜单”。

目标：将“系统设置 > 组织与用户 > 角色管理”、“系统设置 > 组织与用户 > 组织管理”和“系统设置 > 平台设置 > 数据字典”的左侧树，统一为资源中心“设备管理 > 产品列表”分类树的垂直结构：标题、搜索框、可滚动树列表、底部新增操作。组织管理的标题行使用 `space-between`，在右侧保留现有批量导入入口；数据字典右侧保留下载和导入入口。

影响范围与 owning module：仅 `runtime-ui/modules/authentication-manager-ui` 的 `views/system/Role/RoleLeft/index.vue`、`views/system/Department/components/LeftTree.vue`、`views/system/Dictionary/components/Left/index.vue`、中英文 locale 资源及本文档。参考锚点为 `runtime-ui/modules/device-manager-ui/views/device/Product/components/ProductCategoryTree.vue`。不修改 `ui/`、`runtime-ui` 其他模块、接口、权限、树数据与筛选契约、树节点编辑/删除操作、路由或共享组件。

实施步骤：

1. 为两个左树组件补齐与产品分类树一致的纵向容器、标题和搜索区；树区域保持弹性撑满并独立滚动。
2. 将角色管理原有“新增角色组”操作移到树底部，保留管理员可见性、创建逻辑和选中/展开行为。
3. 将组织管理原有“新增组织”操作移到树底部；标题行左侧显示组织标题，右侧以 `space-between` 保留批量导入按钮，继续使用既有导入弹窗和权限/调用逻辑。
4. 将数据字典的新增操作移到树底部，并将既有下载、导入操作收纳到标题右侧，继续使用原有权限和上传/下载逻辑。
5. 复用 Ant Design Vue 组件和全局样式 token；为新增标题和文字化入口补齐中英文 i18n key，仅调整局部布局与样式，不新增页面组件或业务逻辑。

验证：中英文 locale JSON 均可解析，目标文件 `git diff --check` 通过；`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 在角色与组织改造后通过（10,786 个模块，31.64 秒），在数据字典改造后再次通过（10,788 个模块，36.26 秒）。构建保留既有 Rollup output option、CSS 注释和大包提示；未启动登录态页面进行浏览器交互回归。批量导入继续调用原有弹窗，角色新增仍只对管理员显示；数据字典的新增、下载、导入、选择和节点编辑/删除入口保持既有调用。

## 运行时运维中心日志与应用模版表格工具栏布局计划

状态：已实施并验证。

目标：统一运行时运维中心“日志管理 > 访问日志 / 系统日志”与“应用模版”的表格顶部插槽布局，跟随“接入组件 > 网络组件”：左侧页面标题，右侧搜索和该页面已有的顶层操作。

影响范围与 owning module：仅 `runtime-ui/modules/authentication-manager-ui` 的 `views/system/Log/Access/index.vue`、`views/system/Log/System/index.vue`、`views/application-center/Template/index.vue`。参考实现为 `runtime-ui/modules/device-manager-ui/views/link/Type/index.vue`。不修改 `ui/`、后端接口、权限定义、查询字段、表格列、行操作、路由、共享样式或 locale 资源。

实施步骤：

1. 三个 `j-pro-table` 使用 `headerLeftRender` 放标题容器和已有 i18n 标题；使用 `headerRightRender` 放右侧工具栏。
2. 将三个页面已有的 `ConditionFilter` 移到右侧工具栏；应用模版页面保留“新增应用模版”权限按钮，与搜索置于同一 `a-flex` 操作组。
3. 访问日志和系统日志保持只读：右侧只放搜索，不新增创建、删除、导出或清理等缺少业务契约的顶层按钮；详情行操作、筛选条件和请求参数保持不变。
4. 标题和工具栏样式仅写在对应页面内，保持网络组件的视觉层级和间距；不改动 `j-pro-table`、`ConditionFilter`、共享样式或任何共享核心组件。

风险 / 待确认：若“按钮操作”要求日志页新增导出、清理或其他顶层能力，须先明确操作行为、权限与接口契约；当前计划以保留其现有只读语义为准。用户已明确本次不改业务逻辑，也不因访问日志页超过 300 行而拆分组件。

验证方式：检查三页的标题、筛选回传、应用模版新增权限按钮和日志详情行操作；执行 `pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`、Vue 文件行数检查和 `git diff --check`。若既有构建问题阻断验证，记录实际错误、待执行命令与剩余风险。

验证结果：三个页面均使用一组 `headerLeftRender` 与 `headerRightRender`，访问日志和系统日志的筛选条件仍分别回传 `search-access`、`search-system`，应用模版仍调用原有 `table.handleSearch` 与 `table.openCreateDialog`。`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 构建通过，`git diff --check` 通过。访问日志 362 行、系统日志 288 行、应用模版 179 行；按本次确认范围不拆分既有访问日志页面。

## System Bulletin Ownership

System bulletin pages, API contracts, types, notification detail rendering, and provider constants are owned by `views/system/Announcement/`; user-facing copy follows this module's locale convention. The shared web core only exposes generic notification-provider and detail-component registration points; it does not identify `SystemBulletin` or call bulletin APIs. SaaS modules may contribute menu binding metadata, but they do not implement bulletin pages or APIs.

The announcement editor loads its supported types from `POST /system/bulletin/type` through `getAnnouncementTypes`; it does not call the legacy `/dictionary/s_bulletin_type/items` dictionary endpoint.

### Bulletin Tenant Data Access

Announcement management must declare `systemBulletin` as its menu asset type and enable data access, so service grants can apply the existing `tenant` (所在租户) policy. The repair pairs this menu declaration with the notify-manager bulletin entity's support for the framework-managed `tenantId` extension; management queries continue to use the existing AssetsHolder boundary. Verify that saving a tenant grant includes `systemBulletin`, and that project A can read its bulletin while project B cannot.

Existing deployments must synchronize the updated menu metadata, save the service's tenant data-access grant again, and use service configuration's “同步到订阅” action to refresh the affected projects' existing subscription snapshots. Saving the service grant alone does not update existing project policies. Historical bulletins without `tenant_id` need an explicitly verified project assignment before backfill; the publisher alone cannot establish ownership when an account belongs to multiple projects.

Validation: the menu grant regression and related bulletin tests pass (9 tests), the module production build passes, and the backend bulletin suite passes (21 tests). A local probe using the real tenant listener, entity asset supplier and tenant holder allows project A to read its bulletin and denies project B. Live management-list queries against deployed project sessions remain to be verified after the menu and subscription updates; the module has no lint script, and the workspace typecheck remains blocked by unrelated existing diagnostics.

### Bulletin Type Icons And Realtime Tip

Goal: give the six built-in bulletin types one icon vocabulary, and stop a realtime bulletin from auto-opening the detail dialog.

- `views/system/Announcement/bulletinTypeIcon.ts` owns the type-to-icon map (`default`, `maintenance`, `incident`, `release`, `security`, `policy`) and falls back to `NotificationOutlined` for unknown, historical or missing values. Icons only mark the content topic; they never carry severity or colour level.
- `views/system/Announcement/realtimeNotification.ts` keeps two entries: a realtime arrival calls the core-provided `showTip` once with the type icon, title and summary, and only a tip click opens `openAnnouncementDetail`; clicking a bell record still opens the announcement detail directly, and `我知道了` keeps the existing read confirmation and badge refresh.
- `noticeListLoader.ts` decorates bell records with the business-neutral `noticeIcon` field, and `components/NotificationDetail.vue` shows the same icon in the announcement detail shared by the bell, the realtime dialog and the message center.
- Shared core only adds generic hooks: `noticeRealtimeHandler.ts` gains `source` and an optional `showTip`, `Notice.vue` renders that tip while keeping the default tip for other providers, and `NoticeItem.vue` renders `noticeIcon` when present. Core still contains no `SystemBulletin` name, bulletin API or bulletin copy.

Scope: this module plus the business-neutral `jetlinks-web-core/src/layout/components/` files. `runtime-ui/` and the backend type enum, dictionary and notification `type` payload stay outside this frontend change.

Verification: the focused Node suite reports 20/21 passing, where the only failure is the pre-existing project-runtime menu URL expectation (`/system/ps/NoticeRule` in `baseMenu.json` versus `/system/NoticeRule` asserted by the test) and is unrelated to this change; the module production build passes (built in 19.03s from the `jetlinks-web-core` Vite entry). The realtime tip cannot be exercised end to end until the backend emits `type` in the notification detail payload; unknown types intentionally fall back to the default icon. The type-provider switch is covered by the focused bulletin ownership assertion and the module production build.

### Base Menu Merge Compatibility

Goal: preserve the remote `system > platform/settings` menu restructuring while restoring the project-runtime announcement and subscription-management menus lost when `baseMenu.json` was resolved from the remote side during merge `8be1eb9`.

Scope: update only `baseMenu.json`, the focused menu ownership regression in `tests/systemBulletinOwnership.test.mjs`, and this section. Keep the remote menu hierarchy, URLs, ordering, permissions, and unrelated menu entries unchanged. Do not restore the pre-merge file wholesale or revive the remote-deleted iot `system/NoticeRule` entry.

Implementation: the original `system/NoticeRule` contract from `61fba7e` is restored under the remote `system > platform/settings` hierarchy as an `owner: cloud` project-settings contribution, including `routeTarget: midhub/settings`, its permission buttons, and asset-access metadata. `system/Announcement` is also `owner: cloud` in this module so `baseMenu.ts` marks it as a runtime menu candidate; `saas-manager-ui` retains the separate `owner: iot` operations binding. The focused test asserts both ownership boundaries and the restored cloud-only subscription candidate.

Validation: `baseMenu.json` parses successfully; aside from the restored NoticeRule and the runtime-required Announcement owner, the file canonically matches remote parent `44bcfd9`, while both cloud menu contracts match the pre-merge project-runtime semantics. The focused Node menu/announcement suite passes all 19 tests, the production build passes with 10,222 transformed modules, the built `dist/baseMenu.json` matches the source, and `git diff --check` passes. Authenticated project-runtime menu synchronization remains pending because no usable logged-in runtime context was verified in this task.

## Access Log User Filter

Access logs can be filtered by login username in `views/system/Log/Access/index.vue`. The displayed request user reads `context.username`; the filter sends a `json_value` condition on the `context` JSONB column, with `value.path: 'username'`, the selected comparison operator, and the normalized input value. The other filters, API path, backend, and menu remain unchanged.

## Project Owner Role Editing Guard

The system user edit dialog keeps profile fields editable for project owners while disabling the role selector when the stable runtime user type is `projectOwner`. The guard accepts the user-list `typeId` and the detail response enum object so list and detail response shapes behave consistently. It reuses the existing `FormItemRole` disabled contract, which also hides the add-role action and prevents tag removal. This guard still applies after the later position-entry change described below. The module production build (`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`) and `git diff --check` passed for the original guard change.

## System Two-column Layout Unification

The page-level left/right shells under `views/system/` now use the shared `EqualHeightColumns` component. Every matching page uses a `18.75rem` left track and `1fr` right track, with no outer padding, column divider, or hand-written flex/absolute/calc width compensation.

Owning pages and shared page bodies:

- `views/system/Department/index.vue`
- `views/system/Role/index.vue`
- `views/system/Dictionary/index.vue`
- `views/system/Region/index.vue`
- `views/system/Calendar/index.vue`
- `views/system/Platforms/Api/index.vue`
- `views/system/Apply/Save/index.vue`

The scope excludes ordinary horizontal form rows, table/card rows, dialogs, drawers, and internal component layouts that do not define a page-level left/right shell. Business requests, permissions, routing, tabs, forms, and selection state remain unchanged.

The Calendar tag and calendar-content components no longer impose their own column width or divider. `views/system/Platforms/Api/index.vue` is the shared page body for Platforms, Platforms/Setting, Apply/Api, and Apply/View, so those consumers inherit the same two-column tracks and removal of the former mode-specific outer padding.

`views/system/Platforms/Setting/index.vue` also removes its redundant wrapper padding so the shared API body is not re-indented by that direct consumer.

Verification: all touched Vue SFC script/template blocks compile, the seven page entries expose the expected `EqualHeightColumns` tracks, the static scan finds no legacy page-level divider or flex/absolute/calc width compensation (the Region tree mask retains its business overlay positioning), `git diff --check` passes, and every touched Vue file remains below 300 lines. Build and TypeScript checks were intentionally not run by request.

## Department Tab Extensions

The Department page uses the shared `EqualHeightColumns` shell for its organization tree and content area, and lazy-loads its User and Property tab content. The Position tab is hidden by the page itself. Other UI modules can control the Property tab through `getRegisterComponents`: register a `hide` action against `system/Department:department-tabs` with target `property`; omit that action to keep the tab visible.

```ts
const getRegisterComponents = () => [
  {
    targetPage: 'system/Department',
    targetModule: 'department-tabs',
    target: 'property',
    mode: 'hide',
    code: 'hide-department-property',
  },
]
```

`getRegisterComponents` is evaluated during application startup. To show the Property tab, conditionally omit its `hide` action; runtime changes after startup require reloading the application registry. Position entries contributed by the registry are filtered from this page.

Scope is limited to `views/system/Department/index.vue` and the existing shared layout and component registry contracts. It does not change Department APIs, permissions, routes, or the community-edition User-only fallback. Verification covers the two-column slot mapping, lazy component loading, registry-driven tab filtering, active-tab fallback, and the touched Vue file line count.

Verification: the edited Department SFC passes a local script/template syntax compilation and remains below 300 lines. Build and TypeScript checks were not run for the layout follow-up by request.

## 组织与用户页面职位内容屏蔽计划

状态：已按“不删除代码，只做代码屏蔽”保留原实现，并完成可执行验证。

目标：组织管理与用户管理菜单页面不再展示职位相关页签、字段、表格列和筛选项；组织管理右侧用户表改为展示及筛选角色；用户管理新增用户时不再出现“蓝色标签由职位关联不可编辑”的提示或相应的角色禁用规则。

影响范围与 owning module：仅 `runtime-ui/modules/authentication-manager-ui` 的 `views/system/Department/index.vue`、`views/system/Department/user/index.vue`、`views/system/Department/util.ts`、`views/system/User/index.vue`、`views/system/User/components/EditUserDialog.vue`、组织页复用的 `views/system/Department/positions/Detail/AddUserDialog.vue` 及本文档。独立的职位管理菜单、职位详情、后端接口与职位绑定数据不在本次修改范围内；不改 `ui/` 或其他运行时模块。

实施步骤：

1. 保留组织管理页的职位组件、页签配置和筛选传递代码，通过条件或注释屏蔽职位入口，默认选中用户页签。
2. 将组织右侧用户表的职位列与职位条件替换为角色列与角色条件，沿用用户详情中的 `roleList` 和现有角色查询接口；保留当前组织用户查询的成员范围，避免隐藏职位入口时改变已有用户是否出现在表格中。
3. 用户管理表格的职位列及筛选通过注释屏蔽并保留原实现；两个菜单页面的新增用户弹窗隐藏职位选择，其中职位详情自己的新增用户入口仍保留职位选择。
4. 用户管理弹窗保留职位输入、联动函数、查询和关联提示的原实现，以注释屏蔽职位联动导致的角色禁用和蓝色标签提示。编辑已有用户时仍回传原有职位 ID，避免后端全量绑定逻辑把隐藏的职位关系清空；角色选择继续遵守管理员、项目所有者等既有只读限制。
5. 同步更新本节、组织页签扩展和用户页签筛选说明；保留的职位子页代码不再通过组织管理页签进入。

风险 / 待确认：后端开启职位自动关联角色时，用户从角色选择中移除的职位继承角色仍可能因保留原职位绑定而再次出现；本次仅取消前端“不可编辑”规则，不调整后端授权模型。角色列以用户详情返回的角色为准。

实现入口：`Department/index.vue` 屏蔽职位页签并默认选中用户；`Department/util.ts` 与 `Department/user/index.vue` 使用 `roleList` 列及 `id$in-dimension$role` 筛选，原职位列和筛选代码保留并注释；`User/index.vue` 注释屏蔽职位列及筛选分支；`User/components/EditUserDialog.vue` 注释屏蔽职位输入和职位联动的禁用、提示、查询，但编辑时继续提交详情中的职位 ID；组织页复用的 `Department/positions/Detail/AddUserDialog.vue` 只在职位详情入口展示职位选择和关联提示。

验证结果：上一轮本地 `http://localhost:9200/#/system/ou/department` 只显示用户页签，用户表显示角色列及角色筛选，筛选候选项可正常加载；该页新增弹窗没有职位字段或职位关联提示。`http://localhost:9200/#/system/ou/user` 的表格及筛选没有职位项，新增弹窗没有职位字段或蓝色标签提示。本次改为注释或条件屏蔽后，复核原职位列、表单、联动函数、查询和路由处理仍保留，页面屏蔽逻辑继续有效；模块生产构建通过（10,832 个模块，35.74 秒），`git diff --check` 通过。构建仍有既有的 Rollup output option、CSS 注释和大包提示。模块没有 lint 脚本；`pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` 仍因工作区的 612 项现有诊断退出，目标文件诊断已按原代码位置复核。页面验证只打开、关闭弹窗，未提交用户数据；编辑时保留职位 ID 与职位详情弹窗保留职位选择通过代码路径检查，仍需在有相应测试数据时做提交回归。

交付入口：实现提交 `99303a2`；[PR #102](https://github.com/jetlinks-v2/authentication-manager-ui/pull/102) 从 `codex/2.12-uat-next-hide-position` 申请合入 `2.12-uat-next`。

## Department User Role Filter

组织成员列表 `views/system/Department/user/index.vue` 的角色单元格直接展示 `formatRoleNames` 及既有空值文案，移除内层 `j-ellipsis` 包装；脚本和角色名称表达式与基线一致，查询与角色筛选规则保持原样，组件编译检查通过。

The Organization Management User tab maps the Role condition to the backend `UserDimensionTerm` contract in `views/system/Department/user/index.vue`:

- `为空` (`isnull`) uses `id$in-dimension$role$not$any`, generating `NOT EXISTS` for a Role-dimension binding.
- `不为空` (`notnull`) uses `id$in-dimension$role$any`, generating `EXISTS` for a Role-dimension binding.
- Exact and multi-value matching use `id$in-dimension$role`; `not` and `nin` use the `$not` relation variant for selected-role exclusion.

`ConditionFilter` supplies the required non-empty placeholder for null-state terms; the `$any` query extension deliberately ignores that value. The user table retains the existing organization membership query, including users associated through a Position. Scope is limited to the runtime UI adapter and does not change the user API, data model or backend binding rules.

## Department Position Role Filter

The retained Department Position subpage code keeps selected-role filtering on the existing `id$position-role$position` contract, although Organization Management no longer displays its Position tab. For `为空` and `不为空`, the runtime UI removes only the role-null condition from the request, loads all position details for the selected organization, filters their returned `roles` arrays, and restores normal pagination. The user API, role model, position API, and other position pages remain unchanged.

## Department Position Parent Filter Label

The Parent Position filter keeps IDs as its query value and uses `loadSelectedOptions` to resolve selected positions from the same organization-position tree used by the selector. The tree request is shared for the active page and is invalidated after a position is created, updated, or deleted, preventing duplicate organization-tree and position-list requests when filter conditions change. The selector and filter token therefore both render the complete hierarchy (for example, `Root Organization / First-level Organization / Position`) instead of an ID; no API contract, data model, or backend behavior changes.

## System Management List Layout

The `views/system/` list pages that combine `ConditionFilter` with `j-pro-table` use the shared `PageHeader` list shell: the page title stays on the left, filtering and the primary create action stay on the right, existing batch actions remain in the table toolbar, and dropdown-based batch actions stay grouped.

These list pages also use `FullPage hasPadding` so their table content keeps the same page inset; `views/system/Announcement/components/ManagementView.vue` follows the same container contract as Permission and the other system management lists.

The Role page uses the shared `EqualHeightColumns` shell for its role-group selector and role list, with the system-wide `18.75rem` / `1fr` tracks and no outer padding or divider.

Scope is limited to the matching `index.vue` files outside `Apply`, `Basis`, and `NoticeRule`. The change does not alter request parameters, permissions, route registration, API contracts, or batch-action behavior. Implementation verification covers filter-to-table query flow, primary and batch action placement, module build diagnostics, and touched Vue file line counts.

Verification:

- All 12 matching Vue files contain one `PageHeader`, one `ConditionFilter`, and one `j-pro-table`; their SFC templates and `script setup` blocks compile independently.
- The production build passes from `jetlinks-web-core` with the programmatic Vite entry documented below.
- The module-wide Vue type-check still exits non-zero because of pre-existing shared-core and legacy-module diagnostics; it reports no new `PageHeader`, list-title i18n, or shared list-layout contract error.

## 平台管理与用户管理列表工具栏布局计划

状态：已实施并验证。

目标：将“系统设置 > 平台管理”的权限管理、菜单管理、公告管理，以及“系统设置 > 组织与用户 > 用户管理”的列表表头统一为网络组件的结构：左侧显示对应列表标题，右侧放条件搜索和该页面原有的顶层操作。

影响范围：仅 `views/system/Permission/index.vue`、`views/system/Menu/index.vue`、`views/system/Announcement/components/ManagementView.vue`、`views/system/User/index.vue`、现有中英文 locale（仅在缺少标题键时）和本文档。保留接口、查询参数、树展开、权限控制、导入导出、弹窗、行操作、路由及共享 `j-pro-table`、`ConditionFilter` 实现。

实施步骤：

1. 四页分别在 `headerLeftRender` 渲染现有 i18n 标题，`headerRightRender` 渲染搜索与已有顶部操作。
2. 权限管理保留新增与批量导入/导出；菜单管理保留新增与管理员菜单配置；公告管理保留新增；用户管理保留新增与导入/导出，均与搜索同行右对齐。
3. 沿用网络组件的标题层级和间距，只添加页面内必要的响应式样式；不添加无业务契约的操作或统计信息。

菜单配置跳转：`views/system/Menu/index.vue` 的管理员菜单配置按钮使用 `menuStore.jumpPage('system/Menu/Setting')`，通过菜单映射解析目标路由并携带运行时项目上下文；已移除不再使用的 `useRouter` 实例。管理员可见性与目标页面保持原约定。

跳转调整验证：页面 Vue SFC 模板/脚本编译、`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`（55.12 秒）与 `git diff --check` 通过。模块未配置 lint 脚本；`pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` 报告 605 项工作区类型诊断，本页 3 项均位于与 HEAD 一致的子菜单排序代码，改动位置无诊断。未进行登录态点击验证，菜单配置页面在项目运行时的实际导航仍需页面回归确认。

风险与验证：现有文档中的 “System Management List Layout” 描述已由本次实际页面实现校正：四页均按标题左置、工具右置的表格插槽布局呈现。筛选参数、菜单树展开、各权限按钮及用户导入导出行为保持原实现；`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 和目标文件 `git diff --check` 均通过。构建仍报告工作区既有的 Rollup `input` 配置、CSS `//` 注释及大包提示。

## 菜单配置的 owner 边界

当前行为：`views/system/Menu/Setting/` 将菜单配置拆成项目菜单（`iot`）与应用菜单（`app`）两个 Tab，默认进入项目菜单。仅涉及运行端本模块；后端、初始化流程和运营端保持原实现。

实现入口：页面 `index.vue` 负责 Tab、菜单树及反馈，`useMenuSetting.ts` 维护两个 Tab 的独立草稿与交互生命周期，`menuSettingService.ts` 编排查询与按 owner 保存，`utils.ts`、`menuTree.ts` 负责纯数据转换。查询通过 `api/system/menu.ts#getMenuDefinitions` 调用现有 `/menu/_query/no-paging`，同时读取 `iot`、`app` 和空 owner，避免树查询在缺少跨 owner 祖先时丢节点；本地模块定义直接按 ID 合并，避免同 code、不同 ID 的候选串选或丢失。

保存与同步统一展开节点后按 owner 分别调用 `/menu/{owner}/_all`，每份载荷只含对应 owner 的平铺节点并保留 `parentId`，防止接口递归覆盖不同 owner 的子菜单。本地定义的 owner 不随勾选、拖拽或提交改变；空 owner 兼容为 `iot`。已有菜单保留勾选和排序，新候选默认未选中；个人中心、消息订阅及其子菜单等未展示的系统定义随对应 owner 保留提交。权限同步按菜单和按钮 ID 补充权限动作，并保留当前草稿的选择、层级和排序。

失败与兼容：所有 owner 请求成功后才提示成功并刷新，部分失败保留草稿并提示失败 owner；接口之间没有整体事务，不执行自动回滚。本次不迁移历史 `cloud` 数据，遗留前端 `cloud` 定义由配置维护者改为 `iot`。

验证：模块内执行 `node --test tests/menuSettingOwners.test.mjs tests/thirdPartyLoginMenu.test.mjs tests/applicationTemplateMenuPreview.test.mjs`，22 项全部通过，其中 15 项 owner 配置回归覆盖分栏、ID 隔离、新菜单选中/取消选中的保存回显、跨 owner 父子引用、隐藏系统菜单保留与个人中心去重、拖拽层级/环、权限同步及部分失败重试。隔离浏览器使用真实页面、Vue 和 Ant Design Vue，替换请求为测试数据，验证默认项目 Tab、应用 Tab、新页面默认未选中、选中后跨 Tab 保留草稿，以及部分保存失败时保留草稿和确认框、显示失败 owner；未写入真实后端。

在 `runtime-ui` 执行 `pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 通过（11,141 个模块，18.13 秒），保留既有构建配置、CSS 注释及大包提示；`node ../ui/scripts/check-ui-style.mjs --files modules/authentication-manager-ui/views/system/Menu/Setting/index.vue` 和模块 `git diff --check` 通过。页面为 94 行，新增 hook、service 和纯转换文件均低于 300 行。模块未配置 lint 脚本；`pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false` 仍有 590 项既有诊断（修改前 599 项，忽略行号变化无新增诊断，配置页及新增逻辑均无诊断），完整类型检查尚未通过。

剩余验证：尚未执行真实后端写入、登录态拖拽及刷新回显联调。可在 `runtime-ui` 执行 `pnpm -F jetlinks-web-core dev --port 9201` 后，以管理员登录目标环境验证两份 owner 载荷的持久化结果；修复工作区既有类型问题后重跑上述类型检查命令。本次不自动修复数据库中的历史归属或跨 owner 的原始父子配置。

## System Basis Navigation Layout

The system basis form stores the selected menu layout in `front.layout`. The selector supports `side`, `mix`, and `top` with CSS-only layout previews. During application startup or page refresh, `jetlinks-web-core/src/store/system.ts` validates the configured value and applies it to the shared shell layout; missing or invalid legacy values fall back to `side`.

The owning UI files are `views/system/Basis/Form.vue`, `views/system/Basis/components/LayoutModeSelector.vue`, and `views/system/Basis/typing.ts`. The shared refresh-time state boundary remains `jetlinks-web-core/src/store/system.ts`.

Verification: the `authentication-manager-ui` production build through the `jetlinks-web-core` Vite entry passes. Workspace-wide Vue type-checking is currently blocked by the existing `modules/device-manager-ui/views/link/Certificate/type.d.ts` syntax error and other legacy core diagnostics; the two new Basis components and their form-data type add no targeted diagnostics.

## Application Center

### API Application Implementation Plan

Status: implemented; verification complete with backend build blocked by the workspace's unavailable parent artifact.

Goal: add a complete API application workspace matching the approved prototype: credential list and search, create, enable/disable, copy and delete, API permission grants, credential-signed API debugging, and application-scoped access logs with detail and export. Search uses the shared `ConditionFilter` component.

Owning module and scope: the primary owner is `ui/modules/authentication-manager-ui`, under `views/application-center/ApiApplication/`, its typed `api/application-center/apiApplication.ts` boundary, `baseMenu.json`, and the existing Chinese/English locale resources. If the selected `授权应用` values cannot be represented and enforced through the current application/grant contracts, only a narrow supporting contract and tests in `modules/authentication-manager` may be added after that gap is verified. `runtime-ui/` is outside this change.

Interaction profile: use the standard management-table page because operators need to find credentials, compare key operational fields, copy secrets, and run repeated row actions. Keep create in the table toolbar, expose the most common row actions directly, and place permission, debugging, logs, and destructive actions in the row action area or `更多`. Use `JlDrawerShell` for the three focused workspaces and `EditDialog` for creation.

```text
+ ConditionFilter ----------------------------------- [新增API应用] +
| 密钥名称 | AppKey | AppSecret | 创建时间 | 状态 | 操作/更多          |
+-------------------------------------------------------------------+
                         | 权限设置 | 接口调试 | 接口日志
                         v
              + JlDrawerShell focused workspace +
```

Implementation steps:

1. Add the menu/route entry, typed models, response normalization, and request wrappers. The list queries the active `ApplicationEntity` contract with `provider = internal-standalone` and the bitmask-membership condition `integrationModes in$any [apiServer]`, then appends terms emitted by `ConditionFilter`; it does not use the deprecated `/api-client` model.
2. Implement the paged list with prototype columns for name, description, AppKey, masked AppSecret, creation time, status, and actions. Add deliberate copy feedback, enable/disable confirmation where appropriate, deletion confirmation, loading/empty/error states, and post-mutation refresh.
3. Implement the create dialog with name, description, and multi-select `授权应用`. Generate the AppKey/AppSecret through the supported application contract, persist an `internal-standalone` API-server application, and create full API-group grants by default as described by the prototype.
4. Implement permission settings from `/open/api/group/**` and `/open/api/spec/**`: grouped APIs, group-level and operation-level selection, selected counts, existing-grant echo, save progress, and refresh after success. Only granted specifications are exposed to the debug workspace.
5. Implement API debugging by adapting the existing API explorer/test capability instead of copying it. The request must be signed with the selected API application's AppKey/AppSecret and support method, path/query/header/body input plus request/response status, headers, body, timing, loading, and failure states.
6. Implement API logs from `/logger/access/_query`, constrained by `context.openApiClientId = AppKey`. Provide keyword, status, and date filters; method/path/IP/status/duration/time columns; request/response detail; paging; and export using the existing project export mechanism.
7. Keep request orchestration outside presentation components, put all operator-visible copy in `locales/lang/zh.json` and `locales/lang/en.json`, reuse shared JetLinks/Ant Design components, and split new or substantially edited Vue files so each remains at or below 300 lines.

Explicit exclusions: do not modify `runtime-ui/`, revive `ApiClientController` or other deprecated `/api-client` code, invent quota/traffic metrics, add an admin dashboard shell, duplicate the existing API explorer, or refactor unrelated Application Center pages.

Risks and confirmation gates:

- `授权应用` must affect real runtime access, not just form metadata. Before implementation, verify whether existing API group asset access and application dimensions can enforce the selected business applications. If not, add the smallest transactional backend binding contract in `modules/authentication-manager` and cover it with tests.
- AppSecret stays masked by default and is only revealed/copied through an explicit action; the implementation must avoid placing it in URLs, logs, or persistent browser state.
- The existing API test page uses the signed-in operator session. The new debugger must prove that requests are made with the selected API application signature and that ungranted APIs cannot be selected.
- Confirm that access logs retain and can query `context.openApiClientId`; if the environment lacks the field or query support, record the backend gap before widening scope.

Implementation result and key locations:

- `api/application-center/apiApplication.ts` and `views/application-center/ApiApplication/useApiApplication.ts` define the typed CRUD, business-application, API-group grant, OpenAPI, and access-log boundaries. The list uses `ConditionFilter` terms plus `provider = internal-standalone` and `integrationModes in$any [apiServer]`; no deprecated `/api-client` controller is used.
- `views/application-center/ApiApplication/index.vue` provides the paged credential ledger, masked AppSecret, copy/reveal action, status action, delete guard, and post-mutation reload. `CreateDialog.vue` uses `EditDialog`, normalizes its multi-select value to a valid string array so an empty selection cannot render or submit as a blank item, and persists generated credentials with selected business-application IDs.
- `PermissionDrawer.vue`, `DebugDrawer.vue`, and `LogDrawer.vue` use `JlDrawerShell`. Permission selection echoes and saves group/operation grants; debug requests are limited to granted specs and sign same-origin requests with `X-Client-Id`, `X-Timestamp`, and `X-Sign`; logs filter on `context.openApiClientId`, show detail, and generate a CSV from the existing query endpoint.
- `baseMenu.json` and both locale files register the route, resource actions, and synchronized Chinese/English copy. New Vue SFCs are all below 300 lines and `runtime-ui/` remains untouched.
- `modules/authentication-manager` extends `ApplicationSaveRequset` with optional `businessApplicationIds`, checks `business_application:save`, binds the API application's system user to that dimension transactionally, clears authorization cache after commit, and removes bindings when the API application is deleted. `ApplicationSaveRequsetTest` covers generated/preserved AppKey behavior and grant target binding.

Verification: `baseMenu.json` and locale JSON parse successfully; all new SFCs compile in the `authentication-manager-ui` production build (`9954 modules transformed`, build passed); focused `vue-tsc` output has no diagnostics for `ApiApplication`; new Vue files remain at or below 300 lines; and `git diff --check` passes. The API-application query regression now shares one fixed-term builder across both request paths and uses `integrationModes in$any [apiServer]`; the create dialog also normalizes the authorization multi-select before rendering and submission. `pnpm -F jetlinks-web-core build -- -- --module-name authentication-manager-ui` passed again with `9954 modules transformed`. Full workspace `vue-tsc` remains non-zero on pre-existing `jetlinks-web-core` diagnostics. The focused backend test was added, but Maven cannot reach its compile/test phase because the workspace does not contain `jetlinks-parent` and the configured Nexus returns HTTP 401; the Java diff was reviewed against existing `DimensionUserBindUtils`, `AssetsHolder`, and `TransactionUtils` call patterns. Authenticated browser smoke testing remains pending because the local dev page redirects to login.

### Application Template Url Plan

Status: implemented after confirmation. Verification for this pass is limited to JSON parsing, static scans, scoped diff whitespace checks, and Vue SFC line counts; build and `tsc` were skipped by request.

Goal: let operators maintain an application template introduction URL through `templateUrl`, then open that URL from the ProjectApplication create template list's detail action.

Owning module and scope: `ui/modules/authentication-manager-ui`. The change is limited to `views/application-center/Template/Save/`, `views/application-center/ProjectApplication/Create/`, the business-application/application-template API types, `applicationModel.ts`, and existing Chinese/English locale resources. It does not change backend Java code, `saas-manager-ui`, or `runtime-ui`.

Implementation:

1. Add editable `templateUrl` to the application template summary area with a 64-character limit and existing `InputEditable` behavior.
2. Preserve `templateUrl` when normalizing application templates for ProjectApplication creation.
3. Change the template list "detail" action to open `templateUrl` in a new tab when configured, while retaining the existing local preview modal for templates without a URL.

Verification result:

- `Template/Save` edits and saves `templateUrl` with the existing `InputEditable` interaction and 64-character validation.
- `ProjectApplication/Create` normalizes `templateUrl` from the business application template entity and opens it in a new tab from the template detail action when configured.
- Old templates without `templateUrl` keep the existing local preview modal fallback.
- `locales/lang/zh.json` and `locales/lang/en.json` parse as valid JSON.
- Touched Vue SFCs stay below 300 lines. Build and `tsc` are intentionally not run per the task constraint.

Risks: `templateUrl` relies on the existing backend template field being returned by the list/detail APIs. Authenticated browser smoke testing remains pending.

### Project Application Members And Roles Layout Plan

Status: implemented and verified after confirmation.

Goal: align the ProjectApplication member and role tabs with the approved prototypes. The member tab uses a compact title/action row, one local keyword search, and a full-width member table without title commentary. The role tab uses a narrow role list beside the existing menu editor; the right-side data-permission pane stays hidden here, and role asset permissions inherit the application template menu response's `assetAccesses` snapshot.

Owning module and scope: `ui/modules/authentication-manager-ui`. The planned code changes are limited to `views/application-center/ProjectApplication/Detail/components/UserManagement.vue` and `RoleManagement.vue`, plus this document. Existing ProjectApplication APIs, stores, routes, locale resources, permission-editor contracts, backend modules, and `runtime-ui/` remain unchanged.

Interaction profile:

1. Member tab: keep the existing application-detail carrier and the existing client-side keyword filter, because the prototype calls for one fixed search over already-loaded users with no route echo, remote options, or saved-search workflow. Render the title and add action on one row, then the search and full-width table; keep role selection, empty state, and user creation behavior intact. The row action unbinds the member from the business application instead of toggling the user's global enabled state.
2. Role tab: use the master-detail workspace profile. Put `角色列表` and `新增` in the left panel header, render compact role rows with member counts, and keep role edit/delete actions local to each row. Put the selected role name/count and save action above the existing `MenuAssetPermissionEditor` on the right.
3. Remove the extra member subtitle and role-page title/subtitle from the rendered layout. Do not add banners, KPI blocks, nested cards, new copy, or another permission implementation.

Risks: active-role selection, permission request race protection, and permission save behavior remain unchanged. Authenticated browser verification is still pending, so final visual spacing should be smoke-tested with representative member and role data after deployment.

Verification result: both Vue SFC script/template/scoped-style compilations pass; the programmatic Vite production build for `authentication-manager-ui` passes with 9954 transformed modules. Full workspace `vue-tsc` remains nonzero on 665 lines of existing shared diagnostics, while the focused ProjectApplication and business-application API scan reports no diagnostic. The touched Vue files remain below the 300-line gate (`UserManagement.vue` 134 lines and `RoleManagement.vue` 289 lines), locale JSON parsing and `git diff --check` pass, and static assertions confirm the redundant member subtitle and role-page heading are no longer rendered.

Follow-up verification for member unbinding: locale JSON parsing and scoped `git diff --check` pass; static scans confirm the member table no longer renders the `职位` column or user enable/disable row action, and the only member-removal request added under ProjectApplication is `/business-application/{applicationId}/users/_unbind` with no `/saas` path in the touched files. `UserManagement.vue` is 134 lines and detail `index.vue` is 230 lines. Build and `tsc` were not run per the task constraint; SFC parser verification is pending because the current install does not resolve `@vue/compiler-sfc` from this module.

运行时应用详情的成员表格（`runtime-ui/modules/authentication-manager-ui`）：`UserManagement.vue` 的姓名、账号、组织、手机号、邮箱及未分配角色统一使用 core 的 `comm.table.empty`（未配置 / Not Configured）。角色空值只在选择框展示层转为 `undefined` 以启用 placeholder，提交仍使用原有角色 ID 和清空规则。

验证：真实 Vue SFC 搭配 Ant Design Vue Table/Select 及 core 中英文资源的 8 组 SSR 场景通过，覆盖空字符串、null、undefined、已有值、数据不被展示文案污染和管理员角色禁用；改动前源码可复现空角色 placeholder 断言失败。`node --test tests/applicationRolePermissionScope.test.mjs tests/projectApplicationExternalAccess.test.mjs` 共 19 项通过，模块 Vite 生产构建通过（30.57 秒）。在 `runtime-ui` 执行 `pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false`，修改前后均为 614 条既有诊断，无新增；未配置独立 lint 脚本，`git diff --check` 通过。登录后的真实应用详情及英文长文案布局仍待通过 `pnpm dev` 复核。

### Project Application Detail Action Plan

Status: implemented and statically verified.

Goal: complete the ProjectApplication detail actions, restore the application icon uploader's neutral idle appearance, and hide application timezone configuration from operators.

Owning module and scope: `ui/modules/authentication-manager-ui`. The change is limited to `views/application-center/ProjectApplication/`, its business-application API wrapper, and existing Chinese/English locale resources. It does not change `runtime-ui/`, backend contracts, application routes, template selection, or the stored/default timezone value.

Implementation:

1. Add the standard business-application delete API/store flow and expose a confirmed destructive action in the detail summary header; return to the application ledger after successful deletion.
2. Keep using the shared `ImageUpload` component, but override its public `borderStyle` contract so the ProjectApplication icon field uses a neutral idle border instead of the component's default primary-colored border.
3. Remove timezone display/editing and timezone submission from `ApplicationSettings.vue`; preserve the existing normalized timezone value when other application settings are updated.
4. Verify locale JSON, Vue/TypeScript syntax, delete route wiring, absence of the timezone control/save field, touched Vue line counts, and the focused module build when the workspace permits it.

Risks: deletion relies on the standard `DELETE /business-application/{id}` CRUD contract exposed by `BusinessApplicationController` through `AssetsHolderCrudController` and remains protected by a confirmation prompt. Authenticated browser/API smoke testing is still pending because this session has no confirmed logged-in project/backend context.

Verification result:

- Chinese and English locale JSON parse successfully; focused TypeScript syntax transpilation passes for the business-application API and ProjectApplication store.
- The four touched Vue SFCs pass script, template, and scoped-style compilation. Their line counts are `Create/index.vue` 208, detail `index.vue` 204, `ApplicationSummary.vue` 161, and `ApplicationSettings.vue` 261.
- Static contract checks confirm the detail header wires the confirmed delete action to the standard delete route and that `ApplicationSettings.vue` contains no timezone display, draft, option, or save field.
- The programmatic Vite production build for `authentication-manager-ui` passes with 9938 transformed modules. The legacy CLI wrapper still fails before compilation because Vite 7 rejects the forwarded `--module-name` option; the documented programmatic entry avoids that existing tooling incompatibility.
- Full workspace `vue-tsc` remains nonzero on existing shared-core diagnostics, while a focused diagnostic scan reports no error in the touched ProjectApplication or business-application API paths. `git diff --check` passes for the touched files.

### 应用管理类型分流与第三方标准接入

第三方打开接口的请求配置：`getBusinessApplicationRedirect` 将 `applicationScope: false`、`tenantDomain: false`
放在 `request.get` 的第三个参数，仅该身份授权请求不继承来源页面的应用、租户选择，保留原项目登录凭证。
后端仍校验目标应用启用状态、最新成员关系及 Token 固有权限限制。第二个参数是查询参数，误放会形成
`_redirect?applicationScope=false`，不能关闭范围；仅关闭应用范围时，项目页面附带的租户范围仍会令签发 Code 返回 403。

应用管理使用同一创建入口，通过模板 provider 区分普通业务应用与第三方应用，不新增后端应用类型或无模板创建接口。实际前端模块为 runtime-ui/modules/authentication-manager-ui；开放平台 API 应用仍使用独立 /api-application 模型。

- 创建第三方实例时仅选择 provider=third-party 的模板及填写基本信息，不配置出站 OAuth2、通知 Token 或实例 callback。
- 模板配置复用 redirectUri、externalParameters 和 notification.address/keyId/publicKey。平台生成 Code 并拼接跳转参数；第三方通过平台现有 /oauth2/token 和 /authorize/context 获取委托身份。
- notification 的 RSA keyId/publicKey 仅用于应用凭据加密交付；HMAC keyId/Secret 由现有平台／模板密钥按独立通知用途派生。页面只保留 `/notification-signature` 状态查询与 `/_reveal` 受控查看，删除生成／重置及保存前置校验；平台／模板版本变化后重新交付，实例访问凭据轮换不改变模板通知签名。
- 实例详情保留基本信息、用户和角色。第三方角色只维护基本资料及成员关联，不加载菜单授权区域；普通业务应用的菜单权限编辑保持原行为。
- 成员、角色及关联查询复用 /user/detail/business_application/{id}/_query、带 applicationId 条件的 /role/_query 和 /business-application/{id}/user-roles/_query。通知使用 application.user.bound/unbound 与 application.sync.changed 的 members/roles 提示，不消费独立 Callback 快照协议。
- 可靠任务、记录与重投沿用已有模板 /business-application-template/{templateId}/delivery 契约及模板权限，不新增实例运维 API，也不以接口失败后的另一套路径兜底。

主要实现入口为 ProjectApplication/Create、ProjectApplication/Detail 及 Template/Save。普通配置由 useApplicationTemplateParameters 管理，当前派生签名的查看由 useTemplateNotificationSignature 管理，ExternalParameterConfig 展示。Secret 只保留在弹窗短期内存，关闭、切换模板或离开页面即清理。后端复用已有模板快照缓存及失效机制。本轮仅源码与差异检查，未运行前端测试、lint、类型检查、构建或浏览器；当前凭据查看、权限控制和离开页面清理待人工验收。Python 示例保留本地，不随产品仓库交付。

### Video Gateway Binding Interaction Plan

Status: multi-gateway selection implemented and statically verified. Build and `tsc` were skipped by request.

Goal: bind video access by selected media gateway `deviceId` values. In the binding drawer, checkboxes in the left gateway list support multi-selection; clicking or checking a gateway makes it the current right-side preview. The channel table only previews that gateway's video channels and does not expose row checkboxes, select-all, or selected-channel counts.

Owning module and scope: `ui/modules/authentication-manager-ui`. The change is limited to the ProjectApplication video binding drawer, its camera service/store contract, related i18n copy, and this module document. Backend Java code, `runtime-ui/`, the IoT device picker behavior, and channel-level asset authorization are out of scope.

Implementation steps:

1. Keep the existing shared resource-picker drawer, but make table row selection configurable. Camera mode adds a checkbox before each left-side gateway, keeps the current gateway independently for right-side read-only preview, and submits all checked gateways; device mode retains its current multi-select, select-all, and selected-count behavior.
2. Treat camera `boundIds` as unique gateway `deviceId` values, exclude already-bound gateways from candidates, and submit the checked gateway IDs on confirmation.
3. Query bound channels through their correlated `deviceId` asset scope, and bind/unbind `/assets/*/device` with the gateway `deviceId` consistently.
4. Update Chinese and English copy so binding and unbinding clearly describe gateway-level impact, including removal of all channels under a gateway when it is unbound.
5. Keep every bound-camera card preview at a fixed `10.5rem` height, prevent grid-row stretching from changing it, and crop images with `object-fit: cover` so missing channel names/serials and mixed source resolutions do not produce uneven preview heights.

Risks and confirmation points:

- The backend authorizes media channels through the related device asset. Selecting one gateway therefore makes all of its channels visible; exact per-channel authorization is not representable without a backend channel asset/binding capability.
- Unbinding from any channel card removes the containing gateway binding and consequently all channels under that gateway from the application.
- The right-side `ConditionFilter` remains available only to filter the current gateway's channel preview and does not affect the checked gateway IDs submitted for binding.

Verification result:

- `ResourcePickerDrawer.vue`, `ResourcePickerTable.vue`, `VideoConfiguration.vue`, and detail `index.vue` pass Vue SFC parse, script compilation, and template compilation.
- `types.ts`, `applicationCameraService.ts`, and `useProjectApplication.ts` pass TypeScript syntax transpilation without type-checking.
- `locales/lang/zh.json` and `locales/lang/en.json` parse as valid JSON.
- Static contract assertions confirm all checked gateways are submitted, preview state remains independent from multi-selection, the channel table is preview-only, already-bound gateway IDs are excluded, and bound lookup/bind/unbind all use `deviceId`; the IoT device picker retains its existing selected-resource path.
- Static style assertions confirm the camera grid aligns cards from the row start, the preview container locks its height/min-height/max-height/flex-basis to `10.5rem`, and absolutely positioned images fill it with `object-fit: cover`; missing channel names or serials cannot stretch the preview.
- `git diff --check` passes for the touched files. Vue line counts are `ResourcePickerDrawer.vue` 285, `ResourcePickerTable.vue` 142, `VideoConfiguration.vue` 155, and detail `index.vue` 255.
- Build and `tsc` were not run, as requested. Browser interaction and authenticated API smoke testing remain pending.
- Commit and PR: pending.

### Detail Optimization Plan

Status: implemented after confirmation. Verification for this pass is limited to JSON parsing, static API-path scans, and Vue SFC line counts; build and `tsc` were skipped by request.

Goal: align `views/application-center/ProjectApplication/Detail/` with the current application detail prototype by adding video configuration, supporting application users and binding existing project users, switching application roles to the same role CRUD endpoints used by `views/system/Role`, and confirming that newly created applications bind the current creator.

Owning module and scope: `ui/modules/authentication-manager-ui`. The implementation is limited to the operations UI and existing backend APIs under authentication, project-side console members, assets, and media channel query. `runtime-ui/`, new backend Java endpoints, unrelated system pages, generated artifacts, and global application menu scope behavior are out of scope unless a confirmed backend gap blocks the requested behavior.

Prototype and interface findings:

- Prototype `https://jetlinks-ai-new.ez7268-453.workers.dev/midhub/app/user-app/app-2` shows a `视频配置` tab between `物联设备配置` and `用量信息`. The tab renders a camera card grid with preview image, online/offline status, camera name, per-card `设置`, and a `绑定摄像头` action. Binding opens a right drawer with gateway grouping, name/serial search, candidate camera list, selected count, and confirm. Settings opens a small dialog showing preview image, status, name, PTZ support, and `解除绑定`.
- Role backend facts: system role management uses `POST /role/_query/`, `POST /role`, `PATCH /role`, and `DELETE /role/{id}`. `RoleEntity.applicationId` is create-only (`updatable = false`), so application role queries should add an `applicationId` exact term and application role creation should submit `applicationId`; updates must not modify it.
- User backend facts: existing project users can be bound incrementally through `POST /business-application/{applicationId}/users/_bind` and unbound through `POST /business-application/{applicationId}/users/_unbind`. The project-side picker queries `POST /user/detail/_query` in the current project context and appends an `id nin` term for users already bound to the application.
- Application create backend facts: `BusinessApplicationService.handleCreated` already binds the persisted `creatorId` to the new business application dimension, so the UI should not add a duplicate frontend-side creator binding unless authenticated smoke testing proves the event path is not reflected in the detail page.
- Video backend facts: the bind drawer queries gateways through `POST /media/device/_query`, then queries channels only after a gateway click through `POST /media/device/{gatewayId}/channel/_query`. `MediaChannelController` correlates channel permission to `DeviceAssetType.device` via `deviceId`, and no separate media-channel asset type is present. Therefore ProjectApplication must bind, query, exclude, and unbind the selected gateway `deviceId`; submitting `MediaChannelEntity.id` to `/assets/bind/device` is not a valid device-asset binding and returns 403.

Implementation steps:

1. Add typed API wrappers for application user candidates, role CRUD with `applicationId`, paged device details, media gateways and per-gateway channels, and reusable asset binding/unbinding where needed.
2. Extend ProjectApplication state with camera resources and lazy paged user candidate loading. Keep request orchestration in `useProjectApplication.ts` or small services, not inside Vue components.
3. Add a video configuration tab and component matching the prototype at a restrained Ant Design/detail-workspace density: camera card grid, bind drawer reusing the existing resource-picker style where possible, settings dialog, empty/loading states, bind and unbind feedback. Camera binding selects the left-side gateway `deviceId`; the right-side channel table is preview-only.
4. Refactor user management so `绑定用户` selects current project users and binds the selected IDs through the incremental business-application member endpoint. Bound-member row actions use the business-application unbind endpoint; status editing is no longer exposed from the member table.
5. Refactor role management data operations to use the system role CRUD endpoints. Query and creation carry `applicationId`; update uses `PATCH /role`; delete uses `DELETE /role/{id}`; the existing permission editor endpoints remain unchanged.
6. Verify application creation by relying on backend creator binding and refreshing the application detail after creation/load; update this document if an authenticated smoke test shows a timing or missing-membership gap.
7. Keep all user-visible copy in `locales/lang/zh.json` and `locales/lang/en.json`, and keep touched/new Vue files at or below 300 lines by splitting dialog/card services as needed.

Risks and confirmation points:

- Runtime video permission remains device-correlated because no channel-level asset type was found. Binding one gateway exposes all of its channels; strict channel-level authorization would require a backend channel asset or binding endpoint.
- Member removal uses the dedicated business-application unbind endpoint and does not update the user's global enabled state or replace other application memberships.
- Deleting a role through the system role delete endpoint is global role deletion, matching the requested interface but broader than simply removing it from this application.

Verification result:

- `locales/lang/zh.json` and `locales/lang/en.json` parse as valid JSON.
- Static scans find no legacy role wrappers (`/role/business_application`, `/role/_create`, `/role/{id}/_update`) in the application-center implementation.
- Static scans confirm the ProjectApplication picker queries current-project users through `/user/detail/_query`, appends `id nin` for already-bound application members, submits selected IDs through `/business-application/{applicationId}/users/_bind`, and unbinds row-level members through `/business-application/{applicationId}/users/_unbind`.
- Static scans confirm the device drawer uses `/device/instance/detail/_query` with the fixed provider exclusion, descending creation-time sort and required detail context, while the camera drawer cannot call the channel endpoint before a gateway is selected.
- Video binding contract scans are covered by the focused Video Gateway Binding Interaction Plan above; its final static verification result is recorded there.
- Detail-page style follow-up removes gray panel backgrounds from the summary, tab container, section cards, table cells, resource picker grouping, role sidebar, and video placeholders through page-scoped styles.
- Touched and new Vue SFCs in `Detail/` remain below 300 lines. This member-unbind follow-up leaves `UserManagement.vue` at 134 lines and detail `index.vue` at 230 lines. Build and `tsc` are intentionally not run per the task constraint; authenticated picker, unbind, and binding smoke testing remain pending.

### Goal And Scope

The operations UI provides an application ledger, creation flow, and single-application workspace for project administrators. The page keeps the approved `资产卡片台账页` and `对象详情工作区` interaction profile while using the authentication-manager business-application contract as its only data source.

Owning module: `ui/modules/authentication-manager-ui`. The application menu Scope requires a narrow shared change in `ui/jetlinks-web-core`; `runtime-ui/`, backend behavior, generated artifacts, and unrelated management pages remain out of scope.

### Delivered Contract

- Applications: standard CRUD under `/business-application`; list queries always include the current `projectId`. Creation no longer submits `projectId`; `templateId` is create-only and is omitted from updates.
- Templates: list and menu preview use `/business-application-template` and `GET /business-application-template/{id}/menus`. Disabled templates remain visible but cannot be selected for creation.
- Application template management: `application-center/Template` manages `/business-application-template` directly in the project-side UI. Its Save page loads candidate menus from `POST /menu/user-own/tree`, asset type names from `GET /asset/types`, grantable asset permissions from `POST /menu/asset-accesses/grantable`, and scope strategy options from `GET /dictionary/asset-scope-strategy/items`; it does not use SaaS runtime or region selection. Internal-application template grants continue to filter the dedicated `open-api` capability; external-application roles use all menu owners available to the current operator and still intersect them with the template ceiling.
- Enums: backend `{value,text}` values are normalized centrally; comparisons and submissions use `value`, while the page displays `text`.
- Application creation: the application ledger opens a centered create dialog with icon upload, 30-character name validation, 100-character description validation, and a two-column template selector. Disabled templates remain visible but locked. Backend `BusinessApplicationService.handleCreated` binds the persisted creator to the new application dimension, so the UI does not perform a duplicate creator-binding request.
- External application opening: before starting membership or role admission, the open action checks `externalUrl`. An external application without a configured URL stays on the current page and prompts the operator to enter the external link; Runtime applications and configured external applications keep their existing flows.
- External application opening verification: the focused Node suite passes all 11 cases, including configuration echo, the missing-link short circuit, configured external URL flow, role selection, failed URL loading, and unchanged Runtime access; the `authentication-manager-ui` production build passes with 10,906 transformed modules.
- Users: bound users are queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. Entering a ProjectApplication detail page ensures the current signed-in user is bound to that business application; opening an application also requires the user to hold one of the application's roles, auto-binding the single available role or asking the user to choose when multiple roles exist. `绑定用户` queries current project users through `/user/detail/_query`, filters already-bound IDs with `id nin`, and binds selected IDs through `/business-application/{applicationId}/users/_bind`; row-level `解绑` posts the selected user ID to `/business-application/{applicationId}/users/_unbind`; existing-user role updates omit `businessApplicationIdList`, so they preserve all memberships.
- Roles: application roles now use the same system role APIs as `views/system/Role`: `POST /role/_query/` with an `applicationId` exact term, `POST /role` with `applicationId` on creation, `PATCH /role` on update, and `DELETE /role/{id}` on deletion. Updates do not resend `applicationId` because it is create-only.
- Role permissions: every role-editor load directly re-queries `POST /menu/user-own/tree` instead of reading `menuResultCache`, and intersects those nodes with `GET /business-application-template/{templateId}/menus` by exact menu `id`. Internal applications query `owner=app`; external-link applications query all menu owners and retain `open-api` candidates. Both branches keep the template authorization ceiling and reuse `/menu/role/{roleId}/_grant/detail` and `/menu/role/{roleId}/_grant`; saved grants and asset accesses are pruned to the final current-operator and template candidate scope before echo and save.
- Devices: bound assets use the `dim-assets` term with target type `business_application`. The bind drawer has no device group/product/gateway classification sidebar and pages candidates through `/device/instance/detail/_query`. Every candidate request prepends `productId$product-info = "accessProvider nin (agent-device-gateway,agent-media-device-gateway,official-edge-gateway,fixed-media,gb28181-2016,media-plugin,onvif)"`, sorts by `createTime desc`, and sends the required tags/relations/parent detail context. Opening the drawer does not call `/assets/bindings/device`; confirming calls `/assets/bind/device` once with a single binding object, selected device IDs in `assetIdList`, and `read`, `save`, `delete`, and `share` permissions. Unbinding continues through `/assets/unbind/device`.
- Video: opening the camera drawer queries gateways through `/media/device/_query` only. Checkboxes in the left list select multiple gateway `deviceId` values for binding, while the most recently clicked or checked gateway independently drives the right-side preview. No channel query is issued until a preview gateway is active; the right-side table then pages `/media/device/{gatewayId}/channel/_query` without row checkboxes. Bound-camera lookup filters `/media/channel/_query/no-paging` by `dim-assets` on `deviceId`; already-bound gateway IDs are excluded from the left list. Confirm submits all checked gateway IDs through `/assets/bind/device`, and unbind submits the containing gateway `deviceId` through `/assets/unbind/device`.
- Membership mutation boundary: application member addition uses the incremental `/business-application/{applicationId}/users/_bind` endpoint, and row-level member removal uses `/business-application/{applicationId}/users/_unbind`. Role deletion still uses the global generic role endpoint and remains explicitly confirmed.
- Application detail tabs: the single-application workspace exposes only `应用设置`, `应用成员`, and `应用角色`. Device and video asset binding remain available in their service boundaries but are no longer eagerly queried or rendered as detail tabs.
- Application settings: `应用基本信息` is read-only by default and switches the whole section into edit mode. Its edit, cancel, and save controls are shown in the detail header action group immediately before `删除` while the settings tab is active; the settings card no longer renders its own top-right actions. Icon, name, description, default language, and timezone are saved in one update; the application link remains read-only and copyable. The timezone is stored as `configuration.timezone`, defaulting to `Asia/Shanghai` for existing records.
- Menu data access: `application-center/ProjectApplication` exposes `business_application`, `user`, `role`, and `device` as assignable asset types. Application templates and `assets-bind` remain functional permissions rather than asset types.

### Application Menu Scope

应用角色分组权限：`baseMenu.json` 为 `application-center/ProjectApplication` 的 `manage-role` 按钮补充 `role-group` 的 `save`、`delete` 动作，并在该菜单的 `assetTypes` 中加入 `roleGroup`，使应用角色管理具备角色分组写入权限和对应的数据权限配置入口。其他已有菜单权限与资产类型保持原样；实际服务端鉴权及资产范围仍需使用真实账号联调。 菜单 JSON 与权限增量契约校验通过，确认除这两处新增配置外，其他菜单字段与 `2.20` 一致；应用权限范围与组织职位相关的 8 项既有回归通过。

External applications (`configuration.openMode=external`) use the third-party entry instead of Runtime startup context: the application-center list, detail and home cards request `POST /business-application/{id}/external-url` with the existing project authentication, then navigate directly to the returned URL. Backend PR #365 validates application access, resolves the latest template parameters through parameter Providers and combines them with the configured entry URL; the broader third-party application Provider architecture is tracked in PR #359. The application settings page reads and saves `externalUrl` through the standard application CRUD API. The Header switcher remains on the shared Runtime application path. The following Runtime startup rules apply only to internal applications opened from the application center.

External URL validation: `applicationConfiguration.ts` supplies the HTTP/HTTPS URL check shared by the application settings form and the final external navigation. Settings reject invalid links before emitting a save; invalid URLs returned by the backend show the existing access-failed message and close the reserved window. URLs must explicitly begin with `http://` or `https://`; Runtime application settings keep their existing behavior. The focused Node suite (`node --experimental-strip-types --test tests/applicationTemplateParameters.test.mjs tests/projectApplicationExternalAccess.test.mjs`) passes all 21 cases, including the real settings component's validation/save flow and navigation with HTTP/HTTPS, script/data/file protocols and relative or malformed addresses. From `runtime-ui`, `pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` passes (10,903 modules, 18.66s), retaining existing build warnings. `pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` reports 628 workspace diagnostics, none in the three changed implementation files; locale JSON parsing and `git diff --check` pass. The module has no lint script. Browser interaction and live backend integration remain pending.

Template parameter configuration: `views/application-center/Template/Save/ExternalParameterConfig.vue` adds a local parameter section to the existing configuration pane; `useApplicationTemplateParameters.ts` owns its draft and save flow. The frontend shows the parameter section and loads `GET /business-application-template/parameter-providers` only after the template detail identifies the top-level `provider=third-party`; templates without that provider do not request the endpoint. Store `{ name, provider, configuration }` entries in the template's `configuration.externalParameters` and preserve unrelated configuration fields. The `fixed` provider edits `configuration.value`; other providers accept a JSON configuration object. Empty lists explicitly clear all parameters. Rules apply on the next application opening and are never copied to, or overridden by, application instances.

Parameter verification is included in the 21-case suite above: provider-gated discovery, save/echo/clear, duplicate or incomplete parameters, invalid configuration, custom-provider data retention, provider-load retry and save failure. Templates without a provider, with `official`, or with an unrelated provider make no parameter-provider request; `third-party` loads the choices.

Opening and switching applications use `application.id` as both the pathname code and the `project_<application.id>` storage key. The shared access utility copies the active project's `token`, `apiUrl`, `domain`, `runtime`, and project `id` through `setProjectStorage`; it changes only the storage `name` to the application name, stores `scope: <application.id>`, and does not request a new token. `applicationScope=<application.id>` remains a per-tab menu bootstrap scope. For the current hash router it is written after the route hash (for example `/<application.id>/#/?applicationScope=<application.id>`); non-hash and legacy links remain readable.

When the project-side independent package runs with `VITE_APP_ENVIRONMENT=''`, project storage is intentionally disabled. In that mode the same shared access utility still supports same-origin application switching by writing only the hash route `applicationScope` query and reusing the normal session token; custom cross-Origin application domains still require project storage/bootstrap context and are rejected instead of leaking token state through a generic URL.

Same-Origin targets are written before navigation. A custom domain on another Origin receives a one-time `applicationAccess` startup query; `jetlinks-web-core/src/main.ts` consumes it before router/session initialization, writes the target Origin's project storage, restores the copied token for the initial router check, and immediately removes the sensitive startup query. The target URL still uses `/<application.id>/`, so the custom domain is recognized as a project-side application rather than an external tenant page.

When the application runtime is opened from a stored application context, `jetlinks-web-core/src/package.ts` reads `project_<application.id>.scope` and adds `X-Application-Scope` to all axios and NDJSON requests. The project entry never writes storage scope, so project-level APIs continue without this header. An explicit empty `applicationScope` query clears only the per-tab menu bootstrap value.

Hash-aware application access verification: the application access, business-application context, application-scope, and project-runtime tests pass; the `authentication-manager-ui` production build also passes with 9948 transformed modules. Workspace-wide `vue-tsc` remains nonzero because of the pre-existing implicit `any` in `jetlinks-web-core/src/store/businessApplication.ts`, while the new route-query code has no targeted diagnostics.

The related shared code is limited to:

- `jetlinks-web-core/src/utils/application-scope.ts`: URL creation and per-tab Scope resolution.
- `jetlinks-web-core/src/utils/application-access.ts`: project storage copying, application runtime URLs, and cross-Origin startup consumption.
- `jetlinks-web-core/src/main.ts`: consume cross-Origin application startup before router/session initialization.
- `jetlinks-web-core/src/store/businessApplication.ts`: switch applications through the shared access contract and reload under the new pathname code.
- `jetlinks-web-core/src/api/system/menu.ts`: optional menu-request header.
- `jetlinks-web-core/src/store/menu.ts`: resolve the current tab Scope when menus are queried.

### UI And Code Boundaries

- `api/application-center/businessApplication.ts`: typed application, template, generic user/role, and asset request boundary.
- `api/application-center/applicationTemplate.ts`: project-side application template CRUD, menu grant, scope strategy, menu candidate, asset type, grantable asset permission, and tag request boundary.
- `views/application-center/ProjectApplication/applicationModel.ts`: response envelope, enum, list, menu, and view-model normalization.
- `views/application-center/ProjectApplication/applicationDeviceService.ts`: bound-device loading and fixed-contract candidate device pagination.
- `views/application-center/ProjectApplication/applicationUserService.ts`: application member lookup, batched detail hydration, safe creation, and existing-member updates that omit the full-replacement application list.
- `views/application-center/ProjectApplication/applicationRoleService.ts`: system role CRUD orchestration for application-scoped roles.
- `views/application-center/ProjectApplication/applicationRolePermissionScope.ts`: internal template-ceiling and external current-operator permission candidate normalization.
- `views/application-center/ProjectApplication/applicationCameraService.ts`: bound-channel loading, media gateway discovery, per-gateway channel pagination, and device-asset permission filtering for video configuration.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: remote state and mutation orchestration.
- Ledger/create/detail components: loading, empty, validation, confirmation, submit, and post-mutation refresh behavior.
- The ledger follows the project-application card design: the shared `PageHeader` carries a `ConditionFilter` whose name and status fields submit the component's standard `terms` model alongside the primary create action, followed by a responsive three-column card wall and an inline create card. Each card shows icon, name, status, template, description, creation time, edit/status actions, and the primary open action. Application cards reuse `jetlinks-web-core/src/components/CardBox/index.vue` (see 应用列表卡片改为 CardBox 壳层 for the bottom toolbar); unsupported gateway/camera metrics and the template filter are not rendered.
- `views/application-center/Template/`: template ledger, create dialog, tag sidebar, and Save workspace. The Save workspace keeps the top summary as a detail display, then separates document and configuration tabs. Configuration reuses `MenuAssetPermissionEditor` with asset permission batch selection and writes scope strategy to `assetAccesses[].options.scopeStrategy`.
  Third-party templates also expose optional `configuration.platformId` in the existing redirect configuration form. An empty value uses the template ID at runtime; regions with identical application IDs should use different platform IDs. Saving preserves unrelated configuration, and only users with update permission can edit the field.
- `baseMenu.json`: visible name “应用管理” and backend resource actions required by the page.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Unsupported prototype surfaces were removed: fake quotas and metrics, channel-level camera asset binding, direct-device switching, and the device/video tabs from the application detail workspace. No `/project-application*`, `project_application`, or `X-Project-Application-Id` compatibility contract is used; the internal route and source folder name remain unchanged to avoid breaking existing bookmarks and menu codes.

Every created or substantially edited Vue file remains at or below 300 lines.

### 应用模板数据权限候选一致性

- 从项目进入 runtime-ui 时，应用模板的数据权限候选以当前项目菜单为上限，首次配置、保存回显及重新打开保持一致。模板接口补齐的候选不会额外引入「全部数据」；项目菜单本身允许 `all` 时仍正常提供该选项。
- 实现归属：`runtime-ui/modules/authentication-manager-ui/views/application-center/Template/Save/useApplicationTemplateMenuConfig.ts`。模板菜单在进入 `normalizeGrantedMenus` 前复用 `menu-config.shared.ts` 的 `filterGrantedMenuAssetAccessesByMenuScope`，已选资产权限在进入编辑器前复用 `filterAssetAccessPoliciesByMenuScope`，防止公共编辑器合并回显时扩大项目候选。公共权限编辑器、应用角色、后端接口、菜单定义及运营端 `ui/` 未改动。
- 历史模板若已选择当前项目菜单不支持的范围，编辑器回退到当前合法的默认选项，在用户下次保存时持久化；读取模板不自动写回。`options.scopeStrategy` 从原始策略独立回显，因此过滤越界选项不会重置数据范围策略。
- 回归：在本模块执行 `node --test tests/applicationTemplateMenuConfig.test.mjs tests/applicationRolePermissionScope.test.mjs tests/applicationTemplateMenuPreview.test.mjs`，8 项通过。新增用例使用真实 Vue 状态、权限编辑器与模板 hook，仅替换接口及消息边界，覆盖新模板保存与重载、历史越界值回退、范围策略保留、多资产候选隔离，以及项目允许 `all` 的反例；修改前已复现保存后追加 `all` 的断言失败。
- 构建：在 `runtime-ui/jetlinks-web-core` 执行 `node --max_old_space_size=8192 --max-semi-space-size=64 -e "process.argv.push('--module-name','authentication-manager-ui'); import('vite').then(({ build }) => build({ build: { outDir: '/tmp/jetlinks-app-template-permission-build' } }))"` 通过，转换 11,783 个模块，耗时 1 分 17 秒；仍有模块插件加载、浏览器映射数据、CSS 注释和大包提示。`git diff --check` 通过，工作区和目标模块没有 lint 脚本。
- 浏览器：当前项目模板完成真实「保存配置 → 刷新 → 重新打开配置」验证，14 类资产保存前后均无「全部数据」，候选及「所在租户」选中值一致。新模板的创建流程、历史越界值和其他允许 `all` 的项目通过聚焦回归覆盖，未新增实际业务数据进行验收。
- 类型限制：在 `runtime-ui` 执行 `pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` 仍有 599 项工作区诊断，修改的 `useApplicationTemplateMenuConfig.ts` 无诊断；例如未修改的 `menu-config.shared.ts:200` 存在泛型 `permissions` 属性错误。需处理工作区类型问题后重跑该命令；整站生产构建未执行。

### Verification

- Device/camera binding verification confirms that opening either picker never references `/assets/bindings/device`; confirming a selection submits one `/assets/bind/device` object with `assetIdList` and the `read`, `save`, `delete`, and `share` permissions.
- This drawer-query change is verified with JSON parsing, focused Vue SFC parsing, TypeScript syntax transpilation, static request-contract scans, Vue line counts, and `git diff --check`. Build and `tsc` are intentionally not run for this pass.
- Targeted Vue diagnostics report no new errors in the application-center API/page and application-Scope files. The full module check still exits non-zero because of pre-existing shared-core and legacy-module diagnostics.
- Application-Scope checks cover a plain tab, query bootstrap, reload restore, explicit clear, absolute domain, host with port, and relative URL behavior.
- `baseMenu.json`, `locales/lang/zh.json`, and `locales/lang/en.json` parse as valid JSON.
- The application-ledger, create-dialog, and settings Vue files compile in the module production build and remain below 300 lines. The list/create/settings prototype comparison was performed in the browser; local authenticated interaction remains pending because the development page redirects to login.
- The application-template management files pass focused JSON parsing, route/menu boundary review, i18n key coverage, SFC tag scanning, TypeScript syntax transpilation, and line-count checks. Per task scope, build and `tsc` were not run; authenticated backend calls for `/business-application-template/{id}/menus`, `/menu/user-own/tree`, `/menu/asset-accesses/grantable`, `/asset/types`, and `/dictionary/asset-scope-strategy/items` still need environment smoke testing.
- The application-management menu asset types match the application, user, role, and device interfaces consumed by the page. This menu-only update was checked by JSON parsing and boundary review; build and `tsc` were intentionally not run.
- The application-role permission editor now re-queries `/menu/user-own/tree` on each load and no longer depends on the menu store initialization state or `menuResultCache`. `git diff --check` and the full `pnpm build` pass; the build transforms 22883 modules with only existing asset, dynamic-import, CSS-comment, and chunk-size warnings. The module-target build argument is rejected by the current Vite CLI, so validation used the root full-build script. `RoleManagement.vue` remains below the 300-line limit at 292 lines; authenticated role-permission interaction remains pending.
- External-role permission scope checks cover all current-operator menu owners, retained `open-api` mappings, template intersection, saved-role echo, and current-operator asset-scope pruning; internal-role checks cover the unchanged template/menu intersection. The focused Node suites and `authentication-manager-ui` production build pass; authenticated role-grant persistence remains pending environment verification.
- The target implementation contains no legacy application API path, dimension type, header, or direct-device setting.
- The current three-tab detail plus ledger/create/settings optimization passes locale JSON parsing, `git diff --check`, focused unsafe-member-mutation scans, Vue line-count checks, and a production build with 9954 transformed modules. The ledger search now reuses `ConditionFilter` and sends its normalized `terms` directly to the application query. Module `vue-tsc` still exits non-zero on the pre-existing implicit `any` in `jetlinks-web-core/src/store/businessApplication.ts`; no `ProjectApplication` file reports a diagnostic.
- The settings-action placement follow-up passes focused SFC parsing through `vue/compiler-sfc`, scoped diff whitespace checks, and Vue line-count checks (`Detail/index.vue` 223 lines, `ApplicationSummary.vue` 203 lines, `ApplicationSettings.vue` 247 lines). Build and `tsc` were intentionally not run for this pass by request.

Run the production build command for this module from `ui/jetlinks-web-core`:

```bash
node --max_old_space_size=8192 --max-semi-space-size=64 -e "process.argv.push('--module-name','authentication-manager-ui'); import('vite').then(({ build }) => build())"
```

### 应用列表卡片改为 CardBox 壳层

Goal: 把 `ProjectApplication` 列表卡片的壳层从 `CardSummary` 换成通用 `CardBox`（`jetlinks-web-core/src/components/CardBox/index.vue`），并让卡片底栏采用 `DeviceAlarmRecordCard` 的按钮排布：左侧图标文字按钮 + 右侧主按钮，底栏与内容之间用分隔线隔开。

Owning module: `runtime-ui/modules/authentication-manager-ui`。`ui/` 运营端的同名模块、`CardBox` 组件本身、接口契约、路由、菜单和 i18n key 都不在本次范围内。

Implementation:

1. `views/application-center/ProjectApplication/components/ApplicationCard.vue` 保留对外 `item` / `loading` / `opening` props 与 `edit` / `open` / `toggle-status` 事件契约，内部把 `CardSummary` 换成 `CardBox`：`#img` 复用 `CardBox/CardAvatar.vue` 承载应用图标，`#content` 承载名称、模板、描述和创建时间，`#bottom-tool` 承载底栏按钮。
2. `CardBox` 的 `status` / `status-text` / `status-names` 接管右上状态位与顶部色条：`enabled -> success`、`disabled -> default`，不再自己画状态图标。
3. 底栏样式对齐 `modules/device-manager-ui/views/device/alarm/components/DeviceAlarmRecordCard.vue`：`border-top: 1px solid var(--jet-theme-border-color-1)`，左侧 `编辑` / `停用|启用` 为 `type="text"` 图标按钮，右侧 `打开应用` 为 `type="primary"` 主按钮。
4. `ProjectApplication/index.vue` 继续使用 `<ApplicationCard>`，列表页模板、筛选和创建入口不变；只把内联「创建应用」卡片的固定高度换成共享的 `--application-card-block-size`，让它和更高的 CardBox 卡片在同一栅格里保持等高。

不做：不新增后端接口或字段，不改 `ProjectApplication` 的请求编排与 `useApplicationList` 逻辑，不改 `CardBox`/`CardAvatar` 组件实现，不同步改 `ui/` 下的同名页面。

Risks / 待确认点:

- 卡片高度改由栅格行高驱动（`height: 100%` + `min-height`），需要与同行的内联「创建应用」卡片（固定高度）保持等高。实测 App 卡片内容高 `219px`，而内联创建卡只有 `204px`，两者落在不同栅格行时会不一致，因此引入共享的 `--application-card-block-size: 14rem`，两边都按它取高。
- `statusText` 仍来自后端枚举 `text`；字典缺失时会回退成裸状态值，这是既有行为，本次不额外兜底。
- `CardAvatar.vue` 仍是非公开导出的内部头像层，这里按仓库既有做法直接按文件路径引用。

Verification result:

- SFC 编译：`ApplicationCard.vue`（script / template / less scoped style）与 `index.vue` 全部编译通过。
- 聚焦 `vue-tsc`：`ApplicationCard.vue` 与 `ProjectApplication/index.vue` 无任何诊断；本次运行剩余的非零诊断全部来自既有共享核心文件（`ConditionFilter`、`CardBox/index.vue`、`Search/Filter`），与本次改动无关。
- 模块生产构建：`authentication-manager-ui` 生产构建通过（`✓ built in 1m 23s`，退出码 0）。
- 视觉核验：用一次性 Vite 预览页 + 无头 Chromium 渲染「4 张应用卡片 + 内联创建卡」的栅格并取盒模型，结果为 `cardHeights=[224,224,224,224]`、`createCardHeight=224`、`avatarTops=[0,0,0,0]`（头像与名称顶对齐）、`actionsBorders=["1px",...]`（底栏分隔线存在）；`enabled/disabled` 分别渲染为绿色「运行中」和灰色「已停用」，长名称和两行描述按 `j-ellipsis` 截断。该预览只用临时脚手架验证样式，验证后已删除，未进入提交。
- 未验证：真实运行时页面里带鉴权的列表交互（登录后打开 `/application-center/ProjectApplication`）未在本任务中执行。
- `git diff --check` 通过；`ApplicationCard.vue` 224 行、`ProjectApplication/index.vue` 174 行，均在 300 行门禁内。

## 项目概览归属迁移

概览迁入本模块，保留最新菜单契约 project/Overview、/overview、owner=cloud。页面落点 views/project/Overview，六组件落点 visDashboard/Base，独立查询 api/overview.ts；同步迁移概览菜单、文案及验收脚本。project-side-ui 的其他页面保持不变。迁移后验证菜单单一归属、组件发现范围、相对引用、编译及公告/告警测试。

浏览器核验最新服务端菜单为 `project/Overview`、`/overview`，页面最终落在 `views/project/Overview`；`index.ts` 保留不保留旧菜单别名。BaseMenu 仅迁移概览条目，其余最新系统/开放与集成层级保持不变。旧 overview.theme/types 实际仅被运维任务详情使用，已归位 project-side-ui 的任务详情 theme 目录，避免它反向依赖概览模块。

## 资源中心仪表盘组件

`visDashboard/ResourceCenter` 提供九个单风格组件，通过新的 `DashBoardCanvas` 自动发现与组装；目录、默认业务配置、真实接口口径及临时浏览器注入方式见 [资源中心仪表盘说明](docs/resource-center-dashboard.md)。正式入口为 `/resources/dashboard`，页面落在 `views/resources/Dashboard/index.vue`，绑定现有菜单 `resources/Dashboard`；允许拖拽和缩放已有组件，仍不允许编辑、添加或删除组件，布局以 `resource-center-dashboard` 为 key 保存在浏览器 localStorage，保留筛选和快捷跳转。本组不修改项目概览六组件，不接入旧 dashboard，不新增菜单。数据采集和物联网卡仅私有化运行时展示。

## 第三方应用运行时入口

`baseMenu.json` 的 `application-center/ThirdPartyApplication` 是独立菜单，页面位于 `views/application-center/ThirdPartyApplication/index.vue`，当前开放平台菜单统一展示当前运行时的 API 应用，详情 ID 为 applicationId；直接登录与 SaaS 跳转只沿用既有请求上下文，不因登录来源改查控制面的项目接入关系。原 `ApiApplication` 页面的 internal-standalone/apiServer 模型保持不变。

菜单 `application-center/ThirdPartyApplication` 和列表标题统一显示为“开放平台”（英文 Open Platform）；本模块通过已有 `getMenuFilters` 入口按精确 code 同步 `name/i18nName`，已保存菜单无需为本次改名重新初始化。菜单 ID、路由和权限不变，`system/Apply` 的“第三方应用”名称不调整。同一入口的新增按钮、列表名称、详情/返回、编辑表单、操作提示和成功消息按应用对象命名（如新增应用、应用名称、应用详情和返回应用列表），中英文同步；真实 API 应用 ID、OAuth2 技术字段及接口数据模型保持不变。列表复用 `pro-table__no-padding` 去掉表格外层内边距，并移除行链接的水平 padding，使筛选栏、表格和分页外沿一致，表头与单元格文字对齐。本次仅完成源码、JSON 和差异核对，页面仍由用户人工验收。

开放平台沿用平台的应用资产数据权限：菜单声明 `accessSupport: support`、`supportDataAccess: true`，现有种子中的单资产字段 `assetType: "application"` 继续兼容。菜单编辑页 `views/system/Menu/Detail/BasicInfo/Permission.vue` 当前统一绑定 `assetTypes` 多选数组，旧字段转换为 `["application"]` 回显；新数组优先，单选保存时同步旧字段，多选时显式清空旧字段，详见本文“菜单多资产表单兼容”。后端已有应用资产注册、实体资产注解及 `AssetsHolderCrudController`，不在前端添加创建人过滤。已保存菜单可在菜单管理中将“数据权限控制”设为“支持”并选择“应用”后保存，再按平台已有角色/组织授权流程设置范围；仅更新菜单种子不会修改数据库中的菜单及已有授权，不执行全量初始化。表单专项回归与模块构建结果见上方说明；初始化后的回显与真实权限过滤仍待登录环境确认。

菜单种子通过 `showPage: ["application"]` 匹配应用管理权限；侧栏从服务端 `/menu/user-own/tree` 读取已保存菜单，修改本地种子不会自动更新现有环境。已有环境应由菜单管理员按既有流程单独增加并授权该入口，不执行全量菜单初始化。通用接口授权使用 `api_group` 查询、授权权限，菜单种子已声明；SaaS 项目数据授权不使用 API Group 代替业务 scope，控制面操作的项目管理员身份仍由后端校验。

### 项目第三方接入前端纠偏（2026-09-24，历史页面说明）

已获用户授权，依据《第三方应用项目前端对接执行说明》的更新契约实施。范围仅本前端模块的第三方应用页面、局部 API、原菜单入口及中英文文案；不改 ui/、后端、公共请求封装，不迁移 test 等旧记录，不执行真实业务写入。

实施步骤与落点：

1. `api/application-center/thirdPartyIntegration.ts` 对接项目关系列表、available-applications、connect、authorization、state 五类控制面接口。使用既有控制面认证上下文，不改 baseURL 或全局代理。
2. `useProjectContext.ts` 从项目存储 id 读取项目 ID，不将 URL projectCode 当项目 ID。列表搜索、详情路由主键均基于接入关系；`index.ts` 保留显式详情组件映射。
3. `Detail/AuthorizationPanel.vue` 展示获批 scope 和资源类型、回显现有授权，携带真实 authorizationRevision 保存。停用关系不可编辑授权；冲突显示错误并保留草稿，不自动重提。`selected` 使用真实资源 ID；`all_current` 提交空 ID 数组，空资源授权不解释为全量授权。已移除本页面旧 API Group 授权面板及无引用的资产 support 查询封装。
4. 首次接入后分别展示关系状态与 API 应用状态。管理员显式点击“启用 API 访问”并填写原因，再通过关系 state 接口启用；成功后读取实际 API 应用状态，不自动签发凭据。停用、移除同样填写原因，不直接删除 API 应用。
5. `Detail/useThirdPartyDetail.ts` 核对项目、runtimeId 与 runtimeApplicationId，关联运行时不匹配、上下文缺失或应用读取失败时阻断凭据及订阅面板。`CredentialPanel.vue` 继续支持 OAuth2 元数据、启用、查看、隐藏、轮换及撤销。明文密钥不持久化，切换面板/项目后清除；已撤销凭据不展示旧 Client ID/密钥提示。异步返回不得恢复卸载页面的密钥或追加订阅刷新请求。
6. SaaS 项目详情按“基本信息 / 数据访问授权 / 服务端接入与凭据 / 数据订阅”组织。订阅继续采用内嵌列表与单层编辑抽屉，不新增投递执行能力，订阅前端现已按新对接说明展示 notRunning/starting/running/failed，未知状态不推断为已运行或投递成功。中英文文案同步补齐。

剩余边界与人工验收：

- `useResourceOptions.ts` 的指定资源选择目前仅支持 device，复用本模块现有 `/device/instance/_query`，支持名称查询、分页及已选 ID 回显。其他获批资源类型的 selected 查询契约未确认，界面明确提示不可查询，不猜测接口；已有 ID 保留回显，用户可显式选择 all_current 或删除该授权项。此部分不是全部资源类型选择器已完成。
- 控制面接口与运行时接口沿用现有请求入口。需在用户现有部署确认路由、控制面登录态、项目存储 id/runtime/token 及关联运行时可达性；源码契约匹配不代表环境已部署或页面验收通过。
- 原普通 API 应用（例如 test）不会自动迁入新列表；没有真实接入关系时显示空列表，不补造数据。
- 已完成源码调用链检查，中英文 JSON 与菜单 JSON 可解析，新增 91 对项目接入文案键一致、静态文案引用无缺失，本功能 Vue 文件均不超过 300 行，git diff --check 无差异格式错误；依照用户要求未运行 lint/typecheck/build、测试、浏览器或服务操作。真实项目接入、授权冲突、启停、凭据生命周期和订阅需用户在现有环境人工验收。无新增 commit / PR。

### 登录来源分流优化（历史行为，已由 2026-10-09 订阅主链替代）

用户已确认仅优化前端，不处理后端源码或部署。按现有部署模式、登录来源标记及项目运行入口选择流程：直接登录进入通用 api-application 管理；SaaS 项目入口保留项目关系与控制面校验，缺上下文不得回退通用接口。保留独立菜单，详情延续 Tab 布局，列表和详情分别按对象类型装载，凭据及订阅组件复用。

实施步骤：隔离入口与详情 ID 语义；补通用应用创建、接口组授权和生命周期；保持项目流程不变；按新契约更新订阅运行状态、父应用状态提示与国际化。仅做源码、JSON、差异检查，不构建、测试、操作浏览器或真实业务数据。

实施完成与边界：

- `useApplicationEntry.ts` 复用部署模式、getProjectRuntimeConfig/isProjectRuntime，并核对 SaaS 跳转已有 pFrom/pCode 来源标记。普通登录会清除 pFrom；不能仅因 URL 或缓存含 projectCode 就要求项目关系。私有化直接登录忽略旧项目缓存；无 SaaS 来源的直接登录使用通用流程及既有请求认证上下文。SaaS 来源与当前项目编码不匹配、项目会话缺失时只报错，不回退通用接口。业务应用 scope 不作为平台管理入口。详情导航写入 entry，入口不匹配时阻断并提供返回列表。
- `index.vue` / `Detail/index.vue` 仅按入口装载独立页面；原项目页面保留在 `ProjectList.vue` / `Detail/ProjectDetail.vue`。直接入口为 `Direct/List.vue`、`Direct/Detail.vue`，通用应用创建使用 api-application、空 integrationModes、disabled 状态和空 grants。保存后查列表，不猜测返回 ID。
- 通用详情支持基本信息编辑、API 应用启停及删除、OAuth2 凭据和事件订阅；不调用控制面的 connect/state，也不复用 apiServer 或 SaaS scope。通用 API Group 授权支持操作选择和显式撤销全部；全量保存保留未编辑、目录暂不可见的授权与现有资产范围，不自动补 business_application 范围。新增资产范围编辑尚未接入，不宣称设备资产授权已完整完成。
- 订阅 state 与 executionState 分开展示；父应用停用时允许存草稿，禁用订阅启用操作；目录失败不阻止保存已有草稿，切换渠道仍清空旧配置。http-hook 提示、应用身份目录语义及 Token scope 与后台订阅的区别均有中英文文案。未新增投递日志、统计、重试、补发或生产调用。
- 已做局部引用和国际化键的静态核对，中英文及菜单 JSON 可解析，Vue 文件均不超过 300 行，git diff --check 无差异格式错误。未做构建、类型检查、lint、测试或浏览器验收。待人工分别验收直接登录与 SaaS 跳转、会话缺失阻断、详情 ID、通用接口授权、OAuth2 凭据及订阅四态。本轮不核验后端分支或部署、不提交推送。

### 订阅新契约前端改造（2026-10-09）

依据桌面《第三方订阅后端需求与开发交接》第7、8节及当前认证源码，纠正前端将 SaaS 登录来源等同于订阅项目准入的实现。用户已确认实施，以下为本轮实际行为及验证边界；前两节记录的登录来源分流不再作用于订阅菜单。

- 目标与归属：仅本模块第三方订阅入口、订阅 API 类型、表单/详情/hook 及中英文文案。订阅以当前运行时的 API applicationId 为父对象，沿用既有请求地址、认证与资产上下文；可选 SaaS 授权由后端实际装配的 ApplicationAuthorizationCustomizer 校验，不由 pFrom/pCode、构建类型或 projectId 猜测。
- 已完成：①订阅入口解除强制项目接入关系分流与前置审核/准入检查，不新增 capability 探测或失败回退；②请求改为 name/description/scopes/channelProvider/channelConfiguration，范围逐项使用 eventTypes/configuration，按真实数据深复制回显；③渠道仅从后端 id 目录选择，为已提供的 http-hook 实现 endpoint/method/headers 表单，不继续读取 name/configMetadata；④列表及详情改读 scopes，保留四态运行状态，目录/校验/保存/启用失败留在页面且不丢草稿；⑤同步中英文与本说明。
- 不做：不修改后端、公共请求/登录代码或服务配置，不开发 SaaS 登记、安装、获批目录、首次接入、SSO 或能力查询接口；已有相关代码和其他未提交改动保留。不新增告警、Kafka、投递历史/统计、自动重试或真实业务写入。
- 风险：当前后端未提供 SaaS 装配能力查询契约，前端不能猜测模块是否引入；以现有通用订阅接口及后端权限结果为准。设备范围 configuration 当前为 {}，不臆造其他事件源字段或任意 Topic/脚本，既有非空配置原样保留。不把旧 eventTypes 契约作为兼容提交路径。
- 验证：已静态核对入口到 API 的调用链、请求五字段和 scopes 内字段、局部文件引用；中英文与菜单 JSON 可解析，文案引用无缺失，本功能 Vue 文件均不超过 300 行。git diff --check 未发现差异格式错误；新功能未跟踪文件另已检查局部引用与空白格式。按用户规则未运行构建、类型检查、lint、测试或浏览器，未启停服务；无 SaaS 与有 SaaS 授权扩展的真实部署均待人工验收。

关键落点与剩余边界：

- `index.vue`、`Detail/index.vue` 只加载当前运行时的通用列表/详情，`useApplicationEntry.ts` 只生成非敏感运行上下文 key，用于切换环境时卸载旧面板，不检查 pFrom/pCode、项目 ID、控制面 Token 或业务应用 scope。标准请求保留当前 Token、租户和资产上下文，不覆盖/绕过后端可选授权。既有 `ProjectList.vue`、`Detail/ProjectDetail.vue` 及其项目接入代码均保留，但不自动成为订阅入口的前置流程。
- `applicationSubscription.ts` 使用 scopes 数组及仅含 id 的渠道 DTO；`subscriptionForm.ts` 显式构造五字段并深复制配置，不提交顶层 eventTypes、单个 scope、服务端 ID/state/审计字段。旧 eventTypes 未作为兼容读取或提交路径。
- `useSubscriptionEditorForm.ts` 与 `SubscriptionEditor.vue` 支持多个范围；当前设备源配置为 {}，已有非空配置保留并在详情只读展示。其他事件源参数没有元数据编辑契约，不新增任意 JSON/Topic/脚本输入；未来渠道没有已确认的表单时明确提示，已有配置原样保留。
- `HttpHookFields.vue` 使用 Ant Design Vue 输入接收地址、POST/PUT/PATCH 和字符串请求头。切换渠道清空旧配置；请求头重名先提示，避免转换成对象时静默覆盖。端点安全、敏感请求头、事件权限及可选 SaaS 条件由服务端真实校验，不添加请求超时、重试或生产密钥默认值。
- `useSubscriptions.ts` 展示接口错误，不自动重试；`useSubscriptionPanel.ts` 统一页面编排；`SubscriptionValidation.vue` 复用展示 field/code/message。两个目录独立请求，失败明确提示；停用父应用可保留草稿，启用订阅仍须服务端完整校验。运行四态不是第三方接收成功，不增加投递历史/统计界面。
- 新增资产范围编辑仍是此前未完成项，不因本轮订阅契约修改而宣称已完成。没有提交或推送本轮代码。

### 人工接口分组管理前端实施（2026-10-09）

依据桌面《接口分组管理前端开发交接》及当前认证模块 ApiGroupController/ApiGroupEntity/ApiGroupOperationInfo/OpenApiSpecEntity 的只读核对。本轮属于单模块多文件功能开发（M），菜单落点与以下计划已获用户确认，前端功能已按该边界实现。

- 目标与归属：只在 runtime-ui/modules/authentication-manager-ui 新增人工 API Group 查询、新增、编辑、启停、删除，维护 Operation 和真实接口关联；保留现有第三方应用授权、订阅及所有用户修改。
- 已确认菜单：在当前“开放与集成”（application-center，owner=iot）下新增“接口分组管理”，code=application-center/ApiGroup，url=/open/api-group，showPage=[api_group]；菜单/按钮沿用运行时现有权限约定，query/save/delete 对应 api_group，接口选择需 api_spec:query。只维护本地种子，不全量初始化服务端菜单。
- 页面方案：采用标准查询表格与独立新建/编辑页，避免多层抽屉；复用 ConditionFilter、j-pro-table、Ant Design Vue 和现有权限按钮。列表展示稳定分组 ID、名称、枚举状态、描述、操作数量；编辑页维护基础信息、组内稳定 Operation ID、说明及关联接口，使用分页接口选择面板保留跨页选择和原关联回显。
- 步骤：①新增局部 typed API，对接 detail/_query、group 标准 CRUD、spec 分页查询/按真实 ID 批量回显；②实现分组管理与编辑回显，显式构造实体写入字段，保留分组/操作 options，排除 apiDetail、文档和审计字段；③实现接口多选及 appId/path/summary/permissionId 条件，展示 method/path/summary/来源服务/permissionId/actions，不把接口服务 ID 当第三方应用 ID；④关联接口自动汇总只读 assetTypes，不再配置 accessSupport/assetType；允许混合资产且不自动扩大已有数据范围；⑤增加菜单、按钮权限、子路由和中英文文案，原位更新本说明。
- 不做：不改 ui/、公共组件或新增模块依赖；后端仅调整已确认的自动资产归属，不自动生成分组或创建示例，不调用 /{appId}/_save 建绑定，不默认授权应用，不修改应用专属 assetAccesses、OAuth2 和订阅逻辑，不提交推送、改 gitlink 或操作服务。
- 风险/处理：原接口目录空或读取失败只展示真实错误；没有有效 permissionId/actions 的接口不可新选，旧不可见关联保留并明确提示。修改/删除操作、改关联、禁用/删除分组前提示影响已有应用权限，不自行撤销或迁移授权；资产归属来自接口元数据，不再调用资产目录构建手动配置，不通过任选类型或隐式降级绕过权限边界。编辑失败保留草稿。
- 验证：源码调用链、字段与枚举、跨页选择状态、JSON/i18n 和 git diff --check。按用户规则不运行构建、类型检查、lint、测试、浏览器或服务操作；真实 CRUD、权限可见性、菜单发布、保存后应用授权目录与订阅联调由用户在现有环境人工验收。

实施落点与当前结果：

- `api/application-center/apiGroupManagement.ts` 封装分组标准 CRUD、分页元数据查询和指定 ID 回显；新增消费真实返回实体 ID，更新校验 Boolean 结果，不调用应用绑定接口。
- `views/application-center/ApiGroup/index.vue` 为列表；`Save/index.vue` 为独立新建/编辑/只读详情。`useApiGroupEditor.ts` 编排草稿、自动资产归属、关联回显及确认保存；`OperationsEditor.vue` 展示稳定操作 ID 和真实关联；`SpecPicker.vue` / `useSpecPicker.ts` 维护跨页选择。已有操作 ID 不可修改，分组/操作 options 原样保留，保存显式排除详情、文档及审计字段。分组 options 与订阅 configuration 的草稿复制复用 `lodash-es` 的 `cloneDeep`，分组操作比较使用 `isEqual`，不通过 JSON 往返拷贝或字符串比较；保持原操作/接口 ID 排序规则及嵌套编辑隔离。本次仅源码与差异检查，未执行前端测试、构建或浏览器验收。
- 分组启停、删除与影响已有授权的编辑均有确认；空操作不能保存，元数据不可见的原关联保留并提示。资产属性只读展示，后端按关联接口自动汇总多资产类型；已有 AssetAccesses 与多条授权记录保留，不任意选取类型或隐式降级。
- `baseMenu.json` 新增“开放与集成 → 接口分组管理”，`index.ts` 注册 Save 子路由，按钮分别映射分组 query/save/delete 及接口 api_spec:query；`locales/lang/zh.json` 与 `en.json` 各提供 106 条分组管理对应文案。未修改现有授权、OAuth2、订阅或 SaaS 可选校验逻辑。
- 已做源码请求/保存字段及本地导入路径核对、菜单与语言 JSON 解析、中英文键对齐检查；本轮 Vue 文件均小于 300 行。未执行构建、类型检查、lint、测试或浏览器操作，也未启停服务、自动发布菜单或操作业务数据。真实 CRUD、授权可见性和页面交互仍待用户在现有环境人工验收；源码检查不等于运行验收。
- 现有环境由菜单管理员单独增加/发布新入口并配置按钮权限；本地菜单种子不会自动覆盖已保存菜单，不应全量重置菜单。未提交、推送或生成 PR。

### 接口分组列表操作

运行时 `views/application-center/ApiGroup/index.vue` 复用 `TableActions` / `TableActionsItem`，三个操作均标记为常用项，行内显示图标并在悬停时展示既有国际化文案。编辑/查看使用 `EditOutlined` / `EyeOutlined`，禁用/启用使用 `StopOutlined` / `PlayCircleOutlined`，删除使用 `DeleteOutlined`。权限按钮、忙碌状态、确认弹窗和业务回调保持原样；启停、删除的文字提示放在下方，避免遮挡上方确认框。`useApiGroupList.ts` 将固定操作列宽收敛为 120；不改接口、授权、菜单、公共组件或运营端。

验证：本地 `http://localhost:9200/#/open/api-group` 已确认三个图标、中文可访问名称及文字提示；禁用和删除均可打开原确认框并通过鼠标取消，记录仍在列表且保持正常状态，没有提交业务变更。`pnpm --config.verify-deps-before-run=false -F jetlinks-web-core build -- --module-name authentication-manager-ui` 最终生产构建通过（1 分 13 秒），`git diff --check` 通过，页面 95 行。工作区与模块无 lint 脚本；`pnpm --config.verify-deps-before-run=false exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false` 因其他文件的 615 项诊断未通过，本次两个代码文件无诊断，清理工作区类型问题后需重跑同一命令。只读权限和已禁用分组的页面分支未切换真实账号或业务状态验证。

### 接口分组到应用授权链路核对（2026-10-09）

用户授权使用临时凭证进行当前运行环境只读联调，凭证不写入文件或输出。保持后端代码、配置及运行服务不动，不执行真实业务写入、浏览器、构建或测试。前端修正仅限本模块：①接口选择区区分原始目录为空与筛选无结果，禁止空选择确认；②应用列表与详情的 provider 判断保持一致，不因 integrationModes 非空拒绝详情；③应用上下文键复用当前请求 API 地址；④授权目录只新增选择启用且接口权限关联完整的操作，保留已有不可见授权及 assetAccesses，并提供分组管理入口。接口目录的数据供给缺口不能用 Swagger 假 ID、自动建组或前端自动授权掩盖。完成后原位记录只读结果及尚未验收的保存、OAuth2 换令牌与事件投递环节。

- 打开应用的 ReferenceError 已修正：useApplicationEntry.ts 的导入与调用统一为 getRequestBaseApi，复用当前实际请求地址；同时补齐上轮中断新增的 6 组中英文文案。用户已反馈接口目录恢复，先前空目录读数仅是修复前记录，不作为当前运行状态。此次只做源码/引用、语言 JSON 和差异检查，未执行浏览器、构建、类型检查或测试，保存授权与实际事件投递仍待联调。
- 分组编辑页的关联接口使用可检索的紧凑表格，表体限高 300px；选择器主表限高 320px，已选明细可展开并限高 240px，弹窗整体限高。仅约束展示与滚动，不截断或改变关联数据；页面效果由用户在现有环境人工验证。

### 接口分组配置精简与资产自动归属

- 已确认范围：用户同意前端简化及接口分组后端资产自动汇总；仅 authentication-manager 与运行时 authentication-manager-ui，不改运营端、公共组件、依赖或服务配置，不提交推送。
- 系统根据关联接口的有效 permission/actions 与 assetType 实时推导只读 assetTypes；分组不再提交人工 accessSupport/assetType，允许混合资产。资产归属不等于授予数据范围；原始授权记录与 assetAccesses 保留，不新增或扩大应用数据范围。
- 同一分组已有多个资产授权记录时，前端合并操作选中态并逐条保留数据范围；原有 API 应用自动构造业务应用范围的入口按真实 assetTypes 展开，不使用默认 device，不拆分分组、不改变分组和操作 ID。
- 列表复用 pro-table__no-padding 对齐；操作编辑以折叠区块和接口紧凑表格呈现，显示名称、方法、路径、来源服务，支持本地检索；技术 ID 和权限映射放次级信息。选择器主表及已选区域限高，已选明细可展开检索。
- 后端测试目标：空关联、单/多资产、去重、无有效权限映射、元数据变更后的实时读取；多资产范围合并、跨分组不串权、停用组不生效及原合并优先级。使用现有 Java21/Maven 配置运行直接相关测试和增量覆盖率；前端仅源码、引用、JSON/i18n 与差异检查，用户现有环境人工验收，不自动构建、浏览器或服务操作。

实施入口：`ApiGroup/index.vue`、`Save/index.vue`、`components/LinkedSpecs.vue`、`SpecDetails.vue`；原始接口 ID 和不可见关联保留，操作 ID 不变；`ApiApplication/groupGrantUtils.ts` 合并多条授权的选中操作并保留每条数据范围。Direct 授权与原 API 应用授权入口同步读取新的 assetTypes，不再写死 device。仅完成源码、引用、语言 JSON/键对齐与差异检查，未运行前端构建、类型检查、lint、测试或浏览器验收。前端需与本轮后端代码一同加载后人工验证；不提交或推送。
### 订阅配置不解析应用运行身份

- “数据订阅”的目录、列表、详情、配置保存与配置校验不解析目标应用运行身份；读取当前管理用户的真实事件目录，父应用停用时仍可配置。启用与后台运行继续按应用授权和数据权限限制，不将管理目录可见性视为应用已获授权。
- 后端入口为 authentication-manager 的 `ApplicationEventSubscriptionService`；前端沿用现有请求与错误处理，仅同步 `locales/lang/zh.json` 和 `en.json` 中运行说明及已启用编辑说明，不改全局登录拦截或 SaaS 项目判断。
- 后端 16 项相关集成回归通过，含管理流程不调用应用身份解析的明确断言；前端仅完成 JSON/文案/差异检查，未自动构建或浏览器验收。需运行后端加载变更后人工复查；未启停服务或提交推送。

前端代码已于 2026-10-10 提交并推送：`0c5c5f06581b7190cf5714a5cf969678a161fae7`，分支 `codex/third-party-api-group-20261009`，沿用草稿 PR #104（https://github.com/jetlinks-v2/authentication-manager-ui/pull/104），目标分支已按用户要求调整为 `2.20`（不是 `2.12-uat-next`）。复用已有检查，不重复执行测试/构建；本地任务说明未提交，无强推、PR 评论或自动合并。认证后端在本次交付期间另有操作同步了远端 3 个提交并暂存 25 个文件，本聊天不干预其暂存区；若需本聊天继续交付后端，先确认范围及单一提交所有者。未从任何分支排除或丢弃代码。

## 日志查询与详情

`views/system/Log/useLogQuery.ts` 为访问日志和系统日志初始化浏览器本地今日范围，按 `timestamp btw` 查询、`timestamp desc` 排序。清空筛选恢复今日；链路 ID 使用 `traceId`，默认精确匹配。系统日志显示 `timestamp`，历史数据缺失时回退 `createTime`。

访问日志以“来源 / 请求 / 动作”三列展示 HTTP 方法、路径、状态码、请求时间、耗时、用户和调用位置。多来源 IP 仅展示第一个非空地址，悬停显示完整值；HTTP `httpMethod` 与 Java `method` 明确区分。系统日志以“时间 / 日志内容 / 来源”展示毫秒时间、日志级别、消息、异常摘要、服务及代码位置；服务名仅展示，Logger、级别、消息、类/方法、线程和异常可筛选。

两类日志使用统一表格、`ConditionFilter` 和 `JlDrawerShell`。点击行打开右侧无遮罩抽屉，点击其他行更新详情，行外点击或 Escape 关闭；拖选文本与快捷操作不触发查看。详情使用统一折叠面板、字段表和 `CodeBlock`，异常栈保留原始换行并支持横向滚动。访问详情优先展示常用请求头，可展开全部；参数支持结构化与原始视图。

URL 后的复制/搜索操作随地址排列，在 hover 或键盘 focus 时显示。抽屉用户名与 Trace ID 提供同值搜索；快捷搜索追加条件，仅对完全重复的条件去重，保留日期、其他条件及嵌套条件组。用户名仍转换为 `context` 的 `json_value` 条件。默认条件首次回传与查询调度由共享 `ConditionFilter` 负责。`api/log.ts` 接收表格可选 `{ signal }` 并传给共享请求层，加载范围和请求取消由共享组件统一实现。

实现入口：`views/system/Log/Access/`、`System/`、`components/`、`logFilter.ts`、`logPresentation.ts`、`useLogInspector.ts`、`useLogDetailState.ts`；回归入口为 `tests/accessLogPresentation.test.mjs` 和 `tests/systemLogPresentation.test.mjs`。


### 第三方订阅强制签名与 Provider 目录

- 仅现有第三方订阅抽屉、列表/详情摘要及凭据生命周期提示，不修改运营端 ui、菜单或应用模型。 订阅列表在 `components/SubscriptionPanel.vue` 复用 `pro-table__no-padding` 去掉表格额外内边距，使左右边缘与上方筛选栏、操作按钮对齐。移除订阅面板顶部的运行身份说明及父应用未启用提示，保留请求错误提示和父应用未启用时的订阅启用限制；仅做源码与差异检查，页面效果待人工确认。
- 目录返回 Provider 的 id/name/events，名称由后端国际化；前端不维护类别 ID 或业务名称映射。选择 Provider 展开其当前具体事件 ID，保存仍为 eventTypes 与 configuration，保留多范围、半选、不可用项；语言切换只刷新目录，不重置草稿，新增事件不自动扩大旧订阅。
- API HTTP 强制使用当前 Client ID / Client Secret，前端不读取或提交明文 Secret；业务同步使用模板派生通知密钥。HMAC 验签不是正文加密，签名值不是 Secret；接收端预存密钥、按原始字节验签并处理时效/幂等，生产使用 HTTPS，凭据重置后同步更新接收端。
- 2.20 配套：前端 PR #104 保持目标 2.20；后端当前工作树采用 auth #359 bcc628ee、components #1607 3d59410a，并依赖 hsweb #371 的三状态及缓存实现。前后端 Provider 契约必须配套，更新后端不等于浏览器加载了新模块。
- 此前旧 Vite 源码将 Provider 当成单个事件，导致旧下拉框、空 schema 和保存失败；获准重启开发服务后只核对过返回源码，未把它当作交互验收。本轮不重复重启服务，不通过放宽后端校验接受错误事件 ID。
- 本轮前端 Provider 选择、关联展示、国际化和现有文档修改随 PR #104 交付；复用源码与差异检查，未运行构建、类型检查、lint、测试或浏览器。两类勾选、半选回显、多范围/草稿、语言切换、说明弹窗和错误反馈仍由用户在现有环境人工验收。
