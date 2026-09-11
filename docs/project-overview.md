> 当前归属 authentication-manager-ui；页面 views/project/Overview，组件 visDashboard/Base。以下早期接入记录中的旧目录仅为历史背景。

# 项目概览

## 接入方案

目标：在运行端 `/overview`（菜单编码 `project/Overview`）展示快捷操作、应用中心、资源中心、用量与配额、运维与监控、系统公告六个默认组件。当前运行端缺失项目端模块，本模块从 `ui/modules/project-side-ui` 补齐，概览替换为新底座，头像资源改用运行端已有 saas-runtime-ui。

采用项目工作台布局：主区承载常用操作、应用和资源，右侧承载配额、运行状态和公告。复用 core 的 DashBoardCanvas、Ant Design Card/Spin/Empty 和已验收的项目首页展示结构。组件落在 `visDashboard/Base`，入口遵循三导出协议，页面用 `modules: ['project-side-ui']` 和 `directories: ['visDashboard']` 限定发现范围。

`views/Overview` 只负责目录加载与默认布局；`visDashboard/Base/*` 提供元数据与展示；shared 中的 API、轮询、导航各自独立。真实运行态请求，不使用模拟数据；接口错误、缺少菜单保留明确空态或不可用状态。

概览不开放组件配置、添加和删除，但允许用户调整已有组件的位置和大小。布局以 `project-overview` 为 key 保存在浏览器 localStorage，不回写服务端仪表盘配置；不接入旧 dashboard 模块，按现有运营端 project-side-ui 补齐项目端页面、路由覆盖与注册契约；既有运维页的演示数据保持来源现状，概览不消费这些演示接口。保留运营端临时组件源文件。

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

点击公告复用 authentication-manager-ui 注册的 SystemBulletinNotificationDetail，按 detailJson 中的 bulletinId/publishVersion 请求正文；更多进入个人中心消息页。本期不自动标记已读。详情通过模块公开注册项复用现有 NotificationDetail，不另写正文请求或渲染器。首行橙色 `New` 标签严格按“最新第 1 条且通知状态未读（`state === 'unread'`）”展示，已读后自动隐去。

验证：`node modules/authentication-manager-ui/scripts/verify-announcements.cjs` 通过，覆盖最新 5 条查询参数、标题/摘要映射、详情引用、未读第一条 New 标识、缺失日期、空列表和失败响应；81 个 Vue 文件的 SFC/相对导入检查通过。针对概览的 vue-tsc 仍为已有依赖 161 项错误，概览自身无报错。

本次在线验收受环境阻塞：9200 刷新后会话初始化 AxiosError，页面进入 403，公告请求未发出。因此新列表的真实回显、点击正文与撤回公告空态尚未完成浏览器验证，不能沿用此前基于提供者列表的空态作为新接口通过证据。恢复项目会话后从 `/overview` 验证 `SystemBulletin` 通知及正文即可。

## 当前后端与菜单限制

以下结果来自当前 9200 页面实际请求，不代表所有部署：

| 能力 | 当前结果 | 页面行为 |
| --- | --- | --- |
| 设备/视频统计、可视化资源、应用列表、智能体统计、两类告警统计 | HTTP 200 | 展示真实数量或空态 |
| 当前用户系统公告 `/notifications/_query` | 已按文档修正，当前会话初始化失败，尚未完成在线查询 | 保留载入/空/失败状态；不再以提供者列表为空作为无公告依据 |
| 覆盖通道统计 `GET /ai/edge/task/coverage/scene/_count` | 后端待部署 | 提取 channelCount，独立失败容错显示 — |
| 采集器 `/data-collect/collector/_count`、物联网卡 `/network/card/detail/_query` | 线上 HTTP 200；本地 9200 HTTP 404 | 本地对应数量显示 — |
| 场景 `/scene/_query` | HTTP 403，缺少 `rule-scene:query` | 场景数量显示 — |
| 配额上下文 `/console/project` | HTTP 404；本项目会话只有 token，缺少项目 ID | 配额卡显示加载失败；不会猜测 ID 或使用样例用量 |

配额优先使用项目会话 ID；直接进入运行端且缺少 ID 时，按后端正式控制端项目列表契约匹配当前 code。当前运行端代理不提供该控制端接口，需部署侧提供控制端访问和完整项目上下文才能继续验证配额回显。算法中心虽能打开，但其场景树接口也返回 404；设备列表可打开，但部分明细请求权限不足。这些不属于组件渲染故障。

快捷操作已移除文搜图、消息通知、成员管理和算法配置，保留添加设备、添加视频、接入边缘节点、创建应用、空间配置、视联告警、物联告警 7 项。空间配置通过菜单 `space/AreaManagement` 进入 `/resources/space/management`；视联告警和物联告警分别通过 `machine-vision/VisualAlarm`、`iot-user/device/alarm` 进入项目告警页面。创建应用先进入应用列表并以一次性 `action=create` 打开创建弹窗，列表与弹窗同时渲染；添加设备、接入边缘节点与添加视频使用统一动作契约，由统一设备列表分别打开设备新增抽屉、网关接入弹窗或跳转触发视频接入。未配置的采集器和卡管理入口保持禁用。既有运维专题页沿用源模块的演示契约，没有将其演示数据用于本次概览。

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

应用中心与项目应用列表统一查询 `/business-application/_query/no-paging`，按创建时间倒序展示当前可管理应用；应用自身描述为空时回退到关联模板描述，与项目应用卡片口径一致。启用描述展示时始终保留描述行，两者均为空时显示 `--`，避免名称下方留空导致信息层级不一致。

资源中心按原型仅展示资源名称与数量，不提供点击跳转。默认分组和指标两种展示均使用静态元素，移除导航事件、按钮语义、悬停描边和入口不可用提示；数据查询与数量刷新保持现有契约。实现仅涉及 `visDashboard/Base/Resources`。

验证：83 个 Vue SFC 编译与相对导入检查通过；浏览器确认 14 个资源展示项中按钮/链接为 0、title 提示为 0，鼠标为普通样式；点击“数据大屏”后仍停留 `/overview`。本次仅静态标签及事件解绑，未新增测试或执行全量类型检查/构建。

