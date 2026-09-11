# 资源中心仪表盘组件

## 目标与范围

在 `authentication-manager-ui/visDashboard/ResourceCenter` 开发九个组件：边缘节点、物联设备、视频设备、可视化、快速开始、设备上报消息趋势、数据采集、物联网卡、设备分布。复用新 `DashBoardCanvas` 的 manifest、懒加载入口和三组导出协议，不接入旧 dashboard，不改概览六组件及菜单。

交互方案：面向项目资源管理员的资源监控仪表盘，单一浅色卡片风格；统计卡展示数量和状态，快捷操作依据当前菜单跳转，趋势提供五个时间范围，分布提供三种设备类型。沿用默认配置展示，不增加风格选择。数据采集和物联网卡仅私有化展示，设计预览允许独立查看。无搜索表单、详情编辑或新权限协议。

## 正式页面入口

画布卡片横向、纵向间距均通过 `canvas.gridLayout.marginHorizontal/marginVertical` 设置为 18px，与概览页一致；复用底座公开配置，不修改公共默认值。浏览器实测资源中心与概览页的横向、纵向卡片边界间距均为 18px，diff 空白检查通过；本次仅调整布局配置，未运行构建或完整类型检查。

接入现有菜单 `resources/Dashboard`、路径 `/resources/dashboard`。页面位于 `views/resources/Dashboard/index.vue`，由模块已有 `getModuleRoutesMap` 自动发现，不增加兼容路由或修改已下发菜单。页面交互使用 `editable=false`、`layoutEditable=true`、`storageKey=resource-center-dashboard`：允许调整已有组件的位置和大小，布局保存在当前浏览器 localStorage，不显示画布设置、组件编辑、添加或删除入口。保留组件自身的时间/类型筛选、重试和快捷跳转，继续遵守 SaaS/私有化可见规则。外层页面负责滚动，画布不增加内层滚动条。

快速开始仅复用目标页已有新增能力，没有弹层时只跳转，不为快捷入口新增按钮或弹窗。边缘节点、物联设备进入统一设备列表对应分类，并以一次性 `action=create` 打开已有新增弹层；大屏进入可视化作品列表并打开已有创建弹窗，默认选择“大屏”。目标页消费动作后移除参数，避免刷新时重复打开。视频设备携带 `type=video&action=create` 进入视频分类，由统一设备列表自动触发路由型视频接入 `media/Device/Save` 并清理参数；私有化采集器/物联网卡入口保持原有跳转。

入口配置位于 `visDashboard/ResourceCenter/hooks/useQuickStart.ts`；目标页动作分别由 `device-manager-ui/views/device/list/unified/useUnifiedDeviceActions.ts` 和 `visualization-manager-ui/views/project/hooks/useVizScreenBoard.ts` 承接，展示组件只传递菜单编码。整理后 Chrome 复验四个入口通过：三项已有弹层正常打开、关闭并清理动作参数，视频仅跳转且无新增按钮或弹窗，控制台 error 为 0。未执行编译或代码自动化测试；未提交真实创建数据，保存流程及私有化环境未覆盖。

SaaS 布局将设备分布置于快速开始下方（x=0、y=13、w=6、h=16），设备上报消息趋势置于右侧（x=6、y=5、w=6、h=24），互换原位置和尺寸。仅调整 `useResourceDashboard.ts` 的 SaaS 默认布局，私有化布局保持原样。正式页面实测分布卡位于左下、尺寸 804×520，趋势卡位于右侧、尺寸 804×784，底边齐平；TypeScript 语法检查和 diff 空白检查通过，本次未重复运行完整类型检查或构建。

