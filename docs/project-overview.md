> 当前归属 authentication-manager-ui；页面 views/project/Overview，组件 visDashboard/Base。以下早期接入记录中的旧目录仅为历史背景。

# 项目概览

## 接入方案

目标：在运行端 `/overview`（菜单编码 `project/Overview`）展示快捷操作、应用中心、资源中心、用量与配额、运维与监控、系统公告六个默认组件。当前运行端缺失项目端模块，本模块从 `ui/modules/project-side-ui` 补齐，概览替换为新底座，头像资源改用运行端已有 saas-runtime-ui。

采用项目工作台布局：主区承载常用操作、应用和资源，右侧承载配额、运行状态和公告。复用 core 的 DashBoardCanvas、Ant Design Card/Spin/Empty 和已验收的项目首页展示结构。组件落在 `visDashboard/Base`，入口遵循三导出协议，页面用 `modules: ['project-side-ui']` 和 `directories: ['visDashboard']` 限定发现范围。

`views/Overview` 只负责目录加载与默认布局；`visDashboard/Base/*` 提供元数据与展示；shared 中的 API、轮询、导航各自独立。真实运行态请求，不使用模拟数据；接口错误、缺少菜单保留明确空态或不可用状态。

本期不开放组件/布局编辑，不持久化个性化配置，不接入旧 dashboard 模块，按现有运营端 project-side-ui 补齐项目端页面、路由覆盖与注册契约；既有运维页的演示数据保持来源现状，概览不消费这些演示接口。保留运营端临时组件源文件。

## 验证

已在 `http://localhost:9200/p_p9m9b7/#/overview` 验证：

- `useDashboardCatalog` 发现 6 个组件、1 个分组，`errors=[]`；所有 `configs=[]`。页面显式设置 `editable=false`、`previewMode=false`，实例锁定，配置不写入服务端。
- 六张卡片均渲染，应用与公告空数据展示正常；资源回显为大屏 2、模板 1、智能体 2，设备、视频、边缘节点及两类业务告警为 0。
- 实际点击设备、边缘节点、大屏、算法和公告更多入口，分别打开设备列表、网关设备列表、作品管理、算法中心和个人中心消息页。设备菜单 `iot-user-device-list` 与既有注册编码不一致，在 `../device-manager-ui/index.ts` 补齐页面别名与详情路由。存在菜单但缺少页面的空间入口未启用。
- 补齐模块时复用 `saas-runtime-ui` 头像，补入原先来自运营端其他模块的 56 个 zh/en 文案，避免个人中心展示国际化 key。
- `node modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：81 个 Vue 文件 SFC 编译通过，相对导入缺失为 0。
- 定向 `vue-tsc` 仍受导入的 core 等既有类型错误影响，未将其作为本 PR 的通过门禁；完整模块检查还包含从运营端同步的个人中心历史类型问题。
- 当前工作区未提供独立 lint 命令；未执行全量 build。沿用底座文档的轻量验证边界，交付前需要完整构建时从 runtime-ui 执行 `pnpm build`。

## 采集器与物联网卡统计修正

按线上数据采集仪表盘及物联卡管理的实际网络请求修正契约：采集器改用 `POST /data-collect/collector/_count`，请求体 `{}`；物联网卡改用 `POST /network/card/detail/_query`，读取分页 `total`。今日触发和运维告警本期移除，对应空位不保留。改动仅作用于运行端项目概览；组件配置仍保持关闭。

验证结果：线上 `http://47.108.154.43:9000` 的采集仪表盘实际请求 `POST /api/data-collect/collector/_count`，请求体 `{}`，HTTP 200、result=2；物联卡管理实际请求 `POST /api/network/card/detail/_query`，HTTP 200、result.total=13。

本地 9200 概览刷新后已请求这两个修正后的接口，但均返回 HTTP 404（No static resource），所以数量仍显示 —。保留当前项目请求上下文，不将线上其他环境的数量填入本地项目。浏览器确认 6 个组件正常挂载，今日触发、运维告警均不存在，视觉告警与物联告警处于同一行。组件 SFC 与相对导入检查通过（81 个 Vue 文件）。

## 系统公告契约

首页使用当前用户通知接口 `POST /notifications/_query`，传 `topicProvider eq SystemBulletin`、`paging=true`、`pageIndex=0`、`pageSize=4`，按 `notifyTime desc` 查询最新公告，不再依赖提供者名称匹配。标题取 topicName，摘要取 message，不查询公告管理列表、不传用户过滤条件。此处采用文档的“最新公告列表”模式，不采用铃铛的未读优先组合。

