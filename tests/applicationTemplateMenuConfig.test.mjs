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
        export const api = { menus: [], detail: {}, grantable: [], writes: [] };
        export const getCurrentUserMenuTree = async () => ({ result: copy(api.menus) });
        export const getApplicationTemplateMenus = async () => ({ result: copy(api.detail) });
        export const getAssetTypes = async () => ({ result: [] });
        export const getGrantableAssetAccesses = async () => ({ result: copy(api.grantable) });
        export const getAssetScopeStrategies = async () => ({ result: [] });
        export const saveApplicationTemplateMenus = async (id, data) => {
          api.writes.push({ id, data: copy(data) });
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
const { useApplicationTemplateMenuConfig, api, notifications } = await import(
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

function fixture(supportsByAsset = { device: ['tenant', 'business_application', 'creator'] }) {
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
  notifications.length = 0
  return useApplicationTemplateMenuConfig(() => 'template', {
    loadFailed: 'load failed', saved: 'saved', notReady: 'not ready', missingMenus: count => `missing ${count}`,
  })
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
