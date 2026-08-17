# Authentication Manager UI

`authentication-manager-ui` provides account, organization, permission, system application, and related management pages for the operations UI.

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

### User Bind Dialog Optimization Plan

Status: implemented. Verification is limited to static frontend checks; build and `tsc` were skipped by request.

Goal: extract the bind-user dialog from `views/application-center/ProjectApplication/Detail/components/UserManagement.vue`, replace its local candidate list with the shared `ConditionFilter` + `j-pro-table` interaction, and load unbound candidates through `POST /user/detail/_query` with the current application exclusion dimension term.

Owning module and scope: `ui/modules/authentication-manager-ui`. The change is limited to the ProjectApplication detail user tab, its existing application-user service/store boundary, and this module document. Backend Java code, `runtime-ui/`, shared `jetlinks-web-core` behavior, unrelated application-detail tabs, and broad user-management refactors are out of scope.

Implementation steps:

1. Add a focused bind-user modal component that owns filtering, table selection, selected-count confirmation, and reset-on-open behavior; keep `UserManagement.vue` responsible only for its main user section and event forwarding.
2. Reuse the existing `queryUserDetails` API wrapper from `api/application-center/businessApplication.ts`. Assemble the request contract in `applicationUserService.ts`: forward `pageIndex` and `pageSize` from `j-pro-table`, prepend `terms: [{ column: 'id$in-dimension$business_application$not', value: [applicationId] }]`, and append effective `ConditionFilter` terms without changing the unbound-user scope.
3. Expose the lazy paged candidate loader through `useProjectApplication.ts`, remove the eager project-member candidate dependency from the detail state, and pass the loader/application id into the extracted modal through the existing detail component boundary.
4. Reuse current ProjectApplication i18n keys and the installed `ConditionFilter`/`j-pro-table` contracts. Do not introduce another search model, direct API path in a Vue component, or new backend capability.

Risks and confirmation points:

- `j-pro-table` contributes runtime paging/search parameters. The service boundary must not fix candidate paging; it only guarantees that the required application exclusion-dimension term is prepended to the table query.
- The bind dialog queries users not yet bound to the current business application. Already visible users in the application user table should not appear as candidates.
- Existing binding mutation behavior remains unchanged; this task changes candidate discovery and modal presentation only.

Verification result:

- `UserBindModal.vue`, `UserManagement.vue`, and detail `index.vue` pass Vue SFC parse and template compilation.
- Touched TypeScript files pass syntax transpilation without type-checking.
- Locale files `locales/lang/zh.json` and `locales/lang/en.json` parse as valid JSON.
- Static scan finds no project-member candidate source (`/console/project`, `queryConsoleProjectMembers`, `bindableUsers`, `ProjectMemberInfo`, or `normalizeProjectMember`) in the ProjectApplication user flow.
- Candidate loading uses `/user/detail/_query`, prepends `id$in-dimension$business_application$not = [applicationId]`, and forwards `pageIndex` / `pageSize` from `j-pro-table`; existing fixed `pageSize: 500` defaults remain only on unrelated role/bound-user wrappers.
- `git diff --check` passes. Touched Vue line counts are `UserBindModal.vue` 191, `UserManagement.vue` 150, and detail `index.vue` 255.
- Commit and PR: pending.

### Detail Optimization Plan

Status: implemented after confirmation. Verification for this pass is limited to JSON parsing, static API-path scans, and Vue SFC line counts; build and `tsc` were skipped by request.

Goal: align `views/application-center/ProjectApplication/Detail/` with the current application detail prototype by adding video configuration, supporting both new application users and binding existing project members, switching application roles to the same role CRUD endpoints used by `views/system/Role`, and confirming that newly created applications bind the current creator.

Owning module and scope: `ui/modules/authentication-manager-ui`. The implementation is limited to the operations UI and existing backend APIs under authentication, project-side console members, assets, and media channel query. `runtime-ui/`, new backend Java endpoints, unrelated system pages, generated artifacts, and global application menu scope behavior are out of scope unless a confirmed backend gap blocks the requested behavior.