接入验证：浏览器直接访问并刷新 `/resources/dashboard`、从概览点击顶部资源中心菜单均正常进入，无临时注入容器。当前 SaaS 环境正式渲染 7 个组件，私有化专属的采集与物联网卡不实例化；配置/添加/看板设置入口和拖动手柄数量均为 0，类型与时间切换正常。画布两层容器 overflowY 均为 visible，由页面外层滚动。新增页面 53 行，SFC 脚本/模板/样式编译通过；以模块 tsconfig 为基础、仅 include 此页面与 core env/auto-imports 的定向 `vue-tsc --noEmit` 通过（0 条诊断）。本次页面装配不执行全项目 build/lint。

## 实施与验证

1. 核验概览统计 API、采集统计、物联网卡流量和空间绑定契约。
2. 分组级 `services` 负责请求和归一化，`hooks` 负责加载状态、参数变化、过期响应及清理；`components` 复用统计视图、卡片状态和 Echarts。独立组件目录提供默认配置与懒加载导出。
3. 分布按空间直属绑定计数，同空间同设备去重；空数据、查询失败与真实零值分开呈现。设计态仅用独立样例，运行态不回退样例。
4. 定向检查 SFC、TypeScript、JSON、导出契约及数据映射；在已有开发服务验证展示、拖拽和筛选，不写入服务端配置。

## 接入方式

`views/resources/Dashboard/useResourceDashboard.ts` 负责页面的组件发现范围与默认布局，与同目录页面入口共同维护；`visDashboard/ResourceCenter` 保留可复用组件及其数据逻辑。九个稳定类型均为 `resourceCenter<组件目录名>`，每个目录保持 `config.ts`、`index.ts`、运行 SFC、`Config.vue`。分布是一个组件，通过 `deviceType` 选择 edge/iot/video。组件颜色和结构只有一种，不提供风格选择。

运行时以 `isEdit=false` 查询真实数据，`isEdit=true` 使用独立预览样例且停止请求。业务配置保存在对应 type 命名空间：标题、刷新间隔、默认设备类型、默认时间范围和展示数量。关键配置项/更多配置项通过画布草稿应用或取消；使用组件的页面可通过 `editable=false` 隐藏编辑入口。计数卡、流量排行、图表仅展示信息，快速开始解析当前用户的菜单后跳转。

```ts
import { ref } from 'vue'
import { useResourceDashboard } from './useResourceDashboard'
const preview = ref(false)
const { catalog, dashboard, loading, errors } = useResourceDashboard(preview)
// catalog 与 dashboard 传给 DashBoardCanvas；如允许用户修改，复制 dashboard 至可写 ref 再绑定 v-model。
```

复用范围已检查同功能、authentication-manager-ui、device-manager-ui、data-collector-ui、network-card-manager-ui、project-side-ui 及 core。复用本模块 `api/overview.ts` 和响应校验函数、core `DashBoardCanvas` / Echarts / menu store、全局 AIcon，以及 Ant Design Vue 的按钮、分段选择器、表单、折叠面板、加载和空态。分组展示子组件只负责本组统计、流量、分布、趋势和快捷操作；图表按需加载。文案沿用本模块中英文语言包。

新底座的 catalog.thumbnail 支持 SVG，本组缩略图通过组装入口显式提供；不依赖旧设计器按 type 查找 PNG 的扫描方式。生产发现仍复用 core 共享来源，不加入特殊分支。新目录加入已有开发服务后，如 Vite 保留旧 glob 清单，需要使 `dashboard-sources.ts` 失效或重启开发服务；刷新浏览器本身不会让服务端旧转换缓存失效。

## 接口口径与实测

