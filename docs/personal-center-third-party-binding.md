# 个人中心第三方账号绑定

## 目标

由 `authentication-manager-ui` 提供可复用的微信、钉钉账号绑定组件。在 SaaS 运行时个人中心的“注册时间”上方展示“绑定微信”和“绑定钉钉”两行；未来 `ui` 下的个人中心通过同一公开组件接入，不复制或迁移绑定逻辑。

用户主动绑定后，第三方身份关联到当前平台账号；后续使用同一微信或钉钉登录时直接进入该账号。未绑定用户从登录页发起第三方登录时，继续由对应第三方登录配置的 `autoCreateUser` 决定是否自动创建平台账号并建立绑定。

## 模块边界

- 能力 owner：`authentication-manager-ui`，负责绑定状态、provider 聚合、授权编排、绑定弹层和相关 i18n。
- 后端：复用 `authentication-manager` 现有绑定、回调、自动创建用户和绑定查询接口。补齐主动绑定模式的登录会话与归属校验，以及回调不切换登录态的处理，不新增接口或表结构。
- 当前宿主：`saas-runtime-ui/views/PersonCenter/components/AccountInfo.vue` 只增加一个公共组件挂载点。
- 后续宿主：`ui/modules/project-side-ui/views/PersonCenter/components/AccountInfo.vue` 更新认证模块子仓库指针后，增加同样的挂载点即可。
- 公共出口：通过 `authentication-manager-ui/register.ts` 注册 `ThirdPartyAccountBindingRows`，由宿主通过 `moduleRegistry` 消费。

`ui/modules/authentication-manager-ui` 与 `runtime-ui/modules/authentication-manager-ui` 是两个宿主分别检出的同一个 Git 子模块仓库，因此组件实现只维护一份。

## 现有能力

- 绑定状态：`GET /application/sso/me/bindings`。
- 主动绑定：`GET /application/sso/{appId}/login/_async?forBind=true&autoCreateUser=false`，后端为当前登录用户生成签名绑定令牌。微信展示二维码（支持公众号关注扫码和网页授权），钉钉展示授权 iframe；授权结果经 NDJSON 流送回发起页。
- 主动绑定要求已有登录会话；第三方身份已属于另一个平台账号时返回业务错误。成功与失败的绑定回调均返回 HTTP 204，避免授权 iframe 跳转到设置 token 的页面而覆盖当前登录态。
- 普通第三方登录：已绑定时直接签发对应平台用户令牌；未绑定时，仅在应用配置启用 `autoCreateUser` 且请求未显式禁用时创建用户并写入绑定。
- 微信 provider：`wechat-official-account`；钉钉 provider：`dingtalk-ent-app`。
- 正常登录中未绑定且关闭自动创建的回调，继续使用 core 的既有绑定页。

## 推荐交互

1. 两行固定展示；没有对应登录配置时显示“未配置”，不提供绑定操作。
2. 单个配置显示“已绑定”或“未绑定”；未绑定时点击操作入口打开第三方授权弹窗。成功事件到达后重新获取当前账号的绑定记录，核实后才提示成功。组件不存储或消费登录 token。
3. 同一类型存在多个配置时不默认选择第一条：汇总显示“已绑定 n/m”，点击后在轻量选择层中展示应用名称及各自绑定状态，再对选中的应用发起绑定。
4. 本次只新增绑定入口和状态展示，不新增解绑或换绑入口。
5. 查询失败显示重试入口，不混同于“未配置”。授权失败或超时显示可重试反馈；关闭弹窗、切换应用和卸载组件时取消流订阅，迟到事件不影响新一轮授权。

## 实施步骤

1. 在 `authentication-manager-ui` 增加明确类型的绑定 API、provider 聚合模型和相关测试。
2. 新增 `ThirdPartyAccountBindingRows` 展示组件，状态查询、授权流订阅和刷新由相邻 `useAccountBinding.ts` 承载。
3. 在 `register.ts` 的 `components` 中异步公开该组件，保持 `authentication-manager-ui -> jetlinks-web-core` 的依赖方向。
4. 在当前 SaaS `AccountInfo.vue` 的注册时间前通过 `moduleRegistry.getResourceItem` 与动态组件挂载，保留 `dl` 中的两行结构。认证模块缺失时不渲染该组件。
5. 在认证模块中补充中英文语义化文案，不向宿主复制文案。
6. 本次不修改 `ui/modules/project-side-ui`；后续只增加相同宿主挂载点并更新认证模块子仓库指针。

## 不做范围

- 不迁移或合并两套个人中心页面；它们仍分别归属各自宿主模块。
- 不修改正常登录页和第三方登录配置页。
- 不新增第三方账号解绑、换绑或管理页面。
- 不兼容旧 `wechat-webapp` provider，除非现网数据确认仍需承载该旧配置。
- 不顺手清理当前工作区其他未提交修改。

## 已知风险

1. 本次主动绑定拒绝已属于他人的第三方身份；通用旧绑定接口与数据库没有全局唯一约束，存量重复记录和并发绑定的一致性治理仍未涉及。
2. 宿主依赖认证模块在启动时完成注册；当前两套宿主均已按现有模块加载流程执行 `register()`。
3. 后端局部绑定保护沿用已有 HTTP / SQL 链路追踪；不新增常驻状态、缓存或 MBean。

## 宿主接入

在宿主 `script setup` 中获取认证模块的公开组件：

```ts
import type { Component } from 'vue'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'

const ThirdPartyAccountBindingRows = moduleRegistry.getResourceItem<Component>(
  'authentication-manager-ui', 'components', 'ThirdPartyAccountBindingRows',
)
```

在账号信息的 `dl` 内、注册时间之前挂载：

```vue
<component :is="ThirdPartyAccountBindingRows" v-if="ThirdPartyAccountBindingRows" />
```

组件使用当前登录用户，请求、文案和授权状态均由认证模块维护，无需宿主传参。

## 验证

- 绑定行为测试：`node --test tests/accountBinding.test.mjs`，8 项通过。覆盖聚合、多应用选择、绑定请求参数、成功后核实持久化、失败与超时重试、取消订阅和迟到结果。
- 第三方登录回归：`node --test tests/thirdPartyLoginModel.test.mjs tests/thirdPartyLoginMenu.test.mjs`，14 项通过。
- 后端：`mvn -o -DskipTests=false -Dmaven.test.skip=false -Dtest=ApplicationSsoBindingTest,ApplicationSsoServicePublicApplicationTest,ApplicationSsoLoginInterceptorTest test -q`，20 项通过。验证身份归属、绑定回调不跳转、普通登录保持跳转，以及真实自动开户/首次绑定处理链；关键流程覆盖微信、钉钉两种 provider。
- 认证模块构建：`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui`，通过。
- 宿主联合构建：`pnpm -F jetlinks-web-core build -- --module-name authentication-manager-ui,saas-runtime-ui`，被既有设备模板错误阻断：`saas-runtime-ui/views/device/Template/Save/index.vue` 引用了 `device-manager-ui/assets` 未导出的 `device`。本次未修改该链路。
- 类型检查：认证模块和 SaaS 模块的定向 `vue-tsc` 均存在既有错误；本次新增绑定文件和宿主 `AccountInfo.vue` 未报告诊断。
- 待真实联调：微信、钉钉扫码授权、绑定后直接登录，以及未绑定时 `autoCreateUser=true/false` 两条分支。前端行为测试使用请求与生命周期替身，未完成浏览器视觉验收。

第三方真实扫码需要已配置的微信/钉钉应用及可访问的回调地址；本地测试不能代替外部平台授权联调。
