import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const apiModule = '@authentication-manager-ui/api/application-center/applicationTemplate'
const messagesModule = '@jetlinks-web/utils'
const { outputFiles } = await build({
  stdin: {
    contents: `
      export { useApplicationTemplateMenuConfig } from './views/application-center/Template/Save/useApplicationTemplateMenuConfig';
      export { useApplicationTemplatePermissionView } from './views/application-center/Template/Save/useApplicationTemplatePermissionView';
      export { ref, nextTick } from 'vue';
      export { api } from '${apiModule}';
      export { notifications } from '${messagesModule}';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'template-menu-api-boundary',
    setup(plugin) {
      plugin.onResolve({ filter: /^@jetlinks-web-core\/hooks$/ }, () => ({
        path: fileURLToPath(new URL('../../../jetlinks-web-core/src/hooks/useMenuAssetPermissionEditor.ts', import.meta.url)),
      }))
      plugin.onResolve({ filter: /^(@authentication-manager-ui\/api\/application-center\/applicationTemplate|@jetlinks-web\/utils)$/ }, args => ({
        path: args.path,
        namespace: 'fixture',
      }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === apiModule ? `
        const copy = value => JSON.parse(JSON.stringify(value));
        export const api = { menus: [], detail: {}, grantable: [], writes: [], saveFailure: '', beforeSave: null, loadFailure: '' };
        export const getCurrentUserMenuTree = async () => ({ result: copy(api.menus) });
        export const getApplicationTemplateMenus = async () => {
          if (api.loadFailure) throw new Error(api.loadFailure);
          return { result: copy(api.detail) };
        };
        export const getAssetTypes = async () => ({ result: [] });
        export const getGrantableAssetAccesses = async () => ({ result: copy(api.grantable) });
        export const getAssetScopeStrategies = async () => ({ result: [] });
        export const saveApplicationTemplateMenus = async (id, data) => {
          api.writes.push({ id, data: copy(data) });
          if (api.beforeSave) await api.beforeSave();
          if (api.saveFailure === 'throw') throw new Error('offline');
          if (api.saveFailure) return { success: false, message: api.saveFailure };
          const withFullCandidates = menus => menus.map(menu => ({
            ...menu,
            assetAccesses: (menu.assetTypes || []).flatMap(assetType =>
              api.grantable.find(asset => asset.assetType === assetType).accesses.map(access => ({
                ...access, assetType, granted: false,
              }))),
            children: menu.children?.length ? withFullCandidates(menu.children) : null,
          }));
          api.detail = { menus: withFullCandidates(data.menus), assetAccesses: copy(data.assetAccesses) };
          return { success: true };
        };
      ` : `
        export const notifications = [];
        export const onlyMessage = (message, type) => notifications.push({ message, type });
      ` }))
    },
  }],
})
const { useApplicationTemplateMenuConfig, useApplicationTemplatePermissionView, ref, nextTick, api, notifications } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
)

const names = { tenant: '所在租户', business_application: '所在应用', creator: '自己创建的', all: '全部数据' }
const access = (assetType, supportId, granted = false) => ({ assetType, supportId, name: names[supportId], granted })
const fullSupports = ['tenant', 'business_application', 'creator', 'all']
const policy = (assetType, supportId, scopeStrategy = 'IGNORE') => ({
  assetType,
  accesses: [{ supportId }],
  options: { scopeStrategy },
})

function fixture(supportsByAsset = { device: ['tenant', 'business_application', 'creator'] }, options = {}) {
  api.menus = [{
    id: 'asset-menu', name: '资产管理', assetTypes: Object.keys(supportsByAsset),
    assetAccesses: Object.entries(supportsByAsset).flatMap(([assetType, supports]) =>
      supports.map(supportId => access(assetType, supportId))),
  }]
  api.detail = { menus: [], assetAccesses: [] }
  api.grantable = Object.keys(supportsByAsset).map(assetType => ({
    assetType, accesses: fullSupports.map(supportId => ({ supportId, name: names[supportId] })),
  }))
  api.writes = []
  api.saveFailure = ''
  api.beforeSave = null
  api.loadFailure = ''
  notifications.length = 0
  return useApplicationTemplateMenuConfig(options.getTemplateId || (() => 'template'), {
    loadFailed: 'load failed', saved: 'saved', notReady: 'not ready', missingMenus: count => `missing ${count}`,
  }, options.canEdit)
}

const visible = state => Object.fromEntries(state.editor.visibleAssets.value.map(asset => [asset.assetType, {
  supports: asset.accesses.map(access => access.supportId),
  selected: asset.selectedSupportId,
}]))

test('new templates keep the same project candidates after save and reload', async () => {
  const state = fixture()
  await state.loadEditor()
  assert.equal(state.initialized.value, true)
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  state.editor.setAssetAccess('device', 'tenant')
  const beforeSave = visible(state)
  assert.deepEqual(beforeSave.device, {
    supports: ['tenant', 'business_application', 'creator'], selected: 'tenant',
  })
  state.setScopeStrategy('device', 'SELECT')

  await state.save()
  assert.equal(notifications.some(item => item.type === 'error'), false)
  assert.deepEqual(visible(state), beforeSave)
  assert.deepEqual(api.writes[0].data.assetAccesses, [policy('device', 'tenant', 'SELECT')])
  assert.equal(state.strategyDraft.value.device, 'SELECT')
  assert.equal(state.editor.batchAssetOptions.value.some(option => option.value === 'all'), false)
  await state.loadEditor()
  assert.deepEqual(visible(state), beforeSave)
  assert.equal(notifications.some(item => item.type === 'error'), false)
})

test('historical out-of-scope selections fall back without losing the scope strategy', async () => {
  const state = fixture()
  api.detail = {
    menus: [{
      ...api.menus[0], granted: true,
      assetAccesses: fullSupports.map(supportId => access('device', supportId, supportId === 'all')),
    }],
    assetAccesses: [policy('device', 'all', 'SELECT')],
  }

  await state.loadEditor()
  assert.deepEqual(visible(state).device, {
    supports: ['tenant', 'business_application', 'creator'], selected: 'business_application',
  })
  assert.equal(state.strategyDraft.value.device, 'SELECT')
  assert.deepEqual(api.writes, [])
  await state.save()
  assert.deepEqual(api.writes[0].data.assetAccesses, [policy('device', 'business_application', 'SELECT')])
})

test('each asset keeps its own candidates and retains all when the project allows it', async () => {
  const state = fixture({ device: ['creator'], space: ['creator', 'all'] })
  api.detail = {
    menus: [{
      ...api.menus[0], granted: true,
      assetAccesses: ['device', 'space'].flatMap(assetType => fullSupports.map(supportId => access(assetType, supportId))),
    }],
    assetAccesses: [policy('device', 'creator'), policy('space', 'all')],
  }

  await state.loadEditor()
  assert.deepEqual(visible(state), {
    device: { supports: ['creator'], selected: 'creator' },
    space: { supports: ['creator', 'all'], selected: 'all' },
  })
  assert.deepEqual(state.editor.batchAssetOptions.value.map(option => option.value), ['creator'])
  await state.save()
  await state.loadEditor()
  assert.deepEqual(visible(state), {
    device: { supports: ['creator'], selected: 'creator' },
    space: { supports: ['creator', 'all'], selected: 'all' },
  })
})

test('permissions start in view mode and cancel restores menus, buttons, candidates and strategies without a write', async () => {
  const state = fixture()
  api.menus[0].buttons = [{ id: 'view', name: '查看' }, { id: 'edit', name: '编辑' }]
  api.detail = {
    menus: [{ ...api.menus[0], granted: true, buttons: [{ id: 'view', granted: true }] }],
    assetAccesses: [policy('device', 'tenant', 'SELECT')],
  }
  await state.loadEditor()
  assert.equal(state.editing.value, false)
  const before = JSON.parse(JSON.stringify(state.editor.menuTree.value))
  const beforeAssets = visible(state)
  state.edit()
  state.editor.toggleMenu(state.editor.menuTree.value[0], true)
  state.editor.setAssetAccess('device', 'creator')
  state.setScopeStrategy('device', 'IGNORE')
  state.cancel()
  assert.equal(state.editing.value, false)
  assert.deepEqual(JSON.parse(JSON.stringify(state.editor.menuTree.value)), before)
  assert.deepEqual(visible(state), beforeAssets)
  assert.equal(state.strategyDraft.value.device, 'SELECT')
  assert.deepEqual(api.writes, [])
  state.edit()
  assert.deepEqual(visible(state), beforeAssets)
})

test('save rejection and exceptions preserve edit mode and every unsaved permission', async () => {
  const state = fixture()
  await state.loadEditor()
  state.edit()
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  state.editor.setAssetAccess('device', 'tenant')
  state.setScopeStrategy('device', 'SELECT')
  const before = state.editor.getSnapshot()
  for (const failure of ['rejected', 'throw']) {
    api.saveFailure = failure
    assert.equal(await state.save(), false)
    assert.equal(state.editing.value, true)
    assert.equal(state.saving.value, false)
    assert.deepEqual(state.editor.getSnapshot(), before)
    assert.equal(state.strategyDraft.value.device, 'SELECT')
  }
})

test('pending saves block cancellation, duplicate saves and editing controls, then return to view mode', async () => {
  const state = fixture()
  await state.loadEditor()
  const view = useApplicationTemplatePermissionView(state)
  state.edit()
  view.toggleMenu('asset-menu', true)
  let finish
  api.beforeSave = () => new Promise(resolve => { finish = resolve })
  const pending = state.save()
  assert.equal(state.saving.value, true)
  state.cancel()
  view.toggleMenu('asset-menu', false)
  assert.equal(state.editing.value, true)
  assert.equal(state.editor.menuTree.value[0].granted, true)
  assert.equal(await state.save(), false)
  assert.equal(api.writes.length, 1)
  finish()
  assert.equal(await pending, true)
  assert.equal(state.editing.value, false)
  assert.equal(state.saving.value, false)
})

test('a completed save for another template cannot clear the new template draft', async () => {
  const templateId = ref('first')
  const state = fixture(undefined, { getTemplateId: () => templateId.value })
  await state.loadEditor()
  state.edit()
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  let finish
  api.beforeSave = () => new Promise(resolve => { finish = resolve })
  const pending = state.save()
  templateId.value = 'second'
  await state.loadEditor()
  assert.equal(state.editing.value, false)
  assert.equal(state.editor.menuTree.value[0].granted, false)
  const secondMenus = JSON.parse(JSON.stringify(state.editor.menuTree.value))
  finish()
  assert.equal(await pending, true)
  assert.deepEqual(JSON.parse(JSON.stringify(state.editor.menuTree.value)), secondMenus)
  assert.equal(api.writes[0].id, 'first')
})

test('readonly and uninitialized editors cannot enter edit mode or change grants', async () => {
  const state = fixture(undefined, { canEdit: () => false })
  const view = useApplicationTemplatePermissionView(state)
  state.edit()
  assert.equal(state.editing.value, false)
  await state.loadEditor()
  state.edit()
  view.toggleMenu('asset-menu', true)
  assert.equal(state.editing.value, false)
  assert.equal(state.editor.menuTree.value[0].granted, false)
  assert.equal(await state.save(), false)
  assert.deepEqual(api.writes, [])
})

test('batch configuration uses the shared grantable intersection and skips invalid or disabled values', async () => {
  const state = fixture({ device: ['creator'], space: ['creator', 'all'] })
  await state.loadEditor()
  const view = useApplicationTemplatePermissionView(state)
  state.scopeStrategyOptions.value = [
    { value: 'IGNORE', label: '不限制' }, { value: 'SELECT', label: '仅查询' },
    { value: 'BIND', label: '禁止选择', disabled: true },
  ]
  state.edit()
  view.toggleMenu('asset-menu', true)
  state.editor.setAssetAccess('space', 'all')
  view.toggleBatch()
  view.batchSupportId.value = 'all'
  view.batchStrategy.value = 'BIND'
  assert.equal(view.canApplyBatch.value, false)
  view.applyBatch()
  assert.equal(visible(state).device.selected, 'creator')
  assert.equal(visible(state).space.selected, 'all')
  view.batchSupportId.value = 'creator'
  view.batchStrategy.value = 'SELECT'
  view.applyBatch()
  assert.equal(view.batchOpen.value, false)
  assert.equal(visible(state).device.selected, 'creator')
  assert.equal(visible(state).space.selected, 'creator')
  assert.deepEqual(state.strategyDraft.value, { device: 'SELECT', space: 'SELECT' })
  assert.deepEqual(api.writes, [])
  state.cancel()
  assert.equal(state.editor.visibleAssets.value.length, 0)
  assert.deepEqual(state.strategyDraft.value, {})
})

test('permission rows retain parent-button linkage and reset expanded state after cancellation', async () => {
  const state = fixture()
  api.menus[0].children = [{ id: 'child', buttons: [{ id: 'view' }, { id: 'edit' }] }]
  await state.loadEditor()
  const view = useApplicationTemplatePermissionView(state)
  assert.deepEqual(view.expandedKeys.value, ['asset-menu'])
  state.edit()
  await nextTick()
  assert.deepEqual(view.expandedKeys.value, [])
  view.toggleButton('child', 'view', true)
  assert.equal(state.editor.menuTree.value[0].indeterminate, true)
  assert.equal(view.menuRows.value[0].children[0].grantedButtons[0].id, 'view')
  view.toggleMenu('asset-menu', true)
  assert.equal(state.editor.menuTree.value[0].children[0].buttons.every(button => button.granted), true)
  state.cancel()
  await nextTick()
  assert.equal(state.editor.menuTree.value[0].granted, false)
  assert.deepEqual(view.expandedKeys.value, ['asset-menu'])
})

test('batch candidates are rechecked when another menu adds a more restrictive asset', async () => {
  const state = fixture({ device: ['creator'], space: ['creator', 'all'] })
  api.menus = api.menus[0].assetTypes.map(assetType => ({
    id: assetType,
    assetTypes: [assetType],
    assetAccesses: api.menus[0].assetAccesses.filter(access => access.assetType === assetType),
  }))
  await state.loadEditor()
  const view = useApplicationTemplatePermissionView(state)
  state.edit()
  view.toggleMenu('space', true)
  view.toggleBatch()
  view.batchSupportId.value = 'all'
  assert.equal(view.canApplyBatch.value, true)
  view.toggleMenu('device', true)
  assert.equal(view.canApplyBatch.value, false)
  view.applyBatch()
  assert.equal(visible(state).device.selected, 'creator')
  assert.equal(visible(state).space.selected, 'creator')
  assert.deepEqual(api.writes, [])
})

test('failed loads expose a retryable error and do not enable permission editing', async () => {
  const state = fixture()
  api.loadFailure = 'offline'
  await state.loadEditor()
  state.edit()
  assert.equal(state.loadError.value, 'offline')
  assert.equal(state.initialized.value, false)
  assert.equal(state.editing.value, false)
  api.loadFailure = ''
  await state.loadEditor()
  assert.equal(state.loadError.value, '')
  assert.equal(state.initialized.value, true)
})