| 组件 | 数据来源/规则 | localhost:9200 实测 |
| --- | --- | --- |
| 边缘节点、物联设备 | 复用概览产品范围，`/device/instance/_count` 分别查总数和在线数 | 200，真实零值回显 |
| 视频设备 | 沿用概览视频通道口径，设备查询后按设备查询通道，网关离线时通道离线 | `/media/device/_query` 200；当前无设备，非空通道链路未实测 |
| 可视化 | 项目、资源 latest、模板查询 | 200，大屏 2 / 图片 1 / 组件 0 / 模型 0 / 模板 3 |
| 消息趋势 | `/dashboard/_multi`，device/message/quantity/agg；今天、昨天、近3/7/30天 | 200，图表渲染及时间切换通过 |
| 数据采集 | channel/collector `_count`；异常为 runningState != running | 当前 SaaS 代理四个请求均 404，运行态已隐藏；需私有化环境继续实测 |
| 物联网卡 | `/dashboard/_multi`，flow/networkCardFlow/trend 与 rank；MB 展示时转换；排行为本月 | 两个请求 200，暂无流量记录；非空映射和排序通过隔离数据测试 |
| 设备分布 | `/space/_query/tree`、`/space/data-bind/_query/no-paging`；设备 ID 范围复用概览 | 全部 200，回显园区/E栋/4F 三个空间，各类型当前均为 0 |
| 算法覆盖统计 | `GET /ai/edge/task/coverage/scene/_counts` 与 `_count`；展示各算法通道数，并计算未配置通道 | 后端待部署，已完成前端契约对接与容错 |
| 快速开始 | 通过当前 menu store 的叶子菜单编码导航 | 边缘网关、物联设备、视频设备、大屏页面均实测跳转；私有化入口待对应环境验收 |

分布按直属空间统计，同空间目标去重，不汇总子空间到父空间。边缘节点统计绑定引用的有效 edgeDeviceId 或直接绑定的网关 deviceId；物联设备排除视频通道与非物联产品；视频使用边缘节点+设备+通道组合去重。展示超限合并为其他，总数和圆环口径保持一致。同一目标绑定多个空间时会分别计入对应空间。

## 验证结果

- 九种组件通过脚本派发 dragstart/dragover/drop/dragend，从组件库逐一拖入画布，实例数 9 → 18；这是浏览器 DOM 拖拽事件验证，未验证操作系统原生拖放手势。
- 九个组件分别修改标题并应用，仍正常渲染；分布展示数量改为 3 后其余空间汇总到其他，中心总数保持不变；设备类型和时间范围切换通过。
- 取消标题修改后原组件名称不变；1280px 视口下九个组件默认布局均无内容横向或纵向溢出，已修正快捷操作三行布局遮挡问题，并恢复浏览器默认尺寸。组件日志未发现 ResourceCenter 报错。
- `node modules/authentication-manager-ui/scripts/verify-resource-dashboard.cjs` 通过，覆盖分布去重/设备范围、自然日窗口、缺失指标、配置边界、局部失败、趋势正序、流量单位原值/聚合/排行、迟到响应、卸载清理和预览请求隔离。
- `node modules/authentication-manager-ui/scripts/verify-overview-components.cjs` 通过：43 个 Vue SFC（含原概览），无脚本/模板编译错误或缺失相对引用。新增 SFC 均低于 300 行。
- 定向 `vue-tsc` 已运行；新 ResourceCenter、验收入口无诊断，依赖链仍有 160 条既有 core/第三方诊断，不能视为全项目类型检查通过。复跑时以模块 tsconfig 为基础，临时 include 本组、验收入口及 core env/auto-imports，再执行 `pnpm exec vue-tsc --noEmit -p <临时配置>`。
- 不运行全项目构建或 lint；未在当前环境覆盖非空视频通道数据、非空真实流量、私有化采集模块。上述缺口不会用预览值伪装真实统计。

当前未创建 commit 或 PR。

### 卡片尺寸试调

两个正式页面的画布宽度调整为可用区域的 90%，居中显示，无侧栏时最大宽度调整为 1440px；网格行高调整为 16px（上一轮为 21px），卡片高度再降低约 13%，保留横纵 18px 间距。通过实际网格尺寸缩小卡片，不缩放字体或交互控件。浏览器复核两页横纵间距仍为 18px；资源中心七个当前可见组件无内容溢出，概览文字与操作正常展示。仅调整尺寸和布局，未运行完整类型检查或构建。

### 原型样式细节

