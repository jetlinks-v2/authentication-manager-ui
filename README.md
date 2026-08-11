# Authentication Manager UI

`authentication-manager-ui` provides account, organization, permission, system application, and related management pages for the operations UI.

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
- Enums: backend `{value,text}` values are normalized centrally; comparisons and submissions use `value`, while the page displays `text`.
- Users: creation and updates use `/user/detail/_create` and `/user/detail/{id}/_update`; members are queried through `/user/detail/business_application/{applicationId}/_query` and batch-hydrated through `/user/detail/_query`. Creation includes the current `businessApplicationIdList`; updates omit that field and preserve the user's unrelated roles, organizations, positions, and other application memberships.
- Roles: creation and updates use `/role/_create` and `/role/{roleId}/_update`; application roles are queried through `/role/business_application/{applicationId}/_query`. Creation includes the current `businessApplicationIdList`; updates omit it for the same preservation rule.
- Role permissions: the existing role menu editor and `/menu/role/{roleId}/_grant/detail` plus `/menu/role/{roleId}/_grant` contracts are reused.
- Devices: bound assets use the `dim-assets` term with target type `business_application`. Bindable candidates must expose `share`; binding and unbinding use `/assets/bind/device` and `/assets/unbind/device`.
- Deletion: users and roles use the global generic delete endpoints. Confirmation text explicitly warns that the operation is not limited to the current application.

### Application Menu Scope

Opening a configured application appends `applicationScope=<applicationId>` to its URL. The opened tab stores this value in `sessionStorage` so reloads preserve the context. Only `POST /menu/user-own/tree` receives `X-Application-Scope`; the header is not installed on the global request client and is not propagated to device or other downstream APIs. An explicit empty `applicationScope` query clears the stored value.

The related shared code is limited to:

- `jetlinks-web-core/src/utils/application-scope.ts`: URL creation and per-tab Scope resolution.
- `jetlinks-web-core/src/api/system/menu.ts`: optional menu-request header.
- `jetlinks-web-core/src/store/menu.ts`: resolve the current tab Scope when menus are queried.

### UI And Code Boundaries

- `api/application-center/businessApplication.ts`: typed application, template, generic user/role, and asset request boundary.
- `views/application-center/ProjectApplication/applicationModel.ts`: response envelope, enum, list, menu, and view-model normalization.
- `views/application-center/ProjectApplication/applicationDeviceService.ts`: bound and shareable device loading.
- `views/application-center/ProjectApplication/applicationUserService.ts`: application member lookup plus batched full-detail hydration for relation-safe updates.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: remote state and mutation orchestration.
- Ledger/create/detail components: loading, empty, validation, confirmation, submit, and post-mutation refresh behavior.
- `baseMenu.json`: visible name “应用管理” and backend resource actions required by the page.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Unsupported prototype surfaces were removed: fake quotas and metrics, independent camera binding, and the direct-device switch. No `/project-application*`, `project_application`, or `X-Project-Application-Id` compatibility contract is used; the internal route and source folder name remain unchanged to avoid breaking existing bookmarks and menu codes.

Every created or substantially edited Vue file remains at or below 300 lines.

### Verification

- Targeted Vue diagnostics report no new errors in the application-center API/page and application-Scope files. The full module check still exits non-zero because of pre-existing shared-core and legacy-module diagnostics.
- Application-Scope checks cover a plain tab, query bootstrap, reload restore, explicit clear, absolute domain, host with port, and relative URL behavior.
- `baseMenu.json`, `locales/lang/zh.json`, and `locales/lang/en.json` parse as valid JSON.
- The target implementation contains no legacy application API path, dimension type, header, or direct-device setting.
- Production build and authenticated backend E2E results are recorded in the backend integration plan referenced below.

The production build command for this module is:

```bash
node --max_old_space_size=8192 --max-semi-space-size=64 -e "process.argv.push('--module-name','authentication-manager-ui'); import('vite').then(({ build }) => build())"
```