点击公告复用 authentication-manager-ui 注册的 SystemBulletinNotificationDetail，按 detailJson 中的 bulletinId/publishVersion 请求正文；更多进入个人中心消息页。本期不自动标记已读。详情通过模块公开注册项复用现有 NotificationDetail，不另写正文请求或渲染器。

验证：`node modules/authentication-manager-ui/scripts/verify-announcements.cjs` 通过，覆盖最新 4 条查询参数、标题/摘要映射、详情引用、缺失日期、空列表和失败响应；81 个 Vue 文件的 SFC/相对导入检查通过。针对概览的 vue-tsc 仍为已有依赖 161 项错误，概览自身无报错。

本次在线验收受环境阻塞：9200 刷新后会话初始化 AxiosError，页面进入 403，公告请求未发出。因此新列表的真实回显、点击正文与撤回公告空态尚未完成浏览器验证，不能沿用此前基于提供者列表的空态作为新接口通过证据。恢复项目会话后从 `/overview` 验证 `SystemBulletin` 通知及正文即可。

## 当前后端与菜单限制

以下结果来自当前 9200 页面实际请求，不代表所有部署：

| 能力 | 当前结果 | 页面行为 |
| --- | --- | --- |
| 设备/视频统计、可视化资源、应用列表、智能体统计、两类告警统计 | HTTP 200 | 展示真实数量或空态 |
| 当前用户系统公告 `/notifications/_query` | 已按文档修正，当前会话初始化失败，尚未完成在线查询 | 保留载入/空/失败状态；不再以提供者列表为空作为无公告依据 |
| 算法执行 `/ai/edge/task/operation/execution/detail/_query/no-paging` | HTTP 404 | 启用算法、覆盖通道显示 — |
| 采集器 `/data-collect/collector/_count`、物联网卡 `/network/card/detail/_query` | 线上 HTTP 200；本地 9200 HTTP 404 | 本地对应数量显示 — |
| 场景 `/scene/_query` | HTTP 403，缺少 `rule-scene:query` | 场景数量显示 — |
| 配额上下文 `/console/project` | HTTP 404；本项目会话只有 token，缺少项目 ID | 配额卡显示加载失败；不会猜测 ID 或使用样例用量 |

配额优先使用项目会话 ID；直接进入运行端且缺少 ID 时，按后端正式控制端项目列表契约匹配当前 code。当前运行端代理不提供该控制端接口，需部署侧提供控制端访问和完整项目上下文才能继续验证配额回显。算法中心虽能打开，但其场景树接口也返回 404；设备列表可打开，但部分明细请求权限不足。这些不属于组件渲染故障。

快捷操作已移除文搜图、消息通知、成员管理，保留添加设备、添加视频、接入边缘节点、创建应用、算法配置、空间管理、告警规则管理 7 项。未配置的应用管理、视频添加、空间管理、采集器和卡管理入口保持禁用；既有运维专题页沿用源模块的演示契约，没有将其演示数据用于本次概览。

## 文件入口

- `views/Overview/useOverviewDashboard.ts`：声明模块发现范围和六组件默认网格。
- `visDashboard/Base/manifest.json`、各组件 `index.ts/config.ts`：标准分组与三导出、私有配置命名空间。
- `visDashboard/Base/shared/HomeWidget.vue`：统一卡片、标题、载入/空/错误状态；组件目录下 `components/HomeView.vue` 负责各自内容。
- `visDashboard/Base/shared/api*.ts`、`useHomeRuntime.ts`、`navigation.ts`：真实接口转换、轮询清理和菜单导航。
- `index.ts`、`register.ts`：从现有项目端模块补齐的路由及注册契约。
- `../../pnpm-lock.yaml`：仅为新增无依赖模块补充 workspace importer，保留原有未提交改动。


## 概览告警快速处理

采用原型指定的“分类按钮 → 浮层分页列表 → 详情处理弹窗”，服务项目运维人员处理单条告警。仅修改本模块 `visDashboard/Base/Operations` 与 shared 刷新接线，复用 Ant Design Popover/Modal/List/Form 和现有告警中心请求契约。列表不增加搜索壳层，弹窗集中展示对象、触发规则、当前状态与触发时间，底部填写处理说明并提交。已有告警处理组件缺少这组详情展示且依赖各自页面，故在本模块组合基础控件，不跨模块深层导入私有组件。

实施：物联与视觉告警按现有统计的 targetType 查询 warning 记录，分页展示；选择记录时重新读取同类别记录，避免旧状态继续提交；处理成功刷新概览统计，重新展开时查询最新列表。查询失败可重试，提交失败保留输入，提交期间禁止重复提交及关闭。运维告警沿用前述暂不统计约定，未发现其正式列表及处理契约前不显示演示入口。验证包含 SFC、定向类型检查、接口参数及竞态测试、浏览器空态/浮层/弹窗验证；真实告警不作为测试数据写入。