Prototype and interface findings:

- Prototype `https://jetlinks-ai-new.ez7268-453.workers.dev/midhub/app/user-app/app-2` shows a `视频配置` tab between `物联设备配置` and `用量信息`. The tab renders a camera card grid with preview image, online/offline status, camera name, per-card `设置`, and a `绑定摄像头` action. Binding opens a right drawer with gateway grouping, name/serial search, candidate camera list, selected count, and confirm. Settings opens a small dialog showing preview image, status, name, PTZ support, and `解除绑定`.
- Role backend facts: system role management uses `POST /role/_query/`, `POST /role`, `PATCH /role`, and `DELETE /role/{id}`. `RoleEntity.applicationId` is create-only (`updatable = false`), so application role queries should add an `applicationId` exact term and application role creation should submit `applicationId`; updates must not modify it.
- User backend facts: the bind-user candidate dialog pages users through `POST /user/detail/_query` with the `id$in-dimension$business_application$not` application-scope term, so it lists users not yet bound to the current application and no longer depends on the project-member candidate endpoint. There is no dedicated incremental "bind existing user to business application" endpoint. The direct `/user/detail/{userId}/business_application/_bind` route is full-bind and can drop other application bindings if used with only the current application. The safer existing route is `/user/detail/{userId}/_update` with a hydrated user payload and `businessApplicationIdList: [applicationId]`; backend `UserDetailService` merges the user's existing application IDs before full-binding during update.
- Application create backend facts: `BusinessApplicationService.handleCreated` already binds the persisted `creatorId` to the new business application dimension, so the UI should not add a duplicate frontend-side creator binding unless authenticated smoke testing proves the event path is not reflected in the detail page.
- Video backend facts: the bind drawer queries gateways through `POST /media/device/_query`, then queries channels only after a gateway click through `POST /media/device/{gatewayId}/channel/_query`. `MediaChannelController` correlates channel permission to `DeviceAssetType.device` via `deviceId`, and no separate media-channel asset type is present. Therefore ProjectApplication must bind, query, exclude, and unbind the selected gateway `deviceId`; submitting `MediaChannelEntity.id` to `/assets/bind/device` is not a valid device-asset binding and returns 403.

Implementation steps:

1. Add typed API wrappers for application user candidates, role CRUD with `applicationId`, paged device details, media gateways and per-gateway channels, and reusable asset binding/unbinding where needed.
2. Extend ProjectApplication state with camera resources and lazy paged user candidate loading. Keep request orchestration in `useProjectApplication.ts` or small services, not inside Vue components.
3. Add a video configuration tab and component matching the prototype at a restrained Ant Design/detail-workspace density: camera card grid, bind drawer reusing the existing resource-picker style where possible, settings dialog, empty/loading states, bind and unbind feedback. Camera binding selects the left-side gateway `deviceId`; the right-side channel table is preview-only.
4. Refactor user management so `新增用户` creates a global user with one application-scoped role and immediately submits `businessApplicationIdList: [applicationId]`; `绑定用户` remains a separate dialog listing users not yet bound to the current application through `/user/detail/_query`, supports search and selection, then binds selected users through the hydrated update route. Existing role/status editing for bound users remains local to the application table.
5. Refactor role management data operations to use the system role CRUD endpoints. Query and creation carry `applicationId`; update uses `PATCH /role`; delete uses `DELETE /role/{id}`; the existing permission editor endpoints remain unchanged.
6. Verify application creation by relying on backend creator binding and refreshing the application detail after creation/load; update this document if an authenticated smoke test shows a timing or missing-membership gap.
7. Keep all user-visible copy in `locales/lang/zh.json` and `locales/lang/en.json`, and keep touched/new Vue files at or below 300 lines by splitting dialog/card services as needed.

Risks and confirmation points:

- Runtime video permission remains device-correlated because no channel-level asset type was found. Binding one gateway exposes all of its channels; strict channel-level authorization would require a backend channel asset or binding endpoint.
- Binding existing users through `/user/detail/{id}/_update` requires hydrating user roles, organizations, and positions to preserve unrelated relations. This is more cautious than calling the full-bind endpoint directly.
- Deleting a role through the system role delete endpoint is global role deletion, matching the requested interface but broader than simply removing it from this application.