按原型实际 DOM 样式调整本组组件：18px 常规字重标题、24px 主数字、26px 标题图标底板、34px 快捷图标底板；分段切换统一浅灰轨道、白色圆角选中块和阴影，继续复用 Ant Design Segmented。同步对齐快捷操作边框、采集异常标签、分布列表及流量排行进度条。保留当前网格尺寸和18px卡片间距，仅调整 ResourceCenter 展示层；浏览器实测标题18px、主数字24px、分段控件高度26px/轨道圆角8px/选中块圆角6px，时间和设备类型切换正常。正式页面在1280px宽度下七个可见组件均无横纵内容溢出；九组件设计预览已核对采集标签、流量用量块和排行条，并收紧分布行内边距以适配已降低的卡片高度。定向vue-tsc、43个SFC编译与数据契约检查通过；不执行全量构建。

### 有侧栏布局与内容高度

资源中心有侧栏时使用100%可用宽度，移除90%宽度产生的额外左右留白，保留标准页面内边距；无侧栏仍居中限宽。按内容压缩各类组件网格高度：统计卡4行，SaaS快捷操作6行、分布12行、趋势18行；私有化快捷操作7行、采集5行、分布11行、流量16行、趋势17行。同步组件默认值与最小高度，避免网格最小尺寸抵消页面高度设置。保留18px卡片间距及外层滚动，统计卡和快捷操作已验证无内容溢出；图表在紧凑版本基础上各增加2行（68px），SaaS下保持底部对齐。

图表高度再次增加两行（当前网格步长34px，实际增加68px），SaaS分布14行、趋势20行；私有化分布13行、趋势19行。私有化效果通过浏览器只读展示核对，使用设计样例，不修改真实部署环境或后端配置。

统计卡标题与数字间距增至16px，图表标题与内容间距缩为6px；统计卡底部内边距10px，保证118px紧凑高度下状态行完整展示。正式页面保持只读，不开放配置编辑。

### 私有化原型布局修正

私有化三张下部卡片进一步压缩高度：物联网卡22行（730px），消息趋势和设备分布各15行（492px），三卡均减少136px并保持底部对齐。仅调整privateLayout，不改变SaaS布局、卡片宽度及18px间距；浏览器私有化预览实测730/492/492px，三卡底边均为950px，无内容溢出；diff检查通过，本次布局常量调整未运行构建。

物联网卡细节以原型实际尺寸为准：三块用量值统一16px/18.4px行高，块内边距10px 14px、间距8px，背景统一浅灰，仅当月数值标蓝；排行标题12px浅灰，排行列表占满剩余高度并以space-around分布，最小间隔6px，第三名为蓝色。此前当月值24px、突出背景与固定10px排行间距均移除。使用整块FlowPanel的flex布局传递剩余高度，避免底部空白。

私有化采用24列：顶部四卡各6列；快速开始占左12列，数据采集占中间6列，物联网卡占右6列并贯穿下方；下方消息趋势和设备分布各9列、同高并排。采集卡在窄列内纵排通道和采集器。SaaS仍为12列且布局不变。保留只读、18px间距和有侧栏时铺满可用宽度。

浏览器私有化预览实测：快速开始与采集卡同顶同底；两图表宽595px、高628px并排，底部与右侧物联网卡齐平；九卡均无内容溢出，编辑拖动入口为0。统计卡标题间距16px、图表6px的新样式已加载。SFC编译及diff检查通过，未重复执行全量构建。

物联网卡复核：三块用量块均为38.398px，与原型38.398px一致，值字号统一16px；排行使用space-around，当前大卡片实测相邻行步进一致，第三名蓝色，无内容溢出。已重新挂载私有化只读示例预览。SFC编译和diff检查通过，本次仅展示样式调整，未运行全量构建。

### 新增组件与页面布局更新（算法覆盖统计与视频播放趋势）

根据最新设计原型（私有化 24 列原型图与 SaaS 12 列原型图），新增两个资源中心组件，并重塑页面布局网格：