### 两类告警面板差异

重新逐项操作原型确认：视觉告警列表显示告警名与摄像头名；详情先展示抓拍图片、AI 识别说明，再展示触发时间、位置和处理说明。物联告警详情为对象、规则、当前状态、触发时间和处理说明，不展示视觉抓拍。修正 `Operations/alarmService.ts` 的视觉字段映射，在 `AlarmQuickDetail.vue` 中按类别组合独立 `VisionAlarmContent.vue`；公共处理表单、提交契约与失败重试逻辑保留。抓拍、识别内容和位置只显示真实字段，缺失时显示空态，不使用原型示例内容。

验证：已在原型中分别展开并打开两类告警详情，再通过本地隔离注入验证视觉面板的 16:9 抓拍、识别说明、摄像头名称、位置、缺图空态与损坏图片提示；物联面板仅展示对象/规则/状态/时间。弹窗使用内容区滚动，长面板底部操作始终可见。测试数据不进入业务代码，验收后已恢复 XHR 并刷新。84 个 Vue SFC/相对导入检查通过；定向测试补充 latestHistory.fileResults、摄像头/位置和缺失字段映射并通过。类型检查本模块 0 错误，仍存在 161 个既有依赖错误；未全量构建。当前项目真实告警为空，抓拍等真实数据回显仍需有记录后联调，不把注入记录视为真实数据验收。

## 概览图标来源

六组件图标统一从 `shared/HomeIcon.vue` 映射到已安装的 Ant Design outlined 图标，替换原手绘 SVG：设备 Database、视频 VideoCamera、添加视频 VideoCameraAdd、网关 Api、创建应用 AppstoreAdd、算法 Eye、空间/模板 Block、视联告警 VideoCamera、物联告警 Alert、采集器 Fund、物联网卡 Wifi、大屏 Dashboard、图片 Picture、组件 Appstore、模型 Gateway、智能体 Robot、覆盖通道 DeploymentUnit、场景 Thunderbolt。资源分组标题同步补齐图标，快捷操作采用中性色，其余按原型区分业务颜色。仅改概览展示，不改查询。core 的 `assets/icons/iconfont.json` 已确认为私有项目 4035907，App.vue 已加载公共 icons/iconfont.js；本次 Ant Design 已覆盖，无需新增私有图标或脚本。

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

### 覆盖通道数量接口调整

概览“资源中心”中的“覆盖通道”数量统计从原先遗留的 `/ai/edge/task/operation/execution/detail/_query/no-paging` 切换为后端新定义的 `GET /ai/edge/task/coverage/scene/_count`，响应结构为 `{ channelCount: number }`。
- 在 `visDashboard/Base/shared/apiResult.ts` 增加 `channelCountOf` 解析器，支持直接对象与 `result` 包装两种格式。
- 在 `visDashboard/Base/shared/apiAlgorithms.ts` 实现 `loadCoverageChannelCount`，并通过 `Promise.allSettled` 与算法树查询保持独立，单项失败不影响算法总数回显。

### 192.168.33.59 公告查询实测

在该环境现有登录会话中，以概览完全相同的 `POST /api/notifications/_query` 参数（paging=true/pageIndex=0/pageSize=4、notifyTime desc、topicProvider eq SystemBulletin）实测 HTTP 200，total=1。记录为“运营平台公告测试”，notifyTime=1788948899403（2026-09-09 18:14:59），state=unread。未发布新公告、未修改已读状态。

该环境返回 topicName=系统公告，message=运营平台公告测试，detailJson.title=运营平台公告测试，detailJson.id/dataId 指向公告 ID，但无 publishVersion。当前概览映射会显示通用标题“系统公告”和摘要“运营平台公告测试”；authentication-manager-ui 的 resolveSystemBulletinReference 要求正整数 publishVersion，因此这条通知的正文详情会进入不可查看状态。列表查询已获真实数据验证，正文兼容性尚未解决；不能把列表成功等同于详情通过，也不能猜测发布版本。此次为只读查询测试，未改业务代码。

### 旧公告通知兼容修复

已验证 192.168.33.59 的当前用户 `GET /system/bulletin/{id}` 不传版本号返回 HTTP 200 和真实正文。修正概览标题优先读取 detail/detailJson.title；修正 authentication-manager-ui 公共公告引用解析，只有未携带 publishVersion 的旧通知省略该参数。有版本时保持版本查询，非法版本拒绝解析，查询失败不去掉版本重试，不使用管理详情接口，不改变通知已读状态。

兼容验证：真实无版本正文接口 HTTP 200；转译执行公共 API 验证旧通知省略版本、新通知保留版本、非法版本及损坏 JSON 拒绝，全部通过；公告列表测试覆盖真实标题优先及损坏 JSON 回退并通过，84 个 Vue SFC/相对导入检查通过。本次未将本地修改部署到 192.168.33.59，修改后的弹窗整链路尚未在该环境验证；未执行全量 typecheck/build。

### 画布卡片间距

`views/project/Overview/useOverviewDashboard.ts` 使用 `canvas.gridLayout.marginHorizontal/marginVertical` 将卡片横、纵间距统一设为 18px，与资源中心仪表盘一致。复用新底座的公开配置，保留默认网格排列和外层滚动；浏览器实测横向、纵向间距均为 18px，diff 空白检查通过；本次未运行构建或完整类型检查。

### 隐藏资源分组后的布局

SaaS 隐藏采集器与物联网卡后，“设备与接入”仅保留“设备”单卡；当设备组为 1 卡、可视化组为 2 卡时，顶层两列网格自适应为 `1fr 2fr`（`.home-resources--asymmetric`），使“设备”（约 338px）、“大屏”（约 333px）、“素材库”（约 333px）三卡视觉宽度完全等宽，彻底解决数值靠右拉伸过长导致与右侧分组视觉粘连的亲密性失衡问题；私有化两组各 2 卡时自动保持 1:1 均分。窄屏（<=620px）沿用单列规则。