Verification result:

- `locales/lang/zh.json` and `locales/lang/en.json` parse as valid JSON.
- Static scans find no legacy role wrappers (`/role/business_application`, `/role/_create`, `/role/{id}/_update`) in the application-center implementation.
- Static scans find no project-member candidate source in the ProjectApplication user flow; user candidates use `/user/detail/_query` with the `id$in-dimension$business_application$not` term.
- Static scans confirm new application users are created through `/user/detail/_create` with an application role and `businessApplicationIdList: [applicationId]`.
- Static scans confirm the device drawer uses `/device/instance/detail/_query` with the fixed provider exclusion, descending creation-time sort and required detail context, while the camera drawer cannot call the channel endpoint before a gateway is selected.
- Video binding contract scans are covered by the focused Video Gateway Binding Interaction Plan above; its final static verification result is recorded there.
- Detail-page style follow-up removes gray panel backgrounds from the summary, tab container, section cards, table cells, resource picker grouping, role sidebar, and video placeholders through page-scoped styles.
- Touched and new Vue SFCs in `Detail/` remain below 300 lines. Build and `tsc` were intentionally not run for this optimization pass.

### Goal And Scope

The operations UI provides an application ledger, creation flow, and single-application workspace for project administrators. The page keeps the approved `资产卡片台账页` and `对象详情工作区` interaction profile while using the authentication-manager business-application contract as its only data source.

Owning module: `ui/modules/authentication-manager-ui`. The application menu Scope requires a narrow shared change in `ui/jetlinks-web-core`; `runtime-ui/`, backend behavior, generated artifacts, and unrelated management pages remain out of scope.

### Delivered Contract

