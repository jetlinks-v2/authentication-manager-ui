# Authentication Manager UI

`authentication-manager-ui` provides account, organization, permission, system application, and related management pages for the operations UI.

## 角色、组织与数据字典左侧树布局统一计划

状态：已实施并验证。

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

The system user edit dialog keeps profile fields editable for project owners while disabling the role selector when the stable runtime user type is `projectOwner`. The guard accepts the user-list `typeId` and the detail response enum object so list and detail response shapes behave consistently. It reuses the existing `FormItemRole` disabled contract, which also hides the add-role action and prevents tag removal. Scope is limited to `views/system/User/components/EditUserDialog.vue`; user APIs, backend authorization, other user types, organizations, positions, and password operations remain unchanged. The module production build (`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`) and `git diff --check` pass. The touched Vue file remains over the preferred 300-line limit because this is a narrow fix in an existing 491-line component; no structural refactor is included.

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

The Department page uses the shared `EqualHeightColumns` shell for its organization tree and content area, and lazy-loads its Position, User, and Property tab content. Other UI modules can control the built-in Position and Property tabs through `getRegisterComponents`: register a `hide` action against `system/Department:department-tabs` with target `position` or `property`; omit that action to keep the tab visible.

```ts
const getRegisterComponents = () => [
  {
    targetPage: 'system/Department',
    targetModule: 'department-tabs',
    target: 'position', // Use "property" for the Property tab.
    mode: 'hide',
    code: 'hide-department-position',
  },
]
```

`getRegisterComponents` is evaluated during application startup. To show the tab, conditionally omit its `hide` action; runtime changes after startup require reloading the application registry.

Scope is limited to `views/system/Department/index.vue` and the existing shared layout and component registry contracts. It does not change Department APIs, permissions, routes, or the community-edition User-only fallback. Verification covers the two-column slot mapping, lazy component loading, registry-driven tab filtering, active-tab fallback, and the touched Vue file line count.

Verification: the edited Department SFC passes a local script/template syntax compilation and remains below 300 lines. Build and TypeScript checks were not run for the layout follow-up by request.

## Department User Position Empty-State Filter

The Organization Management User tab maps the Position condition to the backend `UserDimensionTerm` contract in `views/system/Department/user/index.vue`:

- `为空` (`isnull`) uses `id$in-dimension$position$not$any`, generating `NOT EXISTS` for a Position-dimension binding.
- `不为空` (`notnull`) uses `id$in-dimension$position$any`, generating `EXISTS` for a Position-dimension binding.
- Exact and multi-value matching retain `id$in-dimension$position`; `not` and `nin` retain the `$not` relation variant for selected-position exclusion.

`ConditionFilter` supplies the required non-empty placeholder for null-state terms; the `$any` query extension deliberately ignores that value. Scope is limited to the runtime UI adapter and does not change the user API, data model, permissions, routes, or other Department tabs.

## Department Position Role Filter

The Department Position tab keeps selected-role filtering on the existing `id$position-role$position` contract. For `为空` and `不为空`, the runtime UI removes only the role-null condition from the request, loads all position details for the selected organization, filters their returned `roles` arrays, and restores normal pagination. The user API, role model, position API, and other position pages remain unchanged.

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

