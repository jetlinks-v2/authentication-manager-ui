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

### Goal And Scope

The operations UI provides an application ledger, creation flow, and single-application workspace for project administrators. The page keeps the approved `资产卡片台账页` and `对象详情工作区` interaction profile while using the authentication-manager business-application contract as its only data source.

Owning module: `ui/modules/authentication-manager-ui`. The application menu Scope requires a narrow shared change in `ui/jetlinks-web-core`; `runtime-ui/`, backend behavior, generated artifacts, and unrelated management pages remain out of scope.

### Delivered Contract

- Applications: standard CRUD under `/business-application`; list queries always include the current `projectId`. `projectId` and `templateId` are create-only fields and are omitted from updates.
- Templates: list and menu preview use `/business-application-template` and `GET /business-application-template/{id}/menus`. Disabled templates remain visible but cannot be selected for creation.
- Application template management: `application-center/ApplicationTemplate` manages `/business-application-template` directly in the project-side UI. Its Save page loads candidate menus from `POST /menu/user-own/tree`, asset type names from `GET /asset/types`, grantable asset permissions from `POST /menu/asset-accesses/grantable`, and scope strategy options from `GET /dictionary/asset-scope-strategy/items`; it does not use SaaS runtime or region selection.
- Enums: backend `{value,text}` values are normalized centrally; comparisons and submissions use `value`, while the page displays `text`.
- Users: creation and updates use `/user/detail/_create` and `/user/detail/{id}/_update`; members are queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. Creation includes the current `businessApplicationIdList`; updates omit that field and preserve the user's unrelated roles, organizations, positions, and other application memberships.
- Roles: creation and updates use `/role/_create` and `/role/{roleId}/_update`; application roles are queried through `/role/business_application/{applicationId}/_query`. Creation includes the current `businessApplicationIdList`; updates omit it for the same preservation rule.
- Role permissions: the existing role menu editor and `/menu/role/{roleId}/_grant/detail` plus `/menu/role/{roleId}/_grant` contracts are reused.
- Devices: bound assets use the `dim-assets` term with target type `business_application`. Bindable candidates must expose `share`; binding and unbinding use `/assets/bind/device` and `/assets/unbind/device`.
- Deletion: users and roles use the global generic delete endpoints. Confirmation text explicitly warns that the operation is not limited to the current application.
- Menu data access: `application-center/ProjectApplication` exposes `business_application`, `user`, `role`, and `device` as assignable asset types. Application templates and `assets-bind` remain functional permissions rather than asset types.

### Application Menu Scope

Opening a configured application appends `applicationScope=<applicationId>` to its URL. The opened tab stores this value in `sessionStorage` so reloads preserve the context. Only `POST /menu/user-own/tree` receives `X-Application-Scope`; the header is not installed on the global request client and is not propagated to device or other downstream APIs. An explicit empty `applicationScope` query clears the stored value.

The related shared code is limited to:

- `jetlinks-web-core/src/utils/application-scope.ts`: URL creation and per-tab Scope resolution.
- `jetlinks-web-core/src/api/system/menu.ts`: optional menu-request header.
- `jetlinks-web-core/src/store/menu.ts`: resolve the current tab Scope when menus are queried.

### UI And Code Boundaries

- `api/application-center/businessApplication.ts`: typed application, template, generic user/role, and asset request boundary.
- `api/application-center/applicationTemplate.ts`: project-side application template CRUD, menu grant, scope strategy, menu candidate, asset type, grantable asset permission, and tag request boundary.
- `views/application-center/ProjectApplication/applicationModel.ts`: response envelope, enum, list, menu, and view-model normalization.
- `views/application-center/ProjectApplication/applicationDeviceService.ts`: bound and shareable device loading.
- `views/application-center/ProjectApplication/applicationUserService.ts`: application member lookup plus batched full-detail hydration for relation-safe updates.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: remote state and mutation orchestration.
- Ledger/create/detail components: loading, empty, validation, confirmation, submit, and post-mutation refresh behavior.
- The ledger follows the project-application card design: a title/description header, primary create action, responsive three-column card wall, and an inline create card. Application cards reuse `jetlinks-web-core/src/components/CardBox/CardSummary.vue`; unsupported gateway/camera metrics and the unrelated filter row are not rendered.
- `views/application-center/ApplicationTemplate/`: template ledger, create dialog, tag sidebar, and Save workspace. The Save workspace keeps the top summary as a detail display, then separates document and configuration tabs. Configuration reuses `MenuAssetPermissionEditor` with asset permission batch selection and writes scope strategy to `assetAccesses[].options.scopeStrategy`.
- `baseMenu.json`: visible name “应用管理” and backend resource actions required by the page.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Unsupported prototype surfaces were removed: fake quotas and metrics, independent camera binding, and the direct-device switch. No `/project-application*`, `project_application`, or `X-Project-Application-Id` compatibility contract is used; the internal route and source folder name remain unchanged to avoid breaking existing bookmarks and menu codes.

Every created or substantially edited Vue file remains at or below 300 lines.

### Verification

- Targeted Vue diagnostics report no new errors in the application-center API/page and application-Scope files. The full module check still exits non-zero because of pre-existing shared-core and legacy-module diagnostics.
- Application-Scope checks cover a plain tab, query bootstrap, reload restore, explicit clear, absolute domain, host with port, and relative URL behavior.
- `baseMenu.json`, `locales/lang/zh.json`, and `locales/lang/en.json` parse as valid JSON.
- The application-ledger Vue files pass focused SFC script/template/style compilation and remain below 300 lines. Per task scope, build and `tsc` were not run for the visual refresh.
- The application-template management files pass focused JSON parsing, route/menu boundary review, i18n key coverage, SFC tag scanning, TypeScript syntax transpilation, and line-count checks. Per task scope, build and `tsc` were not run; authenticated backend calls for `/business-application-template/{id}/menus`, `/menu/user-own/tree`, `/menu/asset-accesses/grantable`, `/asset/types`, and `/dictionary/asset-scope-strategy/items` still need environment smoke testing.
- The application-management menu asset types match the application, user, role, and device interfaces consumed by the page. This menu-only update was checked by JSON parsing and boundary review; build and `tsc` were intentionally not run.
- The target implementation contains no legacy application API path, dimension type, header, or direct-device setting.
- Production build and authenticated backend E2E results are recorded in the backend integration plan referenced below.

The production build command for this module is:

```bash
node --max_old_space_size=8192 --max-semi-space-size=64 -e "process.argv.push('--module-name','authentication-manager-ui'); import('vite').then(({ build }) => build())"
```
