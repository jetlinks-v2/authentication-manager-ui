# Plan Review Log: 第三方登录配置页面（分阶段交付）
Act 1 (grill) complete — plan locked with the user. MAX_ROUNDS=5.

## Round 1 — Codex

老大，计划还不能直接实施。以下问题会影响第一阶段的安全边界和后续联调：

1. [PLAN.md](/Users/lijie/Documents/work/code/project/jetlinks.saas.ai/runtime-ui/modules/authentication-manager-ui/PLAN.md:10) 让管理员填写并编辑 Secret，却只规定“遮蔽”和“不保存真实密钥”；遮蔽不阻止真实凭据进入浏览器内存，计划也未规定如何避免误填。修正：表单明确标注仅供演示、禁止填入真实凭据，并限定使用示例值。
2. [PLAN.md](/Users/lijie/Documents/work/code/project/jetlinks.saas.ai/runtime-ui/modules/authentication-manager-ui/PLAN.md:8) 要新增可见菜单，却把权限和发布策略留到后续；现有 `system/Apply` 通过菜单按钮权限控制操作，新页没有对应方案。修正：第一阶段就确定管理员访问控制及评审环境的菜单开关，未接通前不得向普通用户展示。
3. 现有 [单点登录表单](/Users/lijie/Documents/work/code/project/jetlinks.saas.ai/runtime-ui/modules/authentication-manager-ui/views/system/Apply/Save/components/EditForm.vue:838) 已有第三方应用 OAuth2 配置；计划未界定新配置与它的关系，第二阶段可能形成两套含义重叠的数据。修正：在计划中写明两者的业务边界，以及未来是复用、迁移还是明确并存。
4. [PLAN.md](/Users/lijie/Documents/work/code/project/jetlinks.saas.ai/runtime-ui/modules/authentication-manager-ui/PLAN.md:11) 允许“启用”“登录页显示”“同步”这些看似生效的操作，但刷新即丢失，且页面本身缺少持续可见的演示态标识。修正：在页面和每次操作反馈中明确“仅本次页面演示，不影响登录或同步”，并对离开/刷新造成的数据丢失给出提示。

`jetlinks-web-style` 的检查还显示，方案档案缺少首屏线框和明确的组件、密度及编辑梯度约束；补齐后实现者才能稳定复现已锁定的布局。

VERDICT: REVISE

### Codex 主代理的回应

接受关于密钥、菜单、既有业务重叠和阶段误导的意见：计划新增示例凭据限制、内存清理、持续可见的非生效提示与离开提醒；菜单按现有初始化模板机制只在评审环境同步，不假造生产权限；第二阶段先检查旧 `system/Apply` 及用户绑定接口的数据边界，再决定复用/迁移/并存。补充了首屏线框、组件、密度、动作与编辑梯度。未采用“第一阶段就新建生产按钮权限”：无后端资源契约时编造权限码会形成假安全边界；取而代之的是不向生产同步或部署。

## Round 2 — Codex

老大，复审通过。上次提出的凭据误填、菜单暴露、与现有单点登录的边界、内存数据丢失提示四项均已写入计划；新增的首屏线框和方案档案也足以约束实现。未发现新的重大阻碍。实施时需验证“仅允许示例密钥”和离开提醒确实生效，而不只是显示提示。

VERDICT: APPROVED