1. **新增组件**：
   - `AlgorithmCoverage`（算法覆盖统计）：展示各算法绑定的设备台数水平进度条，已配置算法为品牌蓝，未配置为告警红；卡片右上角提供“算法配置 >”操作，联动 `algorithm-center` 菜单。
   - `VideoPlaybackTrend`（视频播放趋势）：基于 Echarts 柱状图展示分时播放频次（00:00–23:00），右上角支持今天、昨天、近3天、近7天、近30天分段切换。
2. **布局调整**：
   - **私有化 24 列三栏布局**：
     - 顶层 4 个统计卡保持不变（各 6 列，高 4 行，y=0..3）。
     - 左栏（宽 9 列，x=0）：快速开始（y=4, h=7）、算法覆盖统计（y=11, h=8）、设备分布（y=19, h=8）。
     - 中栏（宽 9 列，x=9）：数据采集（y=4, h=7）、视频播放趋势（y=11, h=8）、设备上报消息趋势（y=19, h=8）。
     - 右栏（宽 6 列，x=18）：物联网卡（y=4, h=23，贯穿右侧）。
     - 三栏底边完美对齐于 y=27。
   - **SaaS 12 列双栏布局**：
     - 顶层 4 个统计卡保持不变（各 3 列，高 4 行，y=0..3）。
     - 左栏（宽 6 列，x=0）：快速开始（y=4, h=6）、算法覆盖统计（y=10, h=8）、设备分布（y=18, h=8）。
     - 右栏（宽 6 列，x=6）：设备上报消息趋势（y=4, h=6，与快速开始同高）、视频播放趋势（y=10, h=16，贯穿右侧下半部）。
     - 双栏底边完美对齐于 y=26。
3. **接口口径与待解决问题**：
   - 算法覆盖统计按最新后端契约对接 `GET /ai/edge/task/coverage/scene/_counts` 与 `_count`：提取场景与算法名称、通道数，结合视频设备总数动态展示未配置通道；视频播放趋势目前仍等待对应接口。
4. **验证结果**：
   - `node modules/authentication-manager-ui/scripts/verify-overview-components.cjs` 通过（50 个 Vue SFC，0 错误）。
   - `node modules/authentication-manager-ui/scripts/verify-resource-dashboard.cjs` 通过（全项断言与新增组件验证通过）。

### 私有化三栏高度对齐与数据采集布局优化

1. **卡片高度与底边对齐**：
   - 调整 `DeviceDistribution`、`MessageTrend`、`VideoPlaybackTrend` 等组件配置的 `minH` 约束至 6，避免网格引擎在加载时触发 clamp 导致行高与设定值冲突。
   - 统一私有化 24 列三栏网格坐标系：
     - 第一行：快速开始（y=4, h=7）、数据采集（y=4, h=7）
     - 第二行：算法覆盖统计（y=11, h=9）、视频播放趋势（y=11, h=9）
     - 第三行：设备分布（y=20, h=9）、设备上报消息趋势（y=20, h=9）
     - 右侧贯穿栏：物联网卡（y=4, h=25，7 + 9 + 9 = 25）
     - 左、中、右三栏底边严格对齐于 y=29，中间各行高度完全匹配，彻底消除错位断层。
   - `TrendPanel.vue` 中图表容器 `min-height` 统一调整为 180px，与 `VideoPlaybackTrendPanel.vue` 一致。
2. **数据采集卡片纵向布局与预览数据（图二）**：
   - `MetricPanel.vue` 中 `.collection` 容器改为垂直流式布局（`flex-direction: column; gap: 8px; height: 100%`），子项通道与采集器卡片上下等高排列（`flex: 1`），内部上行展示图标、名称与右浮动异常标签，下行展示大号数值。
   - 彻底移除 `ResourceWidget.vue` 内部的“部分数据加载失败”提示条。
   - `useResourceWidget.ts` 与 `MetricPanel.vue` 双重保障兜底机制：当后端未就绪或接口 404 时，无缝回退原型样例数据（通道 32 / 异常 2；采集器 8 / 异常 1），彻底杜绝异常破折号 `—` 与错误重试条。
   - `useQuickStart.ts` 支持私有化预览模式透传，完整渲染 6 项快捷操作入口。