验证：9200 浏览器实测单设备卡与可视化两卡宽度均约为 333~338px，第一行三卡等宽，数值居于合理位置；44 个 Vue SFC 与相对导入检查通过。纯 CSS/布局计算修改，未重复全量类型检查/构建。

### 概览滚动归属

概览保留外层页面滚动，画布随网格内容自然撑高。`views/Overview/index.vue` 局部覆盖画布 layout/content 的 height:auto、overflow:visible，取消内部 scrollbar-gutter；移除此前错误限制父级视口高度与 overflow:hidden 的样式。共享底座其他调用方保持原有滚动方式。

Chrome 实测：画布 layout/content 的 overflowY 均为 visible；外层页面 scrollHeight=1065、clientHeight=794，滚轮滚到底部时外层 scrollTop=271（等于最大滚动距离），内层 scrollTop=0。84 个 Vue SFC/相对导入检查通过。

### 无侧栏概览留白

概览根据已有布局 DOM 的侧栏及左置二级菜单判断：无侧栏时最大宽度 1600px、水平居中，两侧随视口增加留白；有侧栏时使用原内容宽度，窄屏保持 width:100% 与原内边距。仅修改 views/project/Overview/index.vue，保留外层滚动。

浏览器验证：无侧栏时概览宽度 1600px，父容器内左右留白均为 160px，max-width 生效；18 个 Vue SFC/相对导入检查通过。仅样式调整，未执行全量构建。

### 卡片尺寸试调

两个正式页面的画布宽度调整为可用区域的 90%，居中显示，无侧栏时最大宽度调整为 1440px；网格行高调整为 16px（上一轮为 21px），卡片高度再降低约 13%，保留横纵 18px 间距。通过实际网格尺寸缩小卡片，不缩放字体或交互控件。浏览器复核两页横纵间距仍为 18px；资源中心七个当前可见组件无内容溢出，概览文字与操作正常展示。仅调整尺寸和布局，未运行完整类型检查或构建。

### 概览原型样式与高度

资源中心的每个资源项均为可访问菜单的按钮：菜单存在时可点击跳转，菜单或模块不存在时置灰并通过 Tooltip 说明不可用原因；视频资源使用“当前未开通视联模块相关功能”提示。禁用项由包裹触发节点承载 Tooltip，确保 disabled button 仍可悬浮提示；可用项 hover 为带 8px 左右留白的浅蓝背景和圆角过渡，外层保持 100% 宽度且在按钮内预留 0 8px 留白，子分组标题同步增加 8px 内边距保持对齐，不在 hover 时改变尺寸，避免文字抖动与贴边；不再使用整行蓝色 outline，键盘 focus 仍保留可见边框。SaaS 平台隐藏采集器、物联网卡和智能体，算法分组标题为“算法与规则引擎”；私有化保留采集器、物联网卡和智能体。资源项导航复用 menu store 的实际菜单编码，不新增路由。

对照原型移除卡片头分隔线，标题统一18px常规字重，内边距按20px/24px组织；资源分组增加26px浅色图标底板，内部文案、快捷操作与状态行对齐原型。顶部三卡及公告调整为7行220px，资源中心16行526px，运维12行390px；保留18px间距、无侧栏居中、只读和现有业务取舍，不恢复已移除入口或虚构指标。浏览器实测标题18px、无卡片头分隔线，高度为220/526/390px；1920和1280视口下快捷操作、资源中心和运维内容无横纵溢出。视觉告警可正常展开并显示真实空态。资源项与应用中心项 hover 已统一改为浅蓝背景（#eef5ff）与圆角过渡，修复左右贴边并移除原生重复 title 提示，禁用项图标同步置灰并通过 Tooltip 承载原因；44个 SFC/相对导入检查和 diff 检查通过；不运行全量构建。

### 应用中心点击直接打开应用

概览中的“应用中心”卡片（`visDashboard/Base/Applications`）点击逻辑调整：
- 原逻辑：点击应用条目通过 `view.open` 跳转到应用管理详情配置页（`application-center/ProjectApplication/Detail`）。
- 现逻辑：点击应用条目不再进入详情页，而是直接跳转打开该业务应用。
- 实现细节：
  - 复用 `useApplicationOpenGuard` 进行权限、用户绑定及角色准入检查；若存在待选角色弹出 `ApplicationRoleSelectModal` 角色绑定弹窗；准入通过后通过 `prepareApplicationAccess` 构建应用上下文及 URL 并直接打开应用。
  - `ProjectHomeApplications.vue` 挂载 `ApplicationRoleSelectModal` 与状态控制，卡片点击触发 `@open="handleOpenApp"`；
  - `HomeView.vue` 增加 `openingIds` 状态，打开过程中图标显示 `<a-spin size="small" />` 且按钮防重，停用应用或设计预览态保持禁用；
  - `api.ts` 的 `loadApplications` 调用 `normalizeApplication` 将完整的 `ProjectApplication` 实体附加至 `HomeRow.application`。

### 组件缩放支持与响应式优化

- **缩放手柄可见性与层级**：`GridCanvas.vue` 中增强 `.vue-resizable-handle`，设置 `z-index: 10` 与明确的直角拖拽微交互手柄（悬停高亮为主色），防止被内部按钮（自带 `position: relative`）或图表覆盖。
- **持久化保护**：`useDashboardState.ts` 在外部 `options.value` 响应式更新时优先合并回填 `localStorage` 中的用户自定义尺寸与位置，防止组件更新重置布局。
- **尺寸约束合并**：`useOverviewDashboard.ts` 映射组件时合并 `defaultGridItem` 与 `defaultConfig.componentProps.gridItem`，正确保留 `minW: 3, minH: 6` 约束。
- **响应式排版**：
  - `views.less` 修复 `@container business-component-shell` 规则特异度顺序，确保窄屏（`< 360px`）切实生效双列；宽屏（`>= 680px`）快捷操作与用量配额自适应多列；
  - 资源分组子卡在 `< 480px` 时平滑切为单列，配合 `ResourceItem.vue` 的文字省略与数值 `nowrap` 保护，彻底消除折行与错位；
  - 运维状态与用量配额在 `< 440px` 时平滑降级为单列；应用中心标题与描述增加截断保护与宽容器双列自适应。