实现入口：`Operations/alarmService.ts` 封装分页、详情复查及处理参数；`Operations/useQuickAlarms.ts` 管理请求竞态和提交；`Operations/components/AlarmQuickEntry.vue` 组合浮层列表与 `AlarmQuickDetail.vue`；`shared/useHomeRuntime.ts` 接收刷新标识，处理成功后重新查询数量。物联处理使用 `POST /alarm/record/_handle`（alarmRecordId/alarmConfigId/alarmTime/describe/type=user/state=normal），视觉处理使用 `POST /ai/aggregate/task/alarm/_handle`（alarmRecordId/describe/type=user/handleTime），分别参考告警日志 SolveComponent 和 BusinessAlarm/Table 现有契约。

验证结果：
- 本地 9200 点击物联、视觉分类分别请求 `/alarm/record/device/_query`、`/alarm/record/aiTaskMediaTarget/_query`，均 HTTP 200，真实记录为空；浮层展开、分类切换、空态通过。
- `node modules/authentication-manager-ui/scripts/verify-quick-alarms.cjs` 通过：两类接口契约、分页、枚举、空态/失败/记录不存在、已处理和空说明拦截；异步状态覆盖迟到响应、关闭及卸载、重复提交、失败重试、成功刷新。
- `node modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：83 个 Vue SFC 编译通过，相对导入缺失为 0。未执行全量构建，lint/typecheck 边界沿用前述说明。
- 剩余联调：真实项目目前没有未处理记录，实际后端处理成功及权限拒绝需有真实记录时验证；不能将隔离验收当作后端写入验证。运维告警继续待正式契约后接入。

## 资源中心展示边界

应用中心在启用描述展示时始终保留描述行；接口未返回应用描述或描述为空时显示 `--`，避免名称下方留空导致信息层级不一致。

资源中心按原型仅展示资源名称与数量，不提供点击跳转。默认分组和指标两种展示均使用静态元素，移除导航事件、按钮语义、悬停描边和入口不可用提示；数据查询与数量刷新保持现有契约。实现仅涉及 `visDashboard/Base/Resources`。

验证：83 个 Vue SFC 编译与相对导入检查通过；浏览器确认 14 个资源展示项中按钮/链接为 0、title 提示为 0，鼠标为普通样式；点击“数据大屏”后仍停留 `/overview`。本次仅静态标签及事件解绑，未新增测试或执行全量类型检查/构建。

### 两类告警面板差异

重新逐项操作原型确认：视觉告警列表显示告警名与摄像头名；详情先展示抓拍图片、AI 识别说明，再展示触发时间、位置和处理说明。物联告警详情为对象、规则、当前状态、触发时间和处理说明，不展示视觉抓拍。修正 `Operations/alarmService.ts` 的视觉字段映射，在 `AlarmQuickDetail.vue` 中按类别组合独立 `VisionAlarmContent.vue`；公共处理表单、提交契约与失败重试逻辑保留。抓拍、识别内容和位置只显示真实字段，缺失时显示空态，不使用原型示例内容。

验证：已在原型中分别展开并打开两类告警详情，再通过本地隔离注入验证视觉面板的 16:9 抓拍、识别说明、摄像头名称、位置、缺图空态与损坏图片提示；物联面板仅展示对象/规则/状态/时间。弹窗使用内容区滚动，长面板底部操作始终可见。测试数据不进入业务代码，验收后已恢复 XHR 并刷新。84 个 Vue SFC/相对导入检查通过；定向测试补充 latestHistory.fileResults、摄像头/位置和缺失字段映射并通过。类型检查本模块 0 错误，仍存在 161 个既有依赖错误；未全量构建。当前项目真实告警为空，抓拍等真实数据回显仍需有记录后联调，不把注入记录视为真实数据验收。

## 概览图标来源

六组件图标统一从 `shared/HomeIcon.vue` 映射到已安装的 Ant Design outlined 图标，替换原手绘 SVG：设备 Database、视频 VideoCamera、添加视频 VideoCameraAdd、网关 Api、创建应用 AppstoreAdd、算法 Eye、空间/模板 Block、告警规则 Alert、采集器 Fund、物联网卡 Wifi、大屏 Dashboard、图片 Picture、组件 Appstore、模型 Gateway、智能体 Robot、覆盖通道 DeploymentUnit、场景 Thunderbolt。资源分组标题同步补齐图标，快捷操作采用中性色，其余按原型区分业务颜色。仅改概览展示，不改导航和查询。core 的 `assets/icons/iconfont.json` 已确认为私有项目 4035907，App.vue 已加载公共 icons/iconfont.js；本次 Ant Design 已覆盖，无需新增私有图标或脚本。

图标验证：已核验所选 18 个 Ant Design 导出均存在；84 个 Vue SFC 编译和相对导入检查通过；9200 概览截图确认快捷操作、14 项资源、3 个资源分组标题和健康状态图标正确渲染。应用中心当前为空，应用图标仅完成源码映射检查；配额与公告按原型无需新增业务图标。纯图标替换未执行全量 build/typecheck，项目既有类型检查限制见前文。

### UAT 配置与用量接口核验

已实际抓取 `https://cloud-uat.jetlinks.cn/ht_device/#/system/project-usage`：`GET /api/console/project/2064168682737930240/services` 与 `GET /api/console/project/2064168682737930240/service/runtime?serviceIds=...&serviceIds=...` 均 HTTP 200。前者返回 `service.id/name`，后者按 `serviceId` 关联，读取 `resources[].metrics[].usage`、`limit.limit`（-1 为不限量）、`metric.name/unit`。页面真实显示应用 2、用户 58、设备 31、可视化项目 27 等用量。

