# Authentication Manager UI

`authentication-manager-ui` provides account, organization, permission, system application, and related management pages for the operations UI.

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

## System Management List Layout

The `views/system/` list pages that combine `ConditionFilter` with `j-pro-table` use the shared `PageHeader` list shell: the page title stays on the left, filtering and the primary create action stay on the right, existing batch actions remain in the table toolbar, and dropdown-based batch actions stay grouped.

The Role page uses the shared `EqualHeightColumns` shell for its role-group selector and role list, with the system-wide `18.75rem` / `1fr` tracks and no outer padding or divider.

Scope is limited to the matching `index.vue` files outside `Apply`, `Basis`, and `NoticeRule`. The change does not alter request parameters, permissions, route registration, API contracts, or batch-action behavior. Implementation verification covers filter-to-table query flow, primary and batch action placement, module build diagnostics, and touched Vue file line counts.

Verification:

- All 12 matching Vue files contain one `PageHeader`, one `ConditionFilter`, and one `j-pro-table`; their SFC templates and `script setup` blocks compile independently.
- The production build passes from `jetlinks-web-core` with the programmatic Vite entry documented below.
- The module-wide Vue type-check still exits non-zero because of pre-existing shared-core and legacy-module diagnostics; it reports no new `PageHeader`, list-title i18n, or shared list-layout contract error.

## System Basis Navigation Layout

The system basis form stores the selected menu layout in `front.layout`. The selector supports `side`, `mix`, and `top` with CSS-only layout previews. During application startup or page refresh, `jetlinks-web-core/src/store/system.ts` validates the configured value and applies it to the shared shell layout; missing or invalid legacy values fall back to `side`.

The owning UI files are `views/system/Basis/Form.vue`, `views/system/Basis/components/LayoutModeSelector.vue`, and `views/system/Basis/typing.ts`. The shared refresh-time state boundary remains `jetlinks-web-core/src/store/system.ts`.

Verification: the `authentication-manager-ui` production build through the `jetlinks-web-core` Vite entry passes. Workspace-wide Vue type-checking is currently blocked by the existing `modules/device-manager-ui/views/link/Certificate/type.d.ts` syntax error and other legacy core diagnostics; the two new Basis components and their form-data type add no targeted diagnostics.

## Application Center

### Detail Optimization Plan

Status: implemented after confirmation. Verification for this pass is limited to JSON parsing, static API-path scans, and Vue SFC line counts; build and `tsc` were skipped by request.

Goal: align `views/application-center/ProjectApplication/Detail/` with the current application detail prototype by adding video configuration, supporting both new application users and binding existing project members, switching application roles to the same role CRUD endpoints used by `views/system/Role`, and confirming that newly created applications bind the current creator.

Owning module and scope: `ui/modules/authentication-manager-ui`. The implementation is limited to the operations UI and existing backend APIs under authentication, project-side console members, assets, and media channel query. `runtime-ui/`, new backend Java endpoints, unrelated system pages, generated artifacts, and global application menu scope behavior are out of scope unless a confirmed backend gap blocks the requested behavior.

Prototype and interface findings:

- Prototype `https://jetlinks-ai-new.ez7268-453.workers.dev/midhub/app/user-app/app-2` shows a `视频配置` tab between `物联设备配置` and `用量信息`. The tab renders a camera card grid with preview image, online/offline status, camera name, per-card `设置`, and a `绑定摄像头` action. Binding opens a right drawer with gateway grouping, name/serial search, candidate camera list, selected count, and confirm. Settings opens a small dialog showing preview image, status, name, PTZ support, and `解除绑定`.
- Role backend facts: system role management uses `POST /role/_query/`, `POST /role`, `PATCH /role`, and `DELETE /role/{id}`. `RoleEntity.applicationId` is create-only (`updatable = false`), so application role queries should add an `applicationId` exact term and application role creation should submit `applicationId`; updates must not modify it.
- User backend facts: project-side pages must not call the operations endpoint `POST /saas/project/{projectId}/members/_query/`. Member candidates should use `POST /console/project/{projectId}/members/_query`, which is exposed by `ConsoleProjectController` for terminal tenant/project users and returns `userId`, `username`, `name`, `status`, and `type`. The frontend wrapper should follow existing console project API practice and pass `projectContext: false` when the request must avoid the current project runtime base URL. There is no dedicated incremental "bind existing user to business application" endpoint. The direct `/user/detail/{userId}/business_application/_bind` route is full-bind and can drop other application bindings if used with only the current application. The safer existing route is `/user/detail/{userId}/_update` with a hydrated user payload and `businessApplicationIdList: [applicationId]`; backend `UserDetailService` merges the user's existing application IDs before full-binding during update.
- Application create backend facts: `BusinessApplicationService.handleCreated` already binds the persisted `creatorId` to the new business application dimension, so the UI should not add a duplicate frontend-side creator binding unless authenticated smoke testing proves the event path is not reflected in the detail page.
- Video backend facts: media channels are queried through `/media/channel/_query/no-paging`; `MediaChannelController` correlates channel permission to `DeviceAssetType.device` via `deviceId`. No separate media-channel asset type is present, so video binding will use the existing `/assets/bind/device` and `/assets/unbind/device` target `business_application` path against the camera channel's related `deviceId`, while rendering media-channel rows in the video tab.

Implementation steps:

1. Add typed API wrappers for project member candidates, role CRUD with `applicationId`, media channel query, and reusable asset binding/unbinding where needed.
2. Extend ProjectApplication state with camera resources and bindable project users. Keep request orchestration in `useProjectApplication.ts` or small services, not inside Vue components.
3. Add a video configuration tab and component matching the prototype at a restrained Ant Design/detail-workspace density: camera card grid, bind drawer reusing the existing resource-picker style where possible, settings dialog, empty/loading states, bind and unbind feedback.
4. Refactor user management so `新增用户` creates a global user with one application-scoped role and immediately submits `businessApplicationIdList: [applicationId]`; `绑定用户` remains a separate dialog listing current project's members excluding already bound application users, supports search and selection, then binds selected users through the hydrated update route. Existing role/status editing for bound users remains local to the application table.
5. Refactor role management data operations to use the system role CRUD endpoints. Query and creation carry `applicationId`; update uses `PATCH /role`; delete uses `DELETE /role/{id}`; the existing permission editor endpoints remain unchanged.
6. Verify application creation by relying on backend creator binding and refreshing the application detail after creation/load; update this document if an authenticated smoke test shows a timing or missing-membership gap.
7. Keep all user-visible copy in `locales/lang/zh.json` and `locales/lang/en.json`, and keep touched/new Vue files at or below 300 lines by splitting dialog/card services as needed.

Risks and confirmation points:

- Video binding is device-asset based because no channel-level asset type was found. If product requires exact per-channel membership for multi-channel devices, a backend channel asset or binding endpoint is needed before the frontend can represent that without over-binding.
- Binding existing users through `/user/detail/{id}/_update` requires hydrating user roles, organizations, and positions to preserve unrelated relations. This is more cautious than calling the full-bind endpoint directly.
- Deleting a role through the system role delete endpoint is global role deletion, matching the requested interface but broader than simply removing it from this application.

Verification result:

- `locales/lang/zh.json` and `locales/lang/en.json` parse as valid JSON.
- Static scans find no legacy role wrappers (`/role/business_application`, `/role/_create`, `/role/{id}/_update`) in the application-center implementation.
- Static scans find no `/saas/project/**/members/_query` usage in the application-center implementation; project member candidates use `/console/project/{projectId}/members/_query`.
- Static scans confirm new application users are created through `/user/detail/_create` with an application role and `businessApplicationIdList: [applicationId]`.
- Detail-page style follow-up removes gray panel backgrounds from the summary, tab container, section cards, table cells, resource picker grouping, role sidebar, and video placeholders through page-scoped styles.
- Touched and new Vue SFCs in `Detail/` remain below 300 lines. Build and `tsc` were intentionally not run for this optimization pass.

