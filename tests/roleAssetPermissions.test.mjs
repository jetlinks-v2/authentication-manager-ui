import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const core = fileURLToPath(new URL('../../../jetlinks-web-core/src', import.meta.url))
const { outputFiles } = await build({
  stdin: {
    contents: `export { cleanRoleAssetPermissions } from './views/system/Role/Detail/components/roleAssetPermissions';
      export { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks/useMenuAssetPermissionEditor';`,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  alias: { '@jetlinks-web-core': core },
  bundle: true, write: false, format: 'esm', platform: 'node',
})
const { cleanRoleAssetPermissions, useMenuAssetPermissionEditor } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
)

const retired = ['inspectionPoint', 'inspectionItem', 'inspectionRule', 'inspectionFinding', 'inspectionReport', 'aiHeatmapFloorRegion']
const names = { inspectionPlan: '巡检方案', inspectionRun: '巡检任务', aiHeatmapPoint: '热力图点位', space: '空间' }
const menu = (id, assetTypes) => ({ id, name: id, code: id, granted: true, assetTypes,
  buttons: [{ id: 'query', granted: true }],
  assetAccesses: assetTypes.flatMap(assetType => ['creator', 'org'].map(supportId => ({ assetType, supportId }))),
})
const fixture = () => ({
  menus: [{ id: 'root', children: [
    menu('patrol/workbench', ['inspectionRun', 'inspectionPlan', ...retired.slice(0, 5)]),
    menu('heatmap/points', ['aiHeatmapPoint', 'aiHeatmapFloorRegion', 'space']),
    menu('other', ['notifyConfig', 'retrieval', 'alarmConfig', 'futureAsset']),
  ] }],
  assetAccesses: ['inspectionRun', 'aiHeatmapPoint', ...retired].map(assetType => ({ assetType, accesses: [{ supportId: 'org' }] })),
  assetTypes: Object.entries(names).map(([id, name]) => ({ id, name })),
})
const load = input => { const editor = useMenuAssetPermissionEditor(); editor.reset(cleanRoleAssetPermissions(input)); return editor }

test('旧菜单回显仅保留真实巡检和热力图资产，并保留原范围', () => {
  const editor = load(fixture())
  const assets = editor.visibleAssets.value
  assert.deepEqual(assets.filter(a => a.assetType.startsWith('inspection')).map(a => a.name), ['巡检任务', '巡检方案'])
  assert.deepEqual(assets.filter(a => a.assetType.startsWith('aiHeatmap')).map(a => a.name), ['热力图点位'])
  assert.equal(assets.find(a => a.assetType === 'inspectionRun').selectedSupportId, 'org')
  assert.equal(assets.find(a => a.assetType === 'aiHeatmapPoint').selectedSupportId, 'org')
})

test('全选、切换菜单和批量设置均不会恢复失效类型，快照保持一致', () => {
  const editor = load(fixture())
  editor.setMenusChecked(editor.menuTree.value, true)
  const workbench = editor.flatMenus.value.find(m => m.id === 'patrol/workbench')
  editor.toggleMenu(workbench, false)
  editor.toggleMenu(workbench, true)
  editor.applyAssetBatch('creator')
  const snapshot = editor.getSnapshot()
  assert.equal(snapshot.assetAccesses.length, 8)
  assert.ok(snapshot.assetAccesses.every(a => !retired.includes(a.assetType) && a.accesses[0].supportId === 'creator'))
  assert.ok(snapshot.menus.every(m => (m.assetTypes || []).every(t => !retired.includes(t))))
  assert.ok(snapshot.menus.every(m => (m.assetAccesses || []).every(a => !retired.includes(a.assetType))))
})

test('旧标量及只有候选字段的失效类型也不会通过回退重新出现', () => {
  for (const assetType of retired) {
    for (const source of [{ assetType }, { assetAccesses: [{ assetType, supportId: 'creator', granted: true }] }]) {
      const editor = load({ menus: [{ id: 'legacy', granted: true, ...source }] })
      assert.deepEqual(editor.visibleAssets.value, [])
      assert.deepEqual(editor.getSnapshot().assetAccesses, [])
    }
  }
})

test('资产目录不可用时仍保留其他资产及其策略，不修改接口原始数据', () => {
  const input = fixture()
  input.assetTypes = []
  input.assetAccesses.push({ assetType: 'notifyConfig', accesses: [{ supportId: 'org' }] })
  const original = structuredClone(input)
  const editor = load(input)
  for (const type of ['notifyConfig', 'retrieval', 'alarmConfig', 'futureAsset']) {
    assert.ok(editor.visibleAssets.value.some(a => a.assetType === type))
  }
  assert.equal(editor.visibleAssets.value.find(a => a.assetType === 'notifyConfig').selectedSupportId, 'org')
  assert.deepEqual(input, original)
})

test('正常菜单、按钮和取消状态保持不变，清理可重复执行', () => {
  const input = fixture()
  input.menus[0].children[2].granted = false
  input.menus[0].children[2].buttons[0].granted = false
  const cleaned = cleanRoleAssetPermissions(input)
  assert.deepEqual(cleaned.menus[0].children[2], input.menus[0].children[2])
  assert.deepEqual(cleanRoleAssetPermissions(cleaned), cleaned)
  assert.ok(!load(input).visibleAssets.value.some(a => a.assetType === 'notifyConfig'))
})

test('巡检和热力图初始化声明与真实资产模型一致', () => {
  const read = name => JSON.parse(fs.readFileSync(new URL(`../../${name}/baseMenu.json`, import.meta.url), 'utf8'))
  const flat = menus => menus.flatMap(m => [m, ...flat(m.children || [])])
  const patrol = flat(read('jetlinks-inspection-ui'))
  for (const [code, expected] of Object.entries({ 'patrol/workbench': ['inspectionRun', 'inspectionPlan'],
    'patrol/config': ['inspectionPlan'], 'patrol/records': ['inspectionRun', 'inspectionPlan'], 'patrol/workorders': ['inspectionRun'] })) {
    assert.deepEqual(new Set(patrol.find(m => m.code === code).assetTypes), new Set(expected))
  }
  const heatmap = flat(read('jetlinks-ai-ui'))
  assert.deepEqual(heatmap.find(m => m.code === 'heatmap/points').assetTypes, ['aiHeatmapPoint', 'space', 'mediaCenter', 'device'])
  assert.deepEqual(heatmap.find(m => m.code === 'heatmap/area-statistics').assetTypes, ['aiHeatmapPoint', 'space'])
})