UAT 项目编码为 ht_device，项目缓存 `project_ht_device.id` 为 2064168682737930240。概览 `shared/apiQuotas.ts` 已使用相同两接口与关联方式，完整项目缓存存在时仅发这两次查询。此前本地 p_p9m9b7 缺少缓存 id、补查项目列表 404 的结论仅适用于当时本地环境，不能推断 UAT 配额接口不可用。不可将 UAT 项目 ID 或用量硬编码到本地项目。本次为只读接口核验，未修改请求实现，未重复构建。

### 私有化资源展示

“采集器与物联网卡”仅在 `!isSaaS` 时展示，复用 `@jetlinks-web-core/utils/consts` 的平台判断。`shared/resources.ts` 在资源定义处过滤 SaaS 不支持的 collection 分组，使默认小卡片、指标视图及统计请求保持一致；SaaS 隐藏整组且不发送采集器、物联网卡查询。

验证：以真实 resources.ts 转译执行 SaaS/私有化两分支，分别为 12/14 项，collection 分组分别隐藏/保留；84 个 Vue SFC 编译及相对导入检查通过。本次未切换部署环境执行浏览器双环境验证，未重复全量类型检查或构建。

### SaaS 专属概览卡片

系统公告、用量与配额仅 SaaS 展示，复用 `isSaaS`。`views/Overview/useOverviewDashboard.ts` 按平台选择默认布局：SaaS 保留六卡布局；私有化使用快捷操作/应用顶行、资源中心/运维监控次行的四卡布局，不创建公告与配额实例，因此不触发其查询和轮询，也不保留两张卡片的空位。

验证：执行实际布局模块的 SaaS/私有化两分支，分别生成 6/4 个组件，公告与配额实例仅在 SaaS 存在，两种布局顶行宽度均为 12；84 个 Vue SFC 编译及相对导入检查通过。未切换部署环境进行浏览器双环境验证，未执行全量类型检查/构建。

### 算法数量口径修正

算法数量按 `POST /ai/scene/tree/_query/no-paging` 返回的每个场景直属 `children.length` 求和，不统计场景父节点，不再从执行绑定推导算法数量。沿用当前项目 request 上下文，不硬编码 rt-uat 地址。覆盖通道保留既有执行绑定统计，两项独立处理失败，覆盖通道接口失败不影响算法数量回显。

验证：实际 TS 转译执行通过 children 求和、父节点/深层节点不计数、空树为 0、覆盖接口 404 时算法仍正常回显及双接口失败分支；84 个 Vue SFC 编译与相对导入检查通过。此次未完成真实项目场景树数量的浏览器回显验证，未执行全量类型检查/构建。

### 192.168.33.59 公告查询实测

在该环境现有登录会话中，以概览完全相同的 `POST /api/notifications/_query` 参数（paging=true/pageIndex=0/pageSize=4、notifyTime desc、topicProvider eq SystemBulletin）实测 HTTP 200，total=1。记录为“运营平台公告测试”，notifyTime=1788948899403（2026-09-09 18:14:59），state=unread。未发布新公告、未修改已读状态。