### Goal And Scope

The operations UI provides an application ledger, creation flow, and single-application workspace for project administrators. The page keeps the approved `资产卡片台账页` and `对象详情工作区` interaction profile while using the authentication-manager business-application contract as its only data source.

Owning module: `ui/modules/authentication-manager-ui`. The application menu Scope requires a narrow shared change in `ui/jetlinks-web-core`; `runtime-ui/`, backend behavior, generated artifacts, and unrelated management pages remain out of scope.

### Delivered Contract

- Applications: standard CRUD under `/business-application`; list queries always include the current `projectId`. Creation no longer submits `projectId`; `templateId` is create-only and is omitted from updates.
- Templates: list and menu preview use `/business-application-template` and `GET /business-application-template/{id}/menus`. Disabled templates remain visible but cannot be selected for creation.
- Application template management: `application-center/Template` manages `/business-application-template` directly in the project-side UI. Its Save page loads candidate menus from `POST /menu/user-own/tree`, asset type names from `GET /asset/types`, grantable asset permissions from `POST /menu/asset-accesses/grantable`, and scope strategy options from `GET /dictionary/asset-scope-strategy/items`; it does not use SaaS runtime or region selection.
- Enums: backend `{value,text}` values are normalized centrally; comparisons and submissions use `value`, while the page displays `text`.
- Application creation: backend `BusinessApplicationService.handleCreated` binds the persisted creator to the new application dimension, so the UI does not perform a duplicate creator-binding request.
- Users: bound users are still queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. New users are created through `/user/detail/_create` with `roleIdList: [roleId]` from the application-scoped role list and `businessApplicationIdList: [applicationId]`, so the user is available in the current application immediately after creation. The bind dialog queries current project members from `/console/project/{projectId}/members/_query` with `projectContext: false`, excludes already bound users, and binds selected users by calling `/user/detail/{id}/_update` with `businessApplicationIdList: [applicationId]`; backend merge behavior preserves the user's other application bindings.
- Roles: application roles now use the same system role APIs as `views/system/Role`: `POST /role/_query/` with an `applicationId` exact term, `POST /role` with `applicationId` on creation, `PATCH /role` on update, and `DELETE /role/{id}` on deletion. Updates do not resend `applicationId` because it is create-only.
- Role permissions: the role editor uses `GET /business-application-template/{templateId}/menus` as the menu candidate source, filters that tree by the current menu runtime cache using menu `code`, rebuilds the remaining nodes by `parentId`, merges `/menu/role/{roleId}/_grant/detail` into the filtered template tree for checked-state echo, and still saves through `/menu/role/{roleId}/_grant`. The `manage-role` menu button grants `business-application-template:query,grant` for that template-menu read path.
- Devices: bound assets use the `dim-assets` term with target type `business_application`. Bindable candidates must expose `share`; binding and unbinding use `/assets/bind/device` and `/assets/unbind/device`.
- Video: media channels are queried from `/media/channel/_query/no-paging`; bound-camera lookup filters by `dim-assets` on `deviceId`. Because channels correlate to `DeviceAssetType.device`, camera binding and unbinding use `/assets/bind/device` and `/assets/unbind/device` against the related `deviceId`.
- Deletion: users and roles use the global generic delete endpoints. Confirmation text explicitly warns that the operation is not limited to the current application.
- Menu data access: `application-center/ProjectApplication` exposes `business_application`, `user`, `role`, and `device` as assignable asset types. Application templates and `assets-bind` remain functional permissions rather than asset types.

### Application Menu Scope

Opening and switching applications use `application.id` as both the pathname code and the `project_<application.id>` storage key. The shared access utility copies the active project's `token`, `apiUrl`, `domain`, `runtime`, and project `id` through `setProjectStorage`; it changes only the storage `name` to the application name and does not request a new token. `applicationScope=<application.id>` remains a separate per-tab menu scope. For the current hash router it is written after the route hash (for example `/<application.id>/#/?applicationScope=<application.id>`); non-hash and legacy links remain readable.

