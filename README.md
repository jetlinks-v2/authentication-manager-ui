# Authentication Manager UI

`authentication-manager-ui` provides account, organization, permission, system application, and related management pages for the operations UI.

## Project Application Center

### Goal

Add an application center with a project application ledger, application creation flow, and a single-application workspace matching the approved prototype behavior.

Owning module: `modules/authentication-manager-ui`.

Out of scope: `runtime-ui/`, Java backend modules, shared `jetlinks-web-core` behavior, generated `dist/`, and unrelated system-management pages.

### Business And Interaction Profile

- Target users: project administrators who create end-user applications and maintain their resources, users, roles, and quotas.
- First task: locate an existing project application or create one.
- Success criterion: the administrator can create an application, open its detail workspace, and complete every configuration action shown by the prototype.
- Object scope: the ledger operates on an application collection; the detail workspace operates on one application.
- Metrics: only the quota and usage values supplied by the project-application data source are shown. No decorative KPI or trend data is added.
- Ledger solution: `资产卡片台账页`. The card grid is the first-screen visual anchor, with status before secondary fields and at most five core facts per card.
- Creation solution: a focused single-page form with template-card selection. A multi-step wizard is rejected because the prototype has no ordered stages or cross-step validation.
- Detail solution: `对象详情工作区`. The application summary stays visible above Tabs; name and description use inline editing, status uses a quick action, and resource/user/role operations use focused dialogs or drawers.
- Search shell: lightweight fixed Ant Design Vue controls for application name, status, and template. This is the fixed-filter exception: there is no route echo, saved search, remote option loading, or generic condition composition in the prototype. `ProSearch` is not used.
- Main reusable components to verify and reuse: `EntityCard`, `ResponsiveGrid`, `SectionCard`, `KvGrid`, `TabsCard`, `InputEditable`, `JlDrawerShell`, `StickyActionBar`, `CloudEmpty`, `MetaChip`, `AppTag`, `AIcon`, plus Ant Design Vue form, upload, tabs, table, tree, progress, modal, switch, and select controls.
- Style source: `jetlinks-web-core/src/style.css` tokens and Ant Design Vue defaults. Do not add a second palette, nested cards, one-sided status bars, decorative statistics, or hard-coded spacing values.

### Code Boundaries

- `baseMenu.json`: register the application center and project application menu with existing permission identifiers only.
- `index.ts`: register create and detail child routes under the project application page.
- `views/application-center/ProjectApplication/types.ts`: shared application, template, resource, usage, user, role, and permission types.
- `views/application-center/ProjectApplication/index.vue`: thin ledger-page composition and navigation only.
- `views/application-center/ProjectApplication/components/ApplicationCard.vue`: one application summary card.
- `views/application-center/ProjectApplication/Create/index.vue`: application form composition and submit orchestration.
- `views/application-center/ProjectApplication/Create/TemplateSelector.vue`: selectable template cards and template detail preview.
- `views/application-center/ProjectApplication/Detail/index.vue`: detail summary, tab routing, and child-panel composition.
- `views/application-center/ProjectApplication/Detail/components/ApplicationSummary.vue`: persistent object identity, status action, and inline edits.
- `views/application-center/ProjectApplication/Detail/components/ApplicationSettings.vue`: icon, language, domain, and direct-device settings.
- `views/application-center/ProjectApplication/Detail/components/DeviceBinding.vue`: bound-device table plus resource selection and unbind actions.
- `views/application-center/ProjectApplication/Detail/components/CameraBinding.vue`: bound-camera grid plus resource selection, settings, and unbind actions.
- `views/application-center/ProjectApplication/Detail/components/UsageOverview.vue`: service quota sections and usage progress.
- `views/application-center/ProjectApplication/Detail/components/UserManagement.vue`: search, add, role change, enable/disable, and remove actions.
- `views/application-center/ProjectApplication/Detail/components/RoleManagement.vue`: role list, role create/edit, and menu permission tree.
- `views/application-center/ProjectApplication/useProjectApplication.ts`: typed prototype data boundary and mutations; replace its methods with request wrappers when backend contracts are available.
- `locales/lang/zh.json` and `locales/lang/en.json`: synchronized user-visible copy.

Every created or substantially edited Vue file must remain at or below 300 lines. Repeated resource selection and mutation feedback will be extracted only when two concrete usages share the same contract.

### Delivered Behavior

- The project-application ledger supports application-name, status, and template filtering plus create and detail navigation.
- Creation supports icon upload, validated name and description fields, six available templates, template detail previews, and a disabled custom-template option.
- The detail workspace supports inline identity editing, application status changes, application entry, icon/language/domain/direct-device settings, device and camera binding, camera settings, nine quota sections, user lifecycle actions, role creation/editing, and per-menu view/edit/delete permissions.
- Empty states, confirmations, validation feedback, mutation feedback, responsive layouts, menu registration, child routes, and synchronized Chinese/English UI copy are included.
- All project-application Vue files are below 300 lines; the largest is `views/application-center/ProjectApplication/Detail/components/RoleManagement.vue` at 200 lines.

### Data Source Decision

No backend contract was found for project applications, resources, quotas, application users, or application roles. The implementation therefore uses a typed in-memory prototype data boundary and does not invent API paths. All page consumers call boundary methods so the storage implementation can be replaced without changing the page components.

This mode is suitable for UI review but does not persist changes across a page reload. Production delivery still requires confirmed backend contracts and request-wrapper integration.

### Verification

The module production build completed successfully with 8,019 transformed modules. The workspace's historical `build:modules` script currently forwards `--module-name` as an unknown Vite 7 CLI option, so validation used the equivalent Vite API entry from `jetlinks-web-core`:

```bash
node --max_old_space_size=8192 --max-semi-space-size=64 -e "process.argv.push('--module-name','authentication-manager-ui'); import('vite').then(({ build }) => build())"
```

Targeted Vue diagnostics report no errors under `views/application-center/ProjectApplication`. The repository-wide type check remains blocked by pre-existing errors in `jetlinks-web-core` and unrelated legacy modules.

Browser verification covered desktop and 390-pixel mobile layouts, ledger filtering, creation validation and submit routing, inline edits, settings, status confirmation, device and camera bind/unbind flows, camera details, all nine quota sections, user search/add/role/status/remove actions, role creation, and permission editing. The browser console remained error-free after the expected invalid-form rejection was handled. Full authenticated E2E navigation was not run because the available backend requires non-default credentials; pages were mounted with the running application's Vue, Pinia, i18n, and global-component context without changing application code.