### 2K/4K 动态边距与资源中心对齐修复

- **无侧栏时对齐顶部菜单起始位置与大屏自适应**：
  - 需求背景：由于概览页面无左侧二级菜单，若贴边放置会导致卡片在左侧 logo 标题下方展开，缺乏呼吸留白；因此让卡片左边界与顶部导航菜单（“概览”）的起始位置保持垂直对齐，右侧保持对称留白。
  - 实现方案：
    - 移除硬编码的 `max-width: 1440px`。
    - 针对无侧栏布局，设置 `--overview-side-margin`：
      - 1080p（>= 1600px）：对齐 `var(--sidebar-w, 224px)`，卡片与顶部菜单“概览”起点严格垂直对齐；
      - 2K（>= 2560px）：边距设为 `256px`（对应 2K 顶栏品牌区 240px 宽度 + 16px 菜单间距），对齐 2K 顶部菜单且内容宽达 2048px，消除原 560px 过大留白；
      - 4K（>= 3200px）：边距设为 `336px`（对应 4K 顶栏品牌区 320px 宽度 + 16px 菜单间距），对齐 4K 顶部菜单且内容宽达 3168px，消除原 1200px 过大留白；
      - 较小屏幕（< 1600px）：使用 `clamp(24px, 12vw, 224px)` 动态缩小边距，保障卡片内容不被压缩。
    - 结合外层容器已有的 16px 内边距，内边距设置为 `padding: 0 calc(var(--overview-side-margin) - var(--space-4, 16px)) var(--space-4)`。
- **资源中心条目左侧留白对齐修复**：
  - 问题原因：`ResourceItem.vue` 内部使用了 Ant Design Vue 的 `<HomeIcon>`，其底层渲染为 `<span class="anticon ... home-icon">`，此前样式的 `.home-resource-row span { flex: 1 }` 误将 `<HomeIcon>` 也设置为 `flex: 1`，导致图标宽度被撑大至容器一半并将图标居中，在条目左侧产生大面积空白并推挤文字。
  - 优化方案：为文字包裹 `<span class="resource-item-label">` 并专属设置 `flex: 1` 与文本省略，同时为 `.home-icon` 与 `HomeIcon.vue` 显式设置 `flex: 0 0 18px; width: 18px; max-width: 18px`，确保图标固定靠左紧邻 8px 内边距与分组标题垂直对齐。

### 用量与配额隐藏与运维监控置顶布局优化

- **组件隐藏与布局优化**：
  - 需求调整：隐藏用量与配额（`Quotas`）组件，不把快捷操作撑开，将“运维与监控”组件往上顶至第一行。
  - 栅格布局调整（`views/project/Overview/useOverviewDashboard.ts`）：
    - **左侧顶行（x: 0~7，总宽 8 列）**：
      - `QuickActions`（快捷操作）：保持紧凑的 `w: 5, h: 7`（`x: 0, y: 0`），不横向撑开；
      - `Applications`（应用中心）：保持 `w: 3, h: 7`（`x: 5, y: 0`），并排于快捷操作右侧；
    - **左侧底行（x: 0~7，总宽 8 列）**：
      - `Resources`（资源中心）：`x: 0, y: 7, w: 8, h: 16`，紧贴快捷操作与应用中心下方；
      - 左侧列底边界为 `y = 7 + 16 = 23`。
    - **右侧列（x: 8~11，总宽 4 列）**：
      - `Operations`（运维与监控）：往上顶至第一行 `x: 8, y: 0, w: 4, h: 12`，紧凑清晰展示告警与健康状态；
      - `Announcements`（系统公告）：紧随其下 `x: 8, y: 12, w: 4, h: 11`；
      - 右侧列底边界为 `y = 12 + 11 = 23`，与左侧资源中心底部完全平齐对齐。
  - 缓存与持久化隔离（`views/project/Overview/index.vue`）：
    - 升级 `storage-key` 为 `project-overview-v4`，确保用户与浏览器直接加载最新清爽排版，不受历史旧版缓存拉伸或空洞影响。
    - `useDashboardState.ts` 保持清洗废弃 ID 的能力，并移除强制扩大组件宽度的临时逻辑。

### 快捷操作按钮简约重构与高度空隙优化

- **设计调优（简约克制风格）**：
  - 遵循用户“简约些”的要求，移除过于显眼的彩色圆角背景徽章和微投影白卡，回归克制内敛的 B2B 工业物联视觉风格：
    1. **底板与边框**：静止状态沿用全局通用的浅灰面（`var(--home-card-surface)`，即 `#f7f8fa`），透明边框 `1px solid transparent`，与周围组件保持统一底色。
    2. **图标与文字**：图标使用标准中性色线框图标（`18px`），与 `13px` 文本紧凑并排；取消每个按钮不同的花哨彩底。
    3. **交互反馈**：悬停（hover）时平滑渐变为浅蓝底（`#eef5ff`）与浅蓝描边（`#d4e2ff`），文字与图标同步高亮为主色调（`var(--business-component-primary)`），与应用中心/资源项的 hover 规范统一。
    4. **高度均分填充**：保持网格 `h: 6`（186px），内部 `.home-actions` 采用 `grid-template-rows: repeat(2, minmax(0, 1fr)); height: 100%;`，2 行按钮均匀分配卡片可用高度，每个按钮高度约 48px~52px，既解决原本底部留白空隙过大的问题，又保持视觉清爽简约。
  - 升级存储键为 `project-overview-v5`，保证用户刷新后直接呈现最新的简约样式。

## 快速上手组件与应用中心空状态实施