Same-Origin targets are written before navigation. A custom domain on another Origin receives a one-time `applicationAccess` startup query; `jetlinks-web-core/src/main.ts` consumes it before router/session initialization, writes the target Origin's project storage, restores the copied token for the initial router check, and immediately removes the sensitive startup query. The target URL still uses `/<application.id>/`, so the custom domain is recognized as a project-side application rather than an external tenant page.

Only `POST /menu/user-own/tree` receives `X-Application-Scope`; the header is not installed on the global request client and is not propagated to device or other downstream APIs. An explicit empty `applicationScope` query clears the stored value.

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
- `views/application-center/ProjectApplication/applicationDeviceService.ts`: bound and shareable device loading.
- `views/application-center/ProjectApplication/applicationUserService.ts`: application member lookup, bindable project-member lookup, and batched full-detail hydration for relation-safe updates.
- `views/application-center/ProjectApplication/applicationRoleService.ts`: system role CRUD orchestration for application-scoped roles.
- `views/application-center/ProjectApplication/applicationCameraService.ts`: media-channel loading plus device-asset permission filtering for video configuration.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: remote state and mutation orchestration.
- Ledger/create/detail components: loading, empty, validation, confirmation, submit, and post-mutation refresh behavior.
- The ledger follows the project-application card design: a title/description header, primary create action, responsive three-column card wall, and an inline create card. Application cards reuse `jetlinks-web-core/src/components/CardBox/CardSummary.vue`; unsupported gateway/camera metrics and the unrelated filter row are not rendered.
- `views/application-center/Template/`: template ledger, create dialog, tag sidebar, and Save workspace. The Save workspace keeps the top summary as a detail display, then separates document and configuration tabs. Configuration reuses `MenuAssetPermissionEditor` with asset permission batch selection and writes scope strategy to `assetAccesses[].options.scopeStrategy`.
- `baseMenu.json`: visible name “应用管理” and backend resource actions required by the page.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Unsupported prototype surfaces were removed: fake quotas and metrics, channel-level camera asset binding, and the direct-device switch. No `/project-application*`, `project_application`, or `X-Project-Application-Id` compatibility contract is used; the internal route and source folder name remain unchanged to avoid breaking existing bookmarks and menu codes.

Every created or substantially edited Vue file remains at or below 300 lines.

### Verification

- Targeted Vue diagnostics report no new errors in the application-center API/page and application-Scope files. The full module check still exits non-zero because of pre-existing shared-core and legacy-module diagnostics.
- Application-Scope checks cover a plain tab, query bootstrap, reload restore, explicit clear, absolute domain, host with port, and relative URL behavior.
- `baseMenu.json`, `locales/lang/zh.json`, and `locales/lang/en.json` parse as valid JSON.
- The application-ledger Vue files pass focused SFC script/template/style compilation and remain below 300 lines. Per task scope, build and `tsc` were not run for the visual refresh.
- The application-template management files pass focused JSON parsing, route/menu boundary review, i18n key coverage, SFC tag scanning, TypeScript syntax transpilation, and line-count checks. Per task scope, build and `tsc` were not run; authenticated backend calls for `/business-application-template/{id}/menus`, `/menu/user-own/tree`, `/menu/asset-accesses/grantable`, `/asset/types`, and `/dictionary/asset-scope-strategy/items` still need environment smoke testing.
- The application-management menu asset types match the application, user, role, and device interfaces consumed by the page. This menu-only update was checked by JSON parsing and boundary review; build and `tsc` were intentionally not run.
- The role-permission template-source update was checked by API-path scans, whitespace diff check, and SFC line counts only; build and `tsc` were intentionally not run by request.
- The target implementation contains no legacy application API path, dimension type, header, or direct-device setting.
- Production build and authenticated backend E2E results are recorded in the backend integration plan referenced below.

The production build command for this module is:

```bash
node --max_old_space_size=8192 --max-semi-space-size=64 -e "process.argv.push('--module-name','authentication-manager-ui'); import('vite').then(({ build }) => build())"
```