风险与验证：现有文档中的 “System Management List Layout” 描述已由本次实际页面实现校正：四页均按标题左置、工具右置的表格插槽布局呈现。筛选参数、菜单树展开、各权限按钮及用户导入导出行为保持原实现；`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui` 和目标文件 `git diff --check` 均通过。构建仍报告工作区既有的 Rollup `input` 配置、CSS `//` 注释及大包提示。

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
- Application template management: `application-center/Template` manages `/business-application-template` directly in the project-side UI. Its Save page loads candidate menus from `POST /menu/user-own/tree`, asset type names from `GET /asset/types`, grantable asset permissions from `POST /menu/asset-accesses/grantable`, and scope strategy options from `GET /dictionary/asset-scope-strategy/items`; it does not use SaaS runtime or region selection. Application menu grants currently filter out interface permissions such as `open-api` before template editing, role permission echo, and permission saving.
- Enums: backend `{value,text}` values are normalized centrally; comparisons and submissions use `value`, while the page displays `text`.
- Application creation: the application ledger opens a centered create dialog with icon upload, 30-character name validation, 100-character description validation, and a two-column template selector. Disabled templates remain visible but locked. Backend `BusinessApplicationService.handleCreated` binds the persisted creator to the new application dimension, so the UI does not perform a duplicate creator-binding request.
- Users: bound users are queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. Entering a ProjectApplication detail page ensures the current signed-in user is bound to that business application; opening an application also requires the user to hold one of the application's roles, auto-binding the single available role or asking the user to choose when multiple roles exist. `绑定用户` queries current project users through `/user/detail/_query`, filters already-bound IDs with `id nin`, and binds selected IDs through `/business-application/{applicationId}/users/_bind`; row-level `解绑` posts the selected user ID to `/business-application/{applicationId}/users/_unbind`; existing-user role updates omit `businessApplicationIdList`, so they preserve all memberships.
- Roles: application roles now use the same system role APIs as `views/system/Role`: `POST /role/_query/` with an `applicationId` exact term, `POST /role` with `applicationId` on creation, `PATCH /role` on update, and `DELETE /role/{id}` on deletion. Updates do not resend `applicationId` because it is create-only.
- Role permissions: every role-editor load directly re-queries `POST /menu/user-own/tree` with `{ paging: false }` instead of reading `menuResultCache`. The editor temporarily does not restrict this current-user menu tree by menu `owner`; it intersects queried nodes with `GET /business-application-template/{templateId}/menus` by exact menu `id` and rebuilds the remaining template nodes by `parentId`, while menu `code` is not an intersection key. The owner gate should be restored after user-menu ownership and template data are aligned. Asset permission scope fields (`assetType`, `assetTypes`, `assetAccesses`, `dataAccesses`, `selectAccesses`, and `selectAccessesByAssetType`) are copied from the matching current-project menu node, not the template node. Saved role grants from `/menu/role/{roleId}/_grant/detail` are also pruned to that current-project asset scope before checked-state echo and save through `/menu/role/{roleId}/_grant`. The `manage-role` menu button grants `business-application-template:query,grant` for that template-menu read path.
- Devices: bound assets use the `dim-assets` term with target type `business_application`. The bind drawer has no device group/product/gateway classification sidebar and pages candidates through `/device/instance/detail/_query`. Every candidate request prepends `productId$product-info = "accessProvider nin (agent-device-gateway,agent-media-device-gateway,official-edge-gateway,fixed-media,gb28181-2016,media-plugin,onvif)"`, sorts by `createTime desc`, and sends the required tags/relations/parent detail context. Opening the drawer does not call `/assets/bindings/device`; confirming calls `/assets/bind/device` once with a single binding object, selected device IDs in `assetIdList`, and `read`, `save`, `delete`, and `share` permissions. Unbinding continues through `/assets/unbind/device`.
- Video: opening the camera drawer queries gateways through `/media/device/_query` only. Checkboxes in the left list select multiple gateway `deviceId` values for binding, while the most recently clicked or checked gateway independently drives the right-side preview. No channel query is issued until a preview gateway is active; the right-side table then pages `/media/device/{gatewayId}/channel/_query` without row checkboxes. Bound-camera lookup filters `/media/channel/_query/no-paging` by `dim-assets` on `deviceId`; already-bound gateway IDs are excluded from the left list. Confirm submits all checked gateway IDs through `/assets/bind/device`, and unbind submits the containing gateway `deviceId` through `/assets/unbind/device`.
- Membership mutation boundary: application member addition uses the incremental `/business-application/{applicationId}/users/_bind` endpoint, and row-level member removal uses `/business-application/{applicationId}/users/_unbind`. Role deletion still uses the global generic role endpoint and remains explicitly confirmed.
- Application detail tabs: the single-application workspace exposes only `应用设置`, `应用成员`, and `应用角色`. Device and video asset binding remain available in their service boundaries but are no longer eagerly queried or rendered as detail tabs.
- Application settings: `应用基本信息` is read-only by default and switches the whole section into edit mode. Its edit, cancel, and save controls are shown in the detail header action group immediately before `删除` while the settings tab is active; the settings card no longer renders its own top-right actions. Icon, name, description, default language, and timezone are saved in one update; the application link remains read-only and copyable. The timezone is stored as `configuration.timezone`, defaulting to `Asia/Shanghai` for existing records.
- Menu data access: `application-center/ProjectApplication` exposes `business_application`, `user`, `role`, and `device` as assignable asset types. Application templates and `assets-bind` remain functional permissions rather than asset types.

### Application Menu Scope

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
- `views/application-center/ProjectApplication/applicationCameraService.ts`: bound-channel loading, media gateway discovery, per-gateway channel pagination, and device-asset permission filtering for video configuration.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: remote state and mutation orchestration.
- Ledger/create/detail components: loading, empty, validation, confirmation, submit, and post-mutation refresh behavior.
- The ledger follows the project-application card design: the shared `PageHeader` carries a `ConditionFilter` whose name and status fields submit the component's standard `terms` model alongside the primary create action, followed by a responsive three-column card wall and an inline create card. Each card shows icon, name, status, template, description, creation time, edit/status actions, and the primary open action. Application cards reuse `jetlinks-web-core/src/components/CardBox/index.vue` (see 应用列表卡片改为 CardBox 壳层 for the bottom toolbar); unsupported gateway/camera metrics and the template filter are not rendered.
- `views/application-center/Template/`: template ledger, create dialog, tag sidebar, and Save workspace. The Save workspace keeps the top summary as a detail display, then separates document and configuration tabs. Configuration reuses `MenuAssetPermissionEditor` with asset permission batch selection and writes scope strategy to `assetAccesses[].options.scopeStrategy`.
- `baseMenu.json`: visible name “应用管理” and backend resource actions required by the page.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Unsupported prototype surfaces were removed: fake quotas and metrics, channel-level camera asset binding, direct-device switching, and the device/video tabs from the application detail workspace. No `/project-application*`, `project_application`, or `X-Project-Application-Id` compatibility contract is used; the internal route and source folder name remain unchanged to avoid breaking existing bookmarks and menu codes.

Every created or substantially edited Vue file remains at or below 300 lines.

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