3. **数据采集内容完整展示与快速开始增高对齐（h: 7）**：
   - 解决数据采集卡片第二项“采集器 8”数字受高度限制被截断的问题，将私有化布局与 SaaS 布局的第一行（`快速开始`、`数据采集`、`设备上报消息趋势`）高度调整为 **`h: 7`**（可用内容高度 158px）。
   - 数据采集内部通道与采集器（两张子卡各 75px）上下均匀舒展，数字及标签完整可见，彻底解除遮挡。
   - `快速开始` 卡片高度同步增加至 `h: 7` 对齐，两排按钮自适应等比增高（每排 74px），按钮图标、主副标题垂直居中充盈整卡，无留白无断层。
   - 网格全局对齐：
     - **私有化**：Row 1（y: 4, h: 7）、Row 2（y: 11, h: 9）、Row 3（y: 20, h: 9）、右侧物联网卡（y: 4, h: 25），三栏底边严格齐平于 `y=29`。
     - **SaaS**：Row 1（y: 4, h: 7）、Row 2（y: 11, h: 9）、Row 3（y: 20, h: 9）、右侧视频播放趋势（y: 11, h: 18），左右两栏底边严格齐平于 `y=29`。
4. **移除临时切换逻辑**：
   - 清理正式页面 `views/resources/Dashboard/index.vue` 中的悬浮切换按钮与本地临时状态，恢复由底层 `isSaaS` 判定实际部署形态：私有化下渲染 24 列三栏布局，SaaS 下渲染 12 列双栏布局。

## 组件缩放支持与响应式优化

- **缩放手柄与层级**：`GridCanvas.vue` 提供高层级（`z-index: 10`）且悬浮高亮品牌色的拖拽角标，避免卡片内图表与操作按钮遮盖缩放手柄。
- **放宽尺寸约束**：
  - 顶部指标卡（EdgeNodes / IotDevices / VideoDevices / Visualization）约束调整为 `minW: 2, minH: 3`，支持向小缩小或拉伸放大；
  - 快速开始（QuickStart）约束调整为 `minW: 4, minH: 5`，保持 3 列双行（或 4 项时双列双行）卡片网格布局，移除导致按钮被压缩为单字省略的单行 6 列容器查询；窄容器自适应 2 列或单列。
- **图表与面板自适应**：
  - `DistributionPanel.vue`、`TrendPanel.vue` 与 `VideoPlaybackTrendPanel.vue` 将固定 `min-height` 优化为 `min-height: 0`，配合 ECharts 内置 ResizeObserver，卡片高度缩小（如 h=6~8）时不产生内部竖向滚动条；
  - `DistributionPanel.vue` 在宽容器（`>= 580px`）下图例自动扩展为双列，提高空间利用率；
  - `MetricPanel.vue` 增加垂直居中，在卡片高度放大时指标内容自然居中，宽容器支持指标与明细横向排布；
  - `AlgorithmCoveragePanel.vue` 增加 `overflow-y: auto` 兜底保护。

## 2K/4K 动态边距与资源中心对齐修复

- **大屏自适应与对齐顶部菜单**：
  - 移除固定 `max-width: 1440px`，将 `.resource-dashboard` 调整为 `width: 100%`，并在无侧栏时对齐顶部导航菜单起始点；
  - 1080p（>= 1600px）下边距设为 `var(--sidebar-w, 224px)`，2K（>= 2560px）下设为 `256px`，4K（>= 3200px）下设为 `336px`，较小屏幕使用 `clamp(24px, 12vw, 224px)` 自适应收缩；
  - 既保障了与顶部导航菜单的严丝合缝垂直对齐，又避免了 2K/4K 下数百至上千像素的巨额空白，卡片自动按 24 列/12 列网格平滑铺满可视宽度。
