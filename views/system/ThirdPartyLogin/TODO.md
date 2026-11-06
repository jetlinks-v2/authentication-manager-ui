# 第三方登录后续待办

当前页面已复用应用管理 `/application` 接口，支持管理当前登录页使用的微信公众号、钉钉和通用 OAuth2 SSO 应用，登录图标通过应用的 `logoUrl` 保存。企业微信、微信开放平台网站应用、小程序、组织同步和独立登录页展示开关不属于当前登录方式，页面不展示这些入口。

## 类型快捷筛选布局

目标与范围：运营端 `ui/modules/authentication-manager-ui` 的管理员通过搜索和类型筛选查找登录配置，列表和类型数量沿用当前 `/application` 数据。将 `views/system/ThirdPartyLogin/index.vue` 的左侧类型栏移至搜索右侧、新增按钮左侧；参考设备列表状态筛选的 `a-button-group`，展示微信、钉钉、OAuth2 及数量，重复点击当前类型恢复全部。列表使用完整内容宽度。

实施：移除左右分栏，保留 `FullPage`、`ConditionFilter`、现有表格、空态和配置抽屉；只在 `index.vue` 与 `index.less` 调整组合和布局，不修改接口、菜单、权限或运行时前端。搜索框占据工具栏剩余空间，窄屏允许操作区换行。主要风险是取消类型筛选及搜索组合回归；验证样式门禁、第三方登录现有测试、模块构建与页面布局。

验证：`pnpm --config.verify-deps-before-run=false check:ui-style -- --files modules/authentication-manager-ui/views/system/ThirdPartyLogin/index.vue modules/authentication-manager-ui/views/system/ThirdPartyLogin/index.less`、Vue SFC 脚本与模板及 LESS 编译、`git diff --check` 通过。隔离浏览器加载实际页面模板、Ant Design Vue、现有 hook 和模型，替换 API、搜索输入、抽屉及页面壳；确认 1362px 宽度下搜索、类型、按钮的顺序和对齐，类型数量、类型与关键词组合筛选、重复点击恢复全部、新增沿用所选类型及 760px 换行通过。完整系统中的真实搜索控件和页面壳仍待联调验证。

模块内 `node --test tests/thirdPartyLoginModel.test.mjs tests/thirdPartyLoginMenu.test.mjs` 为 14/15 通过；唯一失败是未修改的菜单测试期望父节点 `application-center`，现有 `baseMenu.json` 为 `platform/settings`。从 `ui/` 执行 `pnpm --config.verify-deps-before-run=false -F jetlinks-web-core build -- --module-name authentication-manager-ui` 被工作区缺失 `vite-plugin-mkcert` 阻断；`pnpm --config.verify-deps-before-run=false exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false` 有其他文件的 775 项诊断，第三方登录目录无诊断。工作区依赖和类型错误修复后需重跑以上构建及类型命令；未配置 lint 脚本。

## 操作列图标按钮

`runtime-ui/modules/authentication-manager-ui/views/system/ThirdPartyLogin/index.vue` 的编辑、删除入口使用 `j-permission-button` 与 `EditOutlined` / `DeleteOutlined`，通过 `tooltip.title` 复用既有国际化文案，并为图标提供中文可访问名称。保留编辑回调、删除确认和已启用时禁止删除的限制，不调整接口、菜单或授权规则；9200 端口对应运行时开发服务，本次仅修改该前端模块。

验证：本地 `http://localhost:9200/#/system/third-party-login` 已确认图标渲染、编辑及删除的悬停提示、中文按钮名称和启用记录的删除禁用状态；未保存配置、启停或删除真实记录。模块生产构建 `pnpm --config.verify-deps-before-run=false -F jetlinks-web-core build -- --module-name authentication-manager-ui`（42.45 秒）、最终 Vue SFC 脚本与模板编译及 `git diff --check` 通过，页面 233 行。模块与工作区未配置 lint 脚本；`pnpm --config.verify-deps-before-run=false exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json --pretty false` 仍有其他文件的 617 项诊断，第三方登录目录无诊断。完整类型检查尚未通过，清理工作区类型错误后需重跑同一命令。

## 应用管理兼容入口

`system/Apply` 保留全部应用的管理能力，方便尚未提供第三方登录菜单的环境继续查看和编辑微信等已有配置。入口为 `views/system/Apply/index.vue`：列表直接使用 `getApplyList_api`，保留搜索、排序和分页参数，不强制追加 `provider=third-party`。后端沿用通用 `POST /application/_query/`，新增应用仍默认第三方类型。

验证：`node --test tests/thirdPartyLoginMenu.test.mjs tests/thirdPartyLoginModel.test.mjs` 共 15 项通过，Apply 的 Vue SFC 脚本及模板编译、`git diff --check` 通过。未执行全量构建或类型检查；需要完整构建时从 runtime-ui 执行 `pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`。线上微信配置回显待部署后验证。

## 安全与兼容

第三方登录配置抽屉（`components/ConfigDrawer.vue`）关闭时应直接丢弃未保存的草稿，不弹出浏览器二次确认。修复范围仅限该抽屉：移除关闭时的 `window.confirm` 和草稿快照，保留关闭事件、草稿重置与保存逻辑；验证新建和编辑、修改前后关闭及重新打开恢复原配置。

验证：临时行为脚本在修复前复现浏览器确认调用，修复后新建 / 编辑 × 未修改 / 已修改的 4 种场景全部通过，关闭仅发送状态事件且重新打开恢复原配置；Vue SFC 脚本和模板编译通过。既有第三方登录测试 15 项、模块生产构建（31.87 秒）及 `git diff --check` 通过。模块没有 lint 脚本；从 runtime-ui 执行 `pnpm exec vue-tsc --noEmit -p modules/authentication-manager-ui/tsconfig.json` 被工作区其他文件的 605 项诊断阻断，第三方登录目录没有诊断。私有化环境中的关闭按钮、取消按钮、遮罩及 Escape 实际点击仍待页面回归。

- [ ] 后端补充 Secret 加密存储、脱敏回显和“留空保持原值”的更新语义；当前详情接口仍按既有行为返回完整配置。
- [ ] 核对应用管理权限在第三方登录菜单下的授权方式，避免只有菜单权限但没有 `/application` 资源权限。
- [ ] 确认单个环境应用数量可能超过 1000 条时的服务端筛选或分页策略。

## 登录验证

- [ ] 在真实环境验证微信公众号、钉钉和 OAuth2 的授权跳转、回调、身份绑定及异常处理。
- [ ] 验证禁用应用会从 `GET /application/sso/_all` 登录入口列表移除。
- [ ] 后端提供企业微信 provider 后，再评估是否恢复企业微信配置入口。

## 登录日志与审计

- [ ] 定义登录成功、失败、绑定及关键配置变更的审计事件、敏感字段脱敏与保留策略。
- [ ] 联调登录日志查询权限、筛选、展示与异常追踪，验证不会记录令牌或 Secret。