1. **功能实现**：
   - **快速上手组件（QuickGuide）**：
     - 落地于 `visDashboard/Base/QuickGuide`（包括 `config.ts`、`index.ts`、`ProjectHomeQuickGuide.vue` 及 `components/HomeView.vue`）。
     - SaaS 与私有化概览布局均默认搭载，占位 `x: 0, y: 6, w: 8, h: 5`，下方资源中心平滑顺延至 `y: 11, h: 17`；用量与配额隐藏不显示，右侧运维与监控置顶于 `x: 8, y: 0, w: 4, h: 12`，系统公告紧随其下于 `x: 8, y: 12, w: 4, h: 16`，左右两栏总高度齐平于 `y = 28`。
     - **收起态**：紧凑单行流式排版，每步呈现为精致胶囊药丸（浅灰边框、淡色底板，带蓝色圆圈编号 ①~④ 与步骤标题），步间以淡灰 `>` 分隔，右侧设展开按钮（`DownOutlined`）。
     - **展开态**：4 张横向均分卡片，包含序号圆圈、步骤标题、两行功能描述与底部带箭头的跳转链接按钮（`去接入 >` / `去配置 >`），右侧设收起按钮（`UpOutlined`）。
     - 展开/收起状态通过 `localStorage('project-home-quick-guide-collapsed')` 进行用户级持久化，刷新后自动保持。
     - 接入项目路由跳转（`useMenuStore.jumpPage`），分别直达边缘网关、设备新增、空间管理与算法中心。
   - **应用中心空状态（Applications）**：
     - `HomeWidget.vue` 支持 `#empty` 插槽与动态右上角更多文本；当 `feature === 'Applications'` 时右上角操作文案自适应展示为“查看所有应用 ›”。
     - `ProjectHomeApplications.vue` 接入 `#empty` 专属空状态：居中大图标（`AppstoreOutlined`）、标题“暂无应用”、说明“可基于场景包快速创建应用，统一管理项目内的业务系统”，以及蓝色主按钮“去创建应用”。
2. **验证结果**：
   - `node modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：53 个 Vue SFC 编译全部通过，0 SFC 错误，0 相对导入缺失。
   - 浏览器与 Vite 编译正常，HMR 响应正常，控制台 0 报错。

## 资源中心多组件拆分与 UI 样式改造（对齐 Figma 设计稿）

1. **背景与目标**：
   - 参考 Figma 设计稿（node-id: 7172-69729），将原本单一的“资源中心”卡片拆分为 4 个独立的业务子卡片组件，重构视觉规范（配色、条目胶囊、图标底板与字阶）、行列布局与响应式网格。
   - 严格遵循约束：仅修改样式配色与组件拆分布局，不改动当前展示字段、接口请求口径（`loadResourceRows`）以及菜单跳转/不可用提示逻辑。

2. **组件拆分与落点**：
   - `visDashboard/Base/Resources/components/DeviceAccessCard.vue`：**设备与接入**独立卡片（标题 18px 600 #1D2129），单列展示物联设备、视频通道、边缘节点（私有化场景保留采集器与物联网卡）。
   - `visDashboard/Base/Resources/components/VisualizationCard.vue`：**大屏可视化**独立卡片，内部采用双列网格（左列为素材库：图片、组件、模型；右列为大屏：数据大屏、大屏模板）。
   - `visDashboard/Base/Resources/components/AiCenterCard.vue`：**AI中心**独立卡片，展示智能体、启用算法、覆盖通道。
   - `visDashboard/Base/Resources/components/RuleEngineCard.vue`：**规则引擎**独立卡片，展示场景联动。
   - `visDashboard/Base/Resources/components/ResourceItem.vue`：抽离为通用条目胶囊组件，采用 `#F8FAFC` 浅灰底板、`40px × 40px` 圆形柔和浅色背景图标、`14px / #1D2129` 名称、`16px 500 / #1D2129` 数值与 `14px / #4E5969` 单位（`个`），支持 `:hover` 浅蓝（`#EEF5FF`）高亮与禁用态 Tooltip 提示。
   - `visDashboard/Base/Resources/components/HomeView.vue`：2×2 响应式网格编排（第一排 317:681，第二排 681:317，窄屏自适应单列）。
   - `visDashboard/Base/Resources/ProjectHomeResources.vue`：使最外层 Card 透明去壳，消除多余嵌套与顶层卡头，使 4 张白底独立卡片直接融入项目概览网格。

3. **逐项对齐 Figma 设计稿（node-id: 7172-69729）检查与精细化调整**：
   - **标题与文案**：多语言 `zh.json` 中的 `group_ai` 修正为 `AI中心`（去除多余空格），与设计稿完全一致。
   - **配色与图标底色**：
     - `视频通道`（视联设备）：图标主色调整为 `#1E72F0`（蓝），圆圈底板 `#E8F3FF`，与设计稿完全一致。
     - `覆盖通道`：图标主色调整为 `#009CD5`（天蓝），圆圈底板 `#E2F5FC`，与设计稿完全一致。
     - `物联设备` / `边缘节点`：图标 `#1E72F0`，底板 `#E8F3FF`。
     - `图片`：图标 `#5B9B6D`，底板 `#EBF8F2`。
     - `组件`：图标 `#BD6A9F`，底板 `#F8EEFE`。
     - `模型`：图标 `#59A7A5`，底板 `#EBF5FA`。
     - `数据大屏`：图标 `#7980D4`，底板 `#EEF2FF`。
     - `大屏模板`：图标 `#D79C42`，底板 `#FEF3E6`。
     - `智能体`：图标 `#966DC2`，底板 `#F3EEFF`。
     - `启用算法`：图标 `#59A7A5`，底板 `#EBF7F7`。
     - `场景联动`：图标 `#D79C42`，底板 `#FFF3E8`。
   - **卡片内边距与条目间距**：
     - 4 张卡片内边距统一由 `16px 20px 20px` 调整为 `16px`，匹配 Figma 的 `(317 - 285) / 2 = 16px`。
     - 条目垂直间距统一由 `12px` 调整为 `16px`，严格对应 Figma `layout_C665CR` / `layout_OAX278` / `layout_X4AMMD` 的 `gap: 16px`。
     - 卡片内容区配置 `justify-content: flex-start`，确保大屏可视化右列（2个条目）与规则引擎（1个条目）自然置顶靠齐。
   - **看板高度与裁切问题彻底解决**：
     - 排查发现用户截图中第二行卡片底部被截断的原因：`useOverviewDashboard.ts` 中原本分配给 Resources 的网格高度为 `h: 17`（560px），而两排 312px 卡片加上 16px 间隙需约 640px。
     - 将 `Resources` 与右侧并排的 `Announcements` 高度统一提升为 `h: 20`（662px），私有化布局下的 `Operations` 顺延调整为 `h: 32`；同时在 `HomeView.vue` 中配置 `height: 100%` 与 `resources-row` 的 `flex: 1` 均分机制，彻底消除遮挡截断与滚动条，两行卡片高度饱满齐平。