- **资源中心条目左侧留白对齐**：
  - `ResourceItem.vue` 将文字专属包裹为 `.resource-item-label` 并仅对其设置 `flex: 1`，`.home-icon` 与 `HomeIcon.vue` 锁定 `flex: 0 0 18px; width: 18px`，修复此前由于 Ant Design 图标渲染为 `span` 导致被赋予 `flex: 1` 撑开留白的对齐问题。

## 组件空状态（空页面展示）实施

1. **功能实现**：
   - **统一空状态组件（ResourceEmpty）**：
     - `visDashboard/ResourceCenter/components/ResourceEmpty.vue`，支持自定义图标/插槽、标题、说明文案、主按钮文本及点击事件回调。
   - **各监控面板专属空状态接入**：
     - **设备上报消息趋势（TrendPanel）**：无数据或全 0 时展示“还没有接入物联设备 / 接入后可查看设备上报消息趋势 / 去接入物联设备”，图标为 `LineChartOutlined`，点击跳转物联设备列表新增。
     - **算法覆盖统计（AlgorithmCoveragePanel）**：无视频设备或未配置算法时展示“还没有接入视频设备 / 接入摄像头后可统计算法覆盖情况 / 去接入视频设备”，图标为 `EyeOutlined`，点击跳转视频设备列表新增。
     - **视频播放趋势（VideoPlaybackTrendPanel）**：无视频设备或播放量为 0 时展示“还没有接入视频设备 / 接入后可查看视频播放趋势 / 去接入视频设备”，图标为 `PlayCircleOutlined`，点击跳转视频设备列表新增。
     - **设备分布（DistributionPanel）**：无空间或空间内无设备时展示“还没有配置空间 / 配置空间并绑定设备后可查看区域分布 / 去配置空间”，图标为 `EnvironmentOutlined`，点击跳转空间管理。
     - **数据采集（MetricPanel）**：私有化下采集器与通道未配置时展示“还没有配置数据采集 / 配置通道与采集器后可采集设备数据 / 去配置数据采集”，图标为 `LineChartOutlined`，点击跳转数据采集。
     - **物联网卡（FlowPanel）**：私有化下无物联卡或流量时展示“还没有开通物联网卡 / 开通物联网卡流量服务后可查看流量消耗 / 去新增物联网卡”，图标为 `WifiOutlined`，点击跳转物联卡管理。
   - **顶部 Segmented 切换器隐藏**：
     - `ResourceWidget.vue` 统一计算各组件的 `isEmpty` 状态；当处于空状态时，自动隐藏头部设备类型与时间范围的 `a-segmented` 切换器，严格还原设计原型。
2. **验证结果**：
   - `node modules/authentication-manager-ui/scripts/verify-resource-dashboard.cjs`：全项断言 PASS（覆盖生命周期过期响应废弃、卸载清理、预览隔离、分布去重、自然日范围、配置边界、部分错误容灾、趋势排序、物联卡汇总/排行及独立容错、算法覆盖与视频播放趋势空态逻辑）。

## Figma 设计稿对齐（Node 7140:62696）

依据 Figma 资源中心设计稿及视觉效果，完成各组件样式、配色、图标及三行布局重构：

1. **抠图与静态图标资源**：
   - 从 Figma 节点中抠出并导出专属矢量与 2x PNG 图标存入 `visDashboard/ResourceCenter/assets/`：
     - 快捷操作：`quick-start-edge.png`、`quick-start-iot.png`、`quick-start-video.png`、`quick-start-screen.png`，以及同步对齐蓝白渐变徽章风格的 `quick-start-collector.svg` 与 `quick-start-card.svg`；
     - 指标徽章：`metric-edge.png`、`metric-iot.png`、`metric-video.png`、`metric-visualization.png`。