- Applications: standard CRUD under `/business-application`; list queries always include the current `projectId`. Creation no longer submits `projectId`; `templateId` is create-only and is omitted from updates.
- Templates: list and menu preview use `/business-application-template` and `GET /business-application-template/{id}/menus`. Disabled templates remain visible but cannot be selected for creation.
- Application template management: `application-center/Template` manages `/business-application-template` directly in the project-side UI. Its Save page loads candidate menus from `POST /menu/user-own/tree`, asset type names from `GET /asset/types`, grantable asset permissions from `POST /menu/asset-accesses/grantable`, and scope strategy options from `GET /dictionary/asset-scope-strategy/items`; it does not use SaaS runtime or region selection. Application menu grants currently filter out interface permissions such as `open-api` before template editing, role permission echo, and permission saving.
- Enums: backend `{value,text}` values are normalized centrally; comparisons and submissions use `value`, while the page displays `text`.
- Application creation: backend `BusinessApplicationService.handleCreated` binds the persisted creator to the new application dimension, so the UI does not perform a duplicate creator-binding request.
- Users: bound users are still queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. New users are created through `/user/detail/_create` with `roleIdList: [roleId]` from the application-scoped role list and `businessApplicationIdList: [applicationId]`, so the user is available in the current application immediately after creation. The bind dialog lazily pages unbound candidates through `/user/detail/_query`, prepending `id$in-dimension$business_application$not = [applicationId]` and forwarding `j-pro-table` paging plus `ConditionFilter` terms. Confirming selection still binds selected users by calling `/user/detail/{id}/_update` with `businessApplicationIdList: [applicationId]`; backend merge behavior preserves the user's other application bindings.
- Roles: application roles now use the same system role APIs as `views/system/Role`: `POST /role/_query/` with an `applicationId` exact term, `POST /role` with `applicationId` on creation, `PATCH /role` on update, and `DELETE /role/{id}` on deletion. Updates do not resend `applicationId` because it is create-only.
- Role permissions: the role editor uses `GET /business-application-template/{templateId}/menus` as the menu candidate source, filters that tree by the current project menu runtime cache using menu `code`, and rebuilds the remaining nodes by `parentId`. The editable menu set still comes from the template/project-menu intersection, but asset permission scope fields (`assetType`, `assetTypes`, `assetAccesses`, `dataAccesses`, `selectAccesses`, and `selectAccessesByAssetType`) are copied from the current project menu node, not the template node. Saved role grants from `/menu/role/{roleId}/_grant/detail` are also pruned to that current-project asset scope before checked-state echo and save through `/menu/role/{roleId}/_grant`. The `manage-role` menu button grants `business-application-template:query,grant` for that template-menu read path.
- Devices: bound assets use the `dim-assets` term with target type `business_application`. The bind drawer has no device group/product/gateway classification sidebar and pages candidates through `/device/instance/detail/_query`. Every candidate request prepends `productId$product-info = "accessProvider nin (agent-device-gateway,agent-media-device-gateway,official-edge-gateway,fixed-media,gb28181-2016,media-plugin,onvif)"`, sorts by `createTime desc`, and sends the required tags/relations/parent detail context. Opening the drawer does not call `/assets/bindings/device`; confirming calls `/assets/bind/device` once with a single binding object, selected device IDs in `assetIdList`, and `read`, `save`, `delete`, and `share` permissions. Unbinding continues through `/assets/unbind/device`.
- Video: opening the camera drawer queries gateways through `/media/device/_query` only. Checkboxes in the left list select multiple gateway `deviceId` values for binding, while the most recently clicked or checked gateway independently drives the right-side preview. No channel query is issued until a preview gateway is active; the right-side table then pages `/media/device/{gatewayId}/channel/_query` without row checkboxes. Bound-camera lookup filters `/media/channel/_query/no-paging` by `dim-assets` on `deviceId`; already-bound gateway IDs are excluded from the left list. Confirm submits all checked gateway IDs through `/assets/bind/device`, and unbind submits the containing gateway `deviceId` through `/assets/unbind/device`.
- Deletion: users and roles use the global generic delete endpoints. Confirmation text explicitly warns that the operation is not limited to the current application.
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
- `views/application-center/ProjectApplication/applicationUserService.ts`: application member lookup, bindable project-member lookup, and batched full-detail hydration for relation-safe updates.
- `views/application-center/ProjectApplication/applicationRoleService.ts`: system role CRUD orchestration for application-scoped roles.
- `views/application-center/ProjectApplication/applicationCameraService.ts`: bound-channel loading, media gateway discovery, per-gateway channel pagination, and device-asset permission filtering for video configuration.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: remote state and mutation orchestration.
- Ledger/create/detail components: loading, empty, validation, confirmation, submit, and post-mutation refresh behavior.
- The ledger follows the project-application card design: a title/description header, primary create action, responsive three-column card wall, and an inline create card. Application cards reuse `jetlinks-web-core/src/components/CardBox/CardSummary.vue`; unsupported gateway/camera metrics and the unrelated filter row are not rendered.
- `views/application-center/Template/`: template ledger, create dialog, tag sidebar, and Save workspace. The Save workspace keeps the top summary as a detail display, then separates document and configuration tabs. Configuration reuses `MenuAssetPermissionEditor` with asset permission batch selection and writes scope strategy to `assetAccesses[].options.scopeStrategy`.
- `baseMenu.json`: visible name “应用管理” and backend resource actions required by the page.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Unsupported prototype surfaces were removed: fake quotas and metrics, channel-level camera asset binding, and the direct-device switch. No `/project-application*`, `project_application`, or `X-Project-Application-Id` compatibility contract is used; the internal route and source folder name remain unchanged to avoid breaking existing bookmarks and menu codes.

Every created or substantially edited Vue file remains at or below 300 lines.

### Verification

- Device/camera binding verification confirms that opening either picker never references `/assets/bindings/device`; confirming a selection submits one `/assets/bind/device` object with `assetIdList` and the `read`, `save`, `delete`, and `share` permissions.
- This drawer-query change is verified with JSON parsing, focused Vue SFC parsing, TypeScript syntax transpilation, static request-contract scans, Vue line counts, and `git diff --check`. Build and `tsc` are intentionally not run for this pass.
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
