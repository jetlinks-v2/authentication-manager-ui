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

Goal: align the ProjectApplication member and role tabs with the approved prototypes. The member tab uses a compact title/action row, one local keyword search, and a full-width member table without title commentary. The role tab uses a narrow role list beside the existing menu/data-permission editor.

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
- Users: bound users are queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. `绑定用户` queries current project users through `/user/detail/_query`, filters already-bound IDs with `id nin`, and binds selected IDs through `/business-application/{applicationId}/users/_bind`; row-level `解绑` posts the selected user ID to `/business-application/{applicationId}/users/_unbind`; existing-user role updates omit `businessApplicationIdList`, so they preserve all memberships.
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
- The ledger follows the project-application card design: the shared `PageHeader` carries a `ConditionFilter` whose name and status fields submit the component's standard `terms` model alongside the primary create action, followed by a responsive three-column card wall and an inline create card. Each card shows icon, name, status, template, description, creation time, edit/status actions, and the primary open action. Application cards reuse `jetlinks-web-core/src/components/CardBox/CardSummary.vue`; unsupported gateway/camera metrics and the template filter are not rendered.
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