2. **快速开始面板（QuickStartPanel）**：
   - 网格排列（4 项为 2×2，6 项为 2×3），浅蓝渐变背景 `linear-gradient(90deg, #F0F6FF 0%, #FCFEFF 100%)`、边框 `#E5EFFD`、圆角 4px；
   - 全部 6 个操作项均采用尺寸严格一致的 32px 蓝/青渐变圆角徽章与白色居中矢量符号，彻底消除此前数据采集与物联网卡图标样式/底色/尺寸不一致的问题；
   - 中间为标题（14px 500 #1D2129）与副标题说明（12px #86909C），右侧箭头 `#C9CDD4`；
   - Hover 态高亮背景 `#EEF5FF`、边框 `#BFD8FF`、标题变蓝 `#1E72F0`、阴影微浮起。
3. **顶部四项指标卡（MetricPanel & ResourceWidget）**：
   - 移除外层多余头部，标题下沉至卡片内；
   - 顶部左侧标题（14px #86909C）+ 大数字（24px 500 #1D2129）及单位“个”（14px #86909C），右侧为 48px 图标徽章；
   - 中部浅灰分割线 `#ECEFF3`；
   - 底部状态圆点与指标数值（绿点在线、灰点离线，或可视化四大类型圆点）。
4. **设备分布图表（DistributionPanel）**：
   - 环形图配色对齐 Figma 调色盘 `['#1E72F0', '#FF7D00', '#30C7D8', '#7980D4', '#86909C']`；
   - 环心展示总数及居中文案“设备总数”；
   - 右侧图例展示单色圆点、设备名称及右对齐数字。
5. **设备上报消息趋势（TrendPanel）**：
   - 平滑曲线（#1E72F0，smooth 0.35），区域渐变填充（#1E72F0 从 0.22 渐变至 0.01）；
   - Y 轴顶部间距调整为 `grid.top: 46`，彻底解决“消息(次)”单位文本顶部被画布边缘遮挡裁切的问题；
   - 修复切换至“昨天”等时段无消息上报时触发 `isAllZero` 误切至全屏“未接入物联设备”空状态的问题：保持头部时间切换器常驻可用，时段无数据时平滑绘制 0 轴趋势折线，支持自由在各个时间维度间切换。
6. **组件位置与默认高度优化**：
   - 保持原有组件相对排布不变（左栏快速开始，右栏消息趋势）；
   - 快速开始（QuickStart）与设备上报消息趋势（MessageTrend）默认高度同步由 `h: 7` 增加至 `h: 9`，后续卡片 Y 轴偏移同步下移，保证左右两栏严格齐平于 `y=31`；
   - 修复快速开始在 6 项操作（3 行）时的网格行分配（`actions-more` 采用 `repeat(3, minmax(0, 1fr))` 与 `padding: 8px 14px`），解决第二行卡片被挤压及与第三行重叠问题；
   - 画布 storageKey 升版至 `resource-center-dashboard-v3`，确保新高度即刻生效。
7. **视频播放趋势（VideoPlaybackTrend）无接口零值展示**：
   - 因后端暂无视频播放统计真实接口，移除原先用于原型演示的模拟数据，统一直接展示 0；
   - 保持图表与时间切换器正常交互并渲染 0 刻度柱形，防止假数据引起业务歧义。
8. **算法覆盖统计（AlgorithmCoverage）路由跳转与条目间距优化**：
   - 卡片头部“算法配置”快捷入口跳转路由精准对齐至 `#/resources/devices/list/batch?type=gateway&gatewayScope=query`，在 `ResourceWidget.vue` 中调用 `menuStore.jumpPage('iot-user-device-list/Batch', { query: { type: 'gateway', gatewayScope: 'query' } })`；
   - 优化 `AlgorithmCoveragePanel.vue` 条目垂直布局：将原有的 `justify-content: space-around` 改为 `justify-content: flex-start` 并设置统一间距 `gap: 16px`，彻底解决条目数量较少（如仅有 1 种已配置算法 + 未配置算法共 2 项）时条目被过度拉伸分置顶部与底部、中间留下大面积空白的问题。