该环境返回 topicName=系统公告，message=运营平台公告测试，detailJson.title=运营平台公告测试，detailJson.id/dataId 指向公告 ID，但无 publishVersion。当前概览映射会显示通用标题“系统公告”和摘要“运营平台公告测试”；authentication-manager-ui 的 resolveSystemBulletinReference 要求正整数 publishVersion，因此这条通知的正文详情会进入不可查看状态。列表查询已获真实数据验证，正文兼容性尚未解决；不能把列表成功等同于详情通过，也不能猜测发布版本。此次为只读查询测试，未改业务代码。

### 旧公告通知兼容修复

已验证 192.168.33.59 的当前用户 `GET /system/bulletin/{id}` 不传版本号返回 HTTP 200 和真实正文。修正概览标题优先读取 detail/detailJson.title；修正 authentication-manager-ui 公共公告引用解析，只有未携带 publishVersion 的旧通知省略该参数。有版本时保持版本查询，非法版本拒绝解析，查询失败不去掉版本重试，不使用管理详情接口，不改变通知已读状态。

兼容验证：真实无版本正文接口 HTTP 200；转译执行公共 API 验证旧通知省略版本、新通知保留版本、非法版本及损坏 JSON 拒绝，全部通过；公告列表测试覆盖真实标题优先及损坏 JSON 回退并通过，84 个 Vue SFC/相对导入检查通过。本次未将本地修改部署到 192.168.33.59，修改后的弹窗整链路尚未在该环境验证；未执行全量 typecheck/build。

### 画布卡片间距

`views/project/Overview/useOverviewDashboard.ts` 使用 `canvas.gridLayout.marginHorizontal/marginVertical` 将卡片横、纵间距统一设为 18px，与资源中心仪表盘一致。复用新底座的公开配置，保留默认网格排列和外层滚动；浏览器实测横向、纵向间距均为 18px，diff 空白检查通过；本次未运行构建或完整类型检查。

### 隐藏资源分组后的布局

资源子卡片仅剩一项时使用 `:only-child` 横跨整行，消除 SaaS 隐藏采集器与物联网卡后的空位；两项时仍均分两列，窄屏沿用单列规则。仅调整 Resources 展示样式，不变更数据与平台判断。

验证：9200 浏览器实测单设备卡宽 508px，与分组宽度一致；可视化两卡各 248px，保持均分。84 个 Vue SFC 与相对导入检查通过。纯 CSS 修改未重复全量类型检查/构建。

### 概览滚动归属

概览保留外层页面滚动，画布随网格内容自然撑高。`views/Overview/index.vue` 局部覆盖画布 layout/content 的 height:auto、overflow:visible，取消内部 scrollbar-gutter；移除此前错误限制父级视口高度与 overflow:hidden 的样式。共享底座其他调用方保持原有滚动方式。

Chrome 实测：画布 layout/content 的 overflowY 均为 visible；外层页面 scrollHeight=1065、clientHeight=794，滚轮滚到底部时外层 scrollTop=271（等于最大滚动距离），内层 scrollTop=0。84 个 Vue SFC/相对导入检查通过。

### 无侧栏概览留白

概览根据已有布局 DOM 的侧栏及左置二级菜单判断：无侧栏时最大宽度 1600px、水平居中，两侧随视口增加留白；有侧栏时使用原内容宽度，窄屏保持 width:100% 与原内边距。仅修改 views/project/Overview/index.vue，保留外层滚动。

浏览器验证：无侧栏时概览宽度 1600px，父容器内左右留白均为 160px，max-width 生效；18 个 Vue SFC/相对导入检查通过。仅样式调整，未执行全量构建。

### 卡片尺寸试调

两个正式页面的画布宽度调整为可用区域的 90%，居中显示，无侧栏时最大宽度调整为 1440px；网格行高调整为 16px（上一轮为 21px），卡片高度再降低约 13%，保留横纵 18px 间距。通过实际网格尺寸缩小卡片，不缩放字体或交互控件。浏览器复核两页横纵间距仍为 18px；资源中心七个当前可见组件无内容溢出，概览文字与操作正常展示。仅调整尺寸和布局，未运行完整类型检查或构建。

### 概览原型样式与高度

对照原型移除卡片头分隔线，标题统一18px常规字重，内边距按20px/24px组织；资源分组增加26px浅色图标底板，内部文案、快捷操作与状态行对齐原型。顶部三卡及公告调整为7行220px，资源中心16行526px，运维12行390px；保留18px间距、无侧栏居中、只读和现有业务取舍，不恢复已移除入口或虚构指标。浏览器实测标题18px、无卡片头分隔线，高度为220/526/390px；1920和1280视口下快捷操作、资源中心和运维内容无横纵溢出。视觉告警可正常展开并显示真实空态。43个SFC编译和diff检查通过；不运行全量构建。