4. **验证结果**：
   - `node modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：57 个 Vue SFC 编译通过，0 SFC 错误，0 相对导入缺失。

## 运维与监控卡片重构与渐变视觉样式完整对齐（对齐 Figma 设计稿）

1. **运维与监控卡片（Operations）重构**：
   - **资源健康状态（Health）**：
     - 将原本的单行文本列表改造为 3 列横向卡片网格（边缘节点、物联设备、视频通道），匹配设计稿 `Frame 2147259391 / 2147259395 / 2147259396`；
     - 每张卡片包含：`32px × 32px` 圆形微蓝白渐变图标底板（`linear-gradient(180deg, #FFFFFF 0%, #D6E9FF 60%, #D6E9FF 99%)`）与 `#1E72F0` 图标、`14px 500 #1D2129` 标题、`6px` 蓝灰健康进度条、底部 `在线 <num>` 与 `离线 <num>` 状态。
     - 卡片底板为 `#F8FAFC`，带 `1px solid #E5EFFD` 浅蓝细边框，`:hover` 平滑过渡为 `#EEF5FF` 浅蓝底板与 `#BFD8FF` 边框。
   - **监控告警（Alarms / AlarmQuickEntry）**：
     - 将原本的单行文字改造为 2 列横向告警大卡片网格（物联告警、视觉告警），匹配设计稿 `Frame 2147259401 / 2147259400`；
     - **物联告警**：`32px × 32px` 圆形粉白渐变图标底板（`linear-gradient(180deg, #FFFFFF 0%, #FFD6D6 100%)`）搭配红告警铃铛图标（`AlertOutlined`，`#F84343`），右侧展现 `20px 600` 大字重待处理数值。
     - **视觉告警**：`32px × 32px` 圆形橙白渐变图标底板（`linear-gradient(180deg, #FFFFFF 0%, #FFEAD6 100%)`）搭配橙黄色告警三角图标（`WarningOutlined`，`#FFB24E`），右侧展现 `20px 600` 大字重待处理数值。
     - 保留点击打开快捷告警抽屉与处理弹窗的所有现有业务逻辑。

2. **快捷操作与应用中心渐变底色补齐**：
   - **快捷操作（QuickActions）**：
     - 按钮应用 `linear-gradient(90deg, #EFF6FF 0%, #FBFDFF 100%)` 与 `1px solid #E5EFFD` 浅蓝渐变边框；
     - 图标容器升级为 `32px × 32px` 彩色 135deg 线性渐变圆角底板（蓝/青/紫三类色相），图标呈现为统一纯白反白；悬停时支持 `scale(1.05)` 微动效。
   - **应用中心（Applications）**：
     - 卡片应用 `linear-gradient(90deg, #F0F6FF 0%, #FCFEFF 100%)` 与 `1px solid #E5EFFD` 浅蓝边框；
     - 图标容器升级为 `40px × 40px` 135deg 蓝紫线性渐变底板（`#94BFFE` -> `#1E72F0`），图标纯白反白；
     - 右侧增加灰色向右箭头（`RightOutlined`），`:hover` 时平滑微移。

3. **存储键版本升级**：
   - 将 `views/project/Overview/index.vue` 中的 `storage-key` 升级为 `project-overview-v6`，确保用户刷新页面直接加载最新布局与卡片样式，不受旧版缓存干扰。

4. **验证结果**：
   - 执行 `node runtime-ui/modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：57 个 Vue SFC 编译全部通过，0 错误，0 相对导入缺失。

## 运维与监控高度对齐与卡片 Hover 黑边框修复

1. **网格高度精准对齐**：
   - **左侧资源中心高度**：`Resources` 位于 `y: 7, h: 20`，内部按 2 行资源大卡片均分（每行高度为 `(662px - 16px) / 2 = 323px`）。
   - **右侧高度微调**：
     - `Operations`（运维与监控）：由 `h: 12`（390px）收紧调整为 `h: 10`（322px），底边与左侧第 1 行资源大卡片底边精准齐平（`y=7` 至 `y=17`，高度差仅 1px）。
     - `Announcements`（系统公告）：起始位置由 `y: 19` 同步调整为 `y: 17, h: 10`（322px），与左侧第 2 行资源大卡片精准齐平（`y=17` 至 `y=27`）。
     - SaaS 与私有化双布局同步生效，两列底边与两排卡片形成完全对齐的双行栅格。
   - **存储键升级**：升级为 `project-overview-v7`，确保浏览器自动加载全新对齐布局，无需用户手动清除 LocalStorage。

2. **Hover 粗黑外边框问题彻底根除**：
   - **问题根因**：
     - `views.less` 中全局定义了 `.home-content button:not(:disabled):hover { outline: 1px solid var(--business-component-primary); }`，在鼠标悬停或获得焦点时，浏览器原生 button 的 focus ring 与该 outline 叠加产生明显的深色黑边框。
   - **修复方案**：
     - 在 `views.less` 中将 `.home-content button:not(:disabled):hover` 及 `:focus`, `:focus-visible` 的 `outline` 统一改为 `none;`。
     - 在 `HomeView.vue`（健康状态卡片 `.home-health-card`）与 `AlarmQuickEntry.vue`（告警卡片 `.alarm-entry-card`）上显式声明 `outline: none !important;`。
     - 替换为 Figma 设计稿规范的温和悬浮态：悬浮时背景变浅蓝 `#eef5ff`、边框亮蓝 `#bfd8ff`、并施加软阴影 `box-shadow: 0 2px 8px rgba(30, 114, 240, 0.08);`，彻底消除生硬的黑框/深色描边。

3. **运维与监控内容紧凑化**：
   - 为了在 `h: 10`（322px 高度）内舒适展示而不产生内部纵向滚动条，对内部各元素尺寸做紧凑化微调：
     - 外层容器：`gap: 12px; overflow: hidden;`；
     - 分组标题：下边距设为 `8px`；
     - 健康卡片：高度紧凑为 `min-height: 80px; padding: 8px 10px;`，图标盒子缩紧为 `28px × 28px`（图标 14px），进度条外边距微调为 `6px 0 6px`；
     - 告警卡片：高度收紧为 `52px; padding: 8px 14px;`，图标缩紧为 `28px × 28px`，大字重数量调整为 `18px`；
     - 整体内容高度收敛至约 196px，留白充裕、呼吸感良好且与左侧完全对齐。

4. **验证结果**：
   - 执行 `node runtime-ui/modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：57 个 Vue SFC 编译通过，0 SFC 错误，0 相对导入缺失。

## AI中心与规则引擎宽度均分及快捷操作一排4个优化

1. **AI中心与规则引擎组件宽度均分（50% / 50%）**：
   - **调整背景**：
     - 在第二行资源大卡片中，原本配置为 `.resource-card-ai { flex: 681; }`、`.resource-card-rules { flex: 317; }`，导致 AI中心宽度被拉伸为规则引擎的 2 倍以上，而两者内部均为单列胶囊排列，视觉比例严重不协调。
   - **改造方案**：
     - 在 `visDashboard/Base/Resources/components/HomeView.vue` 中，将 `.resource-card-ai` 与 `.resource-card-rules` 的宽度比例统一调整为 `flex: 1; min-width: 0;`。
     - 第二行资源中心组件按 1:1 均分整行宽度（`(100% - 16px) / 2`），左右各占 50%，两张卡片横向居中对称齐平，视觉更加平衡协调。

2. **快捷操作一排4个固定布局**：
   - **调整背景**：
     - 在宽屏设备下，`views.less` 中原本的 `@container business-component-shell (min-width: 680px)` 规则激活了 `.home-actions:not(.home-actions--grid) { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }`，导致所有快捷操作按钮被自动铺满排成 5~7 列挤在一排，破坏了原型设计的 4 列网格。
   - **改造方案**：
     - 从 `views.less` 中移除针对 680px 以上容器的 `auto-fill` 挤压规则。
     - 在 `visDashboard/Base/QuickActions/components/HomeView.vue` 中显式指定 `.home-actions` 为 `grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 16px;`。
     - 快捷操作严格保持一排 4 个（共两排，第一排 4 个、第二排 3 个），无论屏幕宽度如何拉伸均稳定呈现 4 列均分网格。

3. **验证结果**：
   - 执行 `node runtime-ui/modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：57 个 Vue SFC 编译全部通过，0 错误，0 相对导入缺失。

## 系统公告卡片样式严格对齐 Figma 设计稿

1. **对齐设计稿布局与元素结构（Frame 7137:62525）**：
   - **左右布局对调与右对齐日期**：
     - 原实现中日期直接紧贴在最左侧（`09-10`），右侧紧随标题，且日期格式为 `MM-DD`。
     - 严格对照 Figma 设计稿（`layout_XAXW6W`）改造：整行采用 `justify-content: space-between;`，左侧为标题主区域，右侧为日期时间；
     - 日期格式升级为设计稿的 `YYYY.MM.DD`（例如 `2026.08.27`），字号 `13px`，颜色 `#86909C`（`fill_LWLUWR`），右对齐且不换行（`flex-shrink: 0;`）。
   - **橙色渐变 "New" 标签实现（Figma Node 7137:62535）**：
     - 严格贴合设计稿视觉：仅列表第一条（最新发布公告，`index === 0`）展示专属 "New" 药丸标签；
     - 标签底色严格按照设计稿 `fill_MSFD82` 应用 135deg 线性渐变：`linear-gradient(135deg, #FF7D00 0%, #F7BA1E 100%)`；
     - 圆角特征严格还原设计稿的 `11px 11px 11px 0px`（左下角直角/少圆角，其余三边平滑大圆角）；
     - 字体应用 Roboto 500 12px 纯白反白，内边距 `0 6px`，高度 18px，与标题保持 8px 间隙。
   - **列表行间距与分割线消除**：
     - 消除 `views.less` 中遗留的 `border-bottom: 1px solid #f2f3f5` 底边线条，按设计稿采用纯净的 `gap: 16px` 垂直留白，行高 `22px`；
     - 标题采用 `14px 400 #1D2129`，悬停时平滑过渡为主色调蓝 `#1E72F0`，移除原生按钮点击黑边框（`outline: none !important;`）。
   - **卡头右上角“更多”链接颜色修正**：
     - 在 `HomeWidget.vue` 中将右上角 `更多 ›` 按钮字体设为 `13px`，颜色修正为设计稿的灰字 `#83899F`（`fill_GWVUSZ`），悬停时过渡为 `#1E72F0`。
   - **数据量与未读状态适配**：
     - `apiAnnouncements.ts` 查询条数调整为与设计稿一致的 5 条（`pageSize: 5`）；仅第 1 条（`index === 0`）标记 `isNew: true`，其余项不显示标签。

2. **验证结果**：
   - 执行 `node runtime-ui/modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：57 个 Vue SFC 编译全部通过，0 错误，0 相对导入缺失。

## 概览组件卡片圆角严格对齐资源中心（6px）

1. **统一卡片容器圆角**：
   - 资源中心外壳卡片 `ResourceWidget.vue` 采用 `border-radius: 6px;`。
   - 概览通用卡片壳 `HomeWidget.vue`（承载快捷操作、应用中心、运维监控、系统公告、配额等）的 `.project-home-shell` 圆角由原 `10px` 统一对齐为 `6px`。
   - 概览资源中心 4 个子卡片（`DeviceAccessCard.vue`、`VisualizationCard.vue`、`AiCenterCard.vue`、`RuleEngineCard.vue`）的 `.resource-card` 圆角由原 `8px` 统一对齐为 `6px`。
   - 概览快速上手组件（`ProjectHomeQuickGuide.vue`、`QuickGuide/components/HomeView.vue`）的卡片圆角由原 `12px` / `8px` 统一对齐为 `6px`。

2. **验证结果**：
   - 执行 `node runtime-ui/modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：57 个 Vue SFC 编译全部通过，0 错误，0 相对导入缺失。

## 资源中心彻底拆分为 4 个独立看板组件

1. **改造背景**：
   - 此前概览页将“设备与接入”、“大屏可视化”、“AI中心”、“规则引擎”4 张卡片硬编码在 `ProjectHomeResources` 复合组件内，在画布中仅表现为单一的 `w: 8, h: 20` 网格项，右下角只有一个拖拽/缩放手柄，无法单独移动或自由排布。

2. **独立组件落地**：
   - 彻底拆分为 4 个标准 DashBoardCanvas 看板组件（均置于 `visDashboard/Base/` 下）：
     - `DeviceAccess`（设备与接入，`w: 3, h: 10`）：展示物联设备、视频通道、边缘节点（私有化包含采集器与物联网卡）。
     - `Visualization`（大屏可视化，`w: 5, h: 10`）：左列展示素材库（图片、组件、模型），右列展示大屏（数据大屏、大屏模板）。
     - `AiCenter`（AI中心，`w: 4, h: 10`）：展示智能体、启用算法、覆盖通道。
     - `RuleEngine`（规则引擎，`w: 4, h: 10`）：展示场景联动。
   - 各组件外壳均使用通用的 `HomeWidget.vue`（统一 6px 圆角、标题、加载/错误/轮询态），内部使用共享的 `ResourceItem.vue` 统一呈现各指标项。
   - `shared/api.ts` 支持各 feature 独立提取对应的资源行；`useOverviewDashboard.ts` 显式注册 4 个组件至 `fullCatalog`，解决动态 discovery 在 Vite dev server 未重启时无法识别新增目录的问题；布局重构为第二排（DeviceAccess 3列 + Visualization 5列）、第三排（AiCenter 4列 + RuleEngine 4列），画布 storageKey 升版至 `project-overview-v9`。

3. **验证结果**：
   - 执行 `node runtime-ui/modules/authentication-manager-ui/scripts/verify-overview-components.cjs`：63 个 Vue SFC 检查通过，0 错误，0 缺失。
   - 4 项自动化验证脚本全部 PASS。

## 私有化环境补充「采集器与物联网卡」独立看板组件并优化网格排列

1. **背景与诉求**：
   - 用户切换私有化环境预览概览页时，发现缺少原设计中的「采集器与物联网卡」卡片，并要求加回并合理排布。
   - 私有化环境资源能力比 SaaS 多出「数据采集器」、「物联网卡」（同时 AI 中心展示「智能体」）。

2. **独立组件建设（`visDashboard/Base/Collection/`）**：
   - 新建 `ProjectHomeCollection` 独立 DashBoardCanvas 看板组件：
     - `config.ts`：组件类型定义 `projectHomeCollection`，默认网格尺寸 `w: 3, h: 10, minW: 2, minH: 6`。
     - `ProjectHomeCollection.vue`：使用通用 `HomeWidget`（6px 圆角外壳）及 `ResourceItem.vue` 渲染「数据采集器」与「物联网卡」。
     - `index.ts`：异步组件暴露与配置导出。
   - 数据链路解耦：
     - `visDashboard/Base/shared/types.ts`：扩充 `HomeFeature` 类型支持 `'Collection'`。
     - `visDashboard/Base/shared/api.ts`：`DeviceAccess` 仅筛选 `subgroup !== 'collection'`（物联设备、视频通道、边缘节点），`Collection` 筛选 `subgroup === 'collection'`（数据采集器、物联网卡）。
     - `locales/`：补充中英文多语言键 `packages.ProjectHome.Collection`（"采集器与物联网卡" / "Collector & IoT Cards"）。

3. **私有化 9 卡网格合理排布**：
   - 排版结构（12 列栅格自适应对齐）：
     - **第一排（h: 7）**：
       - `QuickActions`（快捷操作，`x: 0, y: 0, w: 8`）
       - `Applications`（应用中心，`x: 8, y: 0, w: 4`）
     - **第二排（h: 10）**：
       - `DeviceAccess`（设备与接入，`x: 0, y: 7, w: 3`）
       - `Visualization`（大屏可视化双列，`x: 3, y: 7, w: 5`）
       - `Operations`（运维监控，`x: 8, y: 7, w: 4`）
     - **第三排（h: 10）**：
       - `Collection`（采集器与物联网卡，`x: 0, y: 17, w: 3`，与上方的设备接入严格左对齐并同宽）
       - `AiCenter`（AI中心，`x: 3, y: 17, w: 3`）
       - `RuleEngine`（规则引擎，`x: 6, y: 17, w: 2`，AiCenter + RuleEngine 合计 5 列，与上方的大屏可视化严格对齐）
       - `Announcements`（系统公告，`x: 8, y: 17, w: 4`，与上方的运维监控严格左对齐并同宽）
   - **动态 Discovery 兜底与存储键升版**：
     - 在 `useOverviewDashboard.ts` 的 `fullCatalog` 中显式注册 `projectHomeCollection`。
     - 将 `projectHomeRuleEngine` 的 `minW` 从 3 调整为 2，避免网格引擎强制扩张引发公告列下挤换行。
     - 将 `views/project/Overview/index.vue` 中的 `storage-key` 升级为 `project-overview-v11`，确保浏览器自动加载全新 9 卡排列，不受旧版缓存干扰。

4. **验证结果与交付记录**：
   - `node scripts/verify-overview-components.cjs`：63 个 Vue SFC 解析与编译通过，0 错误，0 相对导入缺失。
   - `node scripts/verify-announcements.cjs`：通过。
   - `node scripts/verify-quick-alarms.cjs && node scripts/verify-resource-dashboard.cjs`：全部通过。
   - **Git Commit**：`0b2087c`
   - **Pull Request**：`https://github.com/jetlinks-v2/authentication-manager-ui/pull/66`
