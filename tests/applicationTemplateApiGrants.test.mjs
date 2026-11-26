import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const apiModule = '@authentication-manager-ui/api/application-center/apiApplication'
const { outputFiles } = await build({
  stdin: {
    contents: `
      export { useDirectGrants } from './views/application-center/ThirdPartyApplication/Direct/useDirectGrants';
      export { ref, nextTick, createRenderer } from 'vue';
      export { api, API_CLIENT_TARGET, TEMPLATE_GRANT_TARGET } from '${apiModule}';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'api-grants-boundaries',
    setup(plugin) {
      plugin.onResolve({ filter: /^(@authentication-manager-ui\/api\/application-center\/apiApplication|@jetlinks-web\/utils|@jetlinks-web-core\/store\/(menu|auth)|vue-i18n)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === apiModule ? `
        const copy = value => JSON.parse(JSON.stringify(value));
        export const API_CLIENT_TARGET = 'api-client';
        export const TEMPLATE_GRANT_TARGET = 'business_application_template';
        export const api = { catalog: [], grants: {}, queries: [], writes: [], loadFailure: '', saveFailure: '', beforeLoad: null, beforeSave: null };
        export const queryApiGroups = async data => {
          api.queries.push(copy(data));
          if (api.beforeLoad) await api.beforeLoad();
          if (api.loadFailure) throw new Error(api.loadFailure);
          return { result: copy(api.catalog) };
        };
        export const queryApiGrants = async (id, targetType) => ({ result: copy(api.grants[id] || []) });
        export const saveApiGrants = async (id, grants, targetType) => {
          api.writes.push({ id, grants: copy(grants), targetType });
          if (api.beforeSave) await api.beforeSave();
          if (api.saveFailure) throw new Error(api.saveFailure);
          api.grants[id] = copy(grants);
        };
      ` : args.path === 'vue-i18n' ? `export const useI18n = () => ({ t: key => key });`
        : args.path === '@jetlinks-web/utils' ? `export const onlyMessage = () => {};`
          : args.path.endsWith('/auth') ? `export const useAuthStore = () => ({ hasPermission: () => true });`
            : `export const useMenuStore = () => ({ jumpPage: () => {} });` }))
    },
  }],
})
const { useDirectGrants, ref, nextTick, createRenderer, api, API_CLIENT_TARGET, TEMPLATE_GRANT_TARGET } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)

const renderer = createRenderer({
  createElement: tag => ({ tag, children: [] }),
  createText: text => ({ text }),
  createComment: text => ({ text }),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.text = text },
  insert: (child, parent) => { child.parent = parent; parent.children.push(child) },
  remove: child => { child.parent.children = child.parent.children.filter(node => node !== child) },
  parentNode: node => node.parent,
  nextSibling: () => null,
  patchProp: () => {},
})
const operation = id => ({ id, name: `Operation ${id}`, description: `Description ${id}`, apiSpecIds: [`${id}-api`], apiDetail: [{ id: `${id}-api`, permissionId: 'user', actions: ['query'] }] })
const settle = async () => { await new Promise(setImmediate); await nextTick() }

async function fixture(t, targetType = TEMPLATE_GRANT_TARGET, options = {}) {
  api.catalog = [
    { id: 'user', name: 'Users', assetTypes: ['device', 'product'], operations: [operation('query'), operation('sync'), { id: 'broken', apiSpecIds: ['missing'], apiDetail: [] }] },
    { id: 'device', name: 'Devices', assetTypes: [], operations: [operation('read')] },
    { id: 'empty', name: 'Empty', assetTypes: [], operations: [] },
  ]
  api.grants = { template: [
    { id: 'user-device', targetId: 'template', targetType, groupId: 'user', operationIds: ['query', 'retired'], assetAccesses: { assetType: 'device', accesses: [{ supportId: 'org', id: 'org-1' }] }, priority: 7, merge: false },
    { id: 'user-product', targetId: 'template', targetType, groupId: 'user', operationIds: ['query'], assetAccesses: { assetType: 'product', accesses: [{ supportId: 'creator' }] } },
    { id: 'hidden', targetId: 'template', targetType, groupId: 'hidden-group', operationIds: ['private'], assetAccesses: { assetType: 'secret', accesses: [{ supportId: 'tenant' }] } },
  ], another: [] }
  api.writes = []; api.queries = []; api.loadFailure = options.loadFailure || ''; api.saveFailure = ''; api.beforeLoad = null; api.beforeSave = null
  const id = ref('template')
  let state
  const app = renderer.createApp({ setup() { state = useDirectGrants(() => id.value, targetType); return () => null } })
  app.mount({ children: [] })
  t.after(() => app.unmount())
  await settle()
  return { state, id, app }
}

test('template starts in view mode with only granted operations and unique grant counts', async t => {
  const { state } = await fixture(t)
  assert.equal(state.loaded.value, true)
  assert.equal(state.editing.value, false)
  assert.deepEqual(state.templateRows.value.map(row => [row.id, row.selectedCount, row.totalCount, row.visibleOperations.map(item => item.id)]), [
    ['user', 2, 4, ['query', 'retired']], ['device', 0, 1, []], ['empty', 0, 0, []],
  ])
  assert.equal(state.hiddenGrants.value, true)
  assert.equal(state.templateRows.value[0].assetHint.message, 'ApplicationTemplate.grants.assetScope')
  state.update('device', ['read'])
  state.toggleGroup(state.groups.value[0], false)
  await state.save(true)
  assert.deepEqual(state.changed.value, [])
  assert.deepEqual(api.writes, [])
  assert.deepEqual(api.queries[0].terms, [{ column: 'status', termType: 'eq', value: 'enabled' }])
})

test('template editing exposes candidates and group selection preserves historical unavailable operations', async t => {
  const { state } = await fixture(t)
  state.edit()
  const group = state.templateRows.value[0]
  assert.equal(state.editing.value, true)
  assert.deepEqual(group.visibleOperations.map(item => item.id), ['query', 'sync', 'broken', 'retired'])
  assert.equal(group.checked, false)
  assert.equal(group.indeterminate, true)
  assert.equal(state.templateRows.value[2].selectionDisabled, true)
  state.toggleGroup(group, true)
  assert.deepEqual(state.selected.value.user, ['query', 'sync', 'retired'])
  assert.equal(state.templateRows.value[0].checked, true)
  state.update('user', ['query', 'broken'])
  assert.equal(state.error.value, 'ThirdPartyApplication.direct.invalidOperation')
  assert.deepEqual(state.selected.value.user, ['query', 'sync', 'retired'])
  state.toggleGroup(group, false)
  assert.deepEqual(state.selected.value.user, [])
  assert.equal(state.templateRows.value[0].indeterminate, false)
  state.toggleGroup(group, true)
  assert.deepEqual(state.selected.value.user, ['query', 'sync'])
  assert.deepEqual(api.writes, [])
})

test('saving template edits preserves invisible grants, per-record asset scopes and flags', async t => {
  const { state } = await fixture(t)
  const before = JSON.parse(JSON.stringify(api.grants.template))
  state.edit()
  state.toggleGroup(state.groups.value[0], true)
  state.update('device', ['read'])
  await state.save()
  assert.equal(api.writes.length, 1)
  const write = api.writes[0]
  assert.equal(write.id, 'template')
  assert.equal(write.targetType, TEMPLATE_GRANT_TARGET)
  assert.deepEqual(write.grants.find(grant => grant.id === 'hidden'), before[2])
  for (const original of before.slice(0, 2)) {
    const saved = write.grants.find(grant => grant.id === original.id)
    assert.deepEqual(saved, { ...original, operationIds: [...original.operationIds, 'sync'] })
  }
  assert.deepEqual(write.grants.find(grant => grant.groupId === 'device'), { targetId: 'template', targetType: TEMPLATE_GRANT_TARGET, groupId: 'device', operationIds: ['read'] })
  assert.equal(state.editing.value, false)
  assert.equal(state.loaded.value, true)
  assert.deepEqual(state.changed.value, [])
})

test('clearing a group explicitly removes only that group from replacement grants', async t => {
  const { state } = await fixture(t)
  state.edit()
  state.toggleGroup(state.groups.value[0], false)
  await state.save()
  assert.deepEqual(api.writes[0].grants.map(grant => grant.id), ['hidden'])
  assert.equal(state.templateRows.value[0].selectedCount, 0)
  assert.deepEqual(state.templateRows.value[0].visibleOperations, [])
})

test('refresh restores saved grants and clears draft changes while staying in edit mode', async t => {
  const { state } = await fixture(t)
  state.edit()
  state.update('device', ['read'])
  await state.load()
  assert.equal(state.editing.value, true)
  assert.deepEqual(state.changed.value, [])
  assert.deepEqual(state.selected.value.device || [], [])
  assert.deepEqual(state.selected.value.user, ['query', 'retired'])
  assert.deepEqual(api.writes, [])
})

test('revoke all keeps the existing immediate empty replacement contract including invisible grants', async t => {
  const { state } = await fixture(t)
  state.edit()
  await state.save(true)
  assert.deepEqual(api.writes, [{ id: 'template', targetType: TEMPLATE_GRANT_TARGET, grants: [] }])
  assert.equal(state.editing.value, false)
  assert.equal(state.hiddenGrants.value, false)
})

test('failed saves preserve edit mode and the selected draft for retry', async t => {
  const { state } = await fixture(t)
  state.edit()
  state.update('device', ['read'])
  api.saveFailure = 'offline'
  await state.save()
  assert.equal(state.editing.value, true)
  assert.equal(state.error.value, 'offline')
  assert.equal(state.saving.value, false)
  assert.deepEqual(state.selected.value.device, ['read'])
  assert.deepEqual(state.changed.value, ['device'])
  api.saveFailure = ''
  await state.save()
  assert.equal(state.editing.value, false)
  assert.equal(api.writes.length, 2)
})

test('pending template saves block refresh, edits and duplicate writes until completion', async t => {
  const { state } = await fixture(t)
  state.edit()
  state.update('device', ['read'])
  let release
  api.beforeSave = () => new Promise(resolve => { release = resolve })
  const saving = state.save()
  const queries = api.queries.length
  state.update('device', [])
  state.toggleAll(false)
  await state.load()
  await state.save(true)
  assert.equal(state.saving.value, true)
  assert.deepEqual(state.selected.value.device, ['read'])
  assert.equal(api.queries.length, queries)
  assert.equal(api.writes.length, 1)
  release()
  await saving
  assert.equal(state.saving.value, false)
  assert.equal(state.editing.value, false)
})

test('switching templates ignores an old save and resets the new target to view mode', async t => {
  const { state, id } = await fixture(t)
  state.edit()
  state.update('device', ['read'])
  let release
  api.beforeSave = () => new Promise(resolve => { release = resolve })
  const saving = state.save()
  id.value = 'another'
  await settle()
  assert.equal(state.editing.value, false)
  assert.equal(state.saving.value, false)
  assert.equal(state.loaded.value, true)
  assert.deepEqual(state.original.value, [])
  const queries = api.queries.length
  state.edit()
  state.update('device', ['read'])
  release()
  await saving
  assert.equal(api.queries.length, queries)
  assert.equal(state.editing.value, true)
  assert.deepEqual(state.changed.value, ['device'])
  assert.equal(api.writes[0].id, 'template')
})

test('load failures disable editing and can be retried without a write', async t => {
  const { state } = await fixture(t, TEMPLATE_GRANT_TARGET, { loadFailure: 'offline' })
  assert.equal(state.error.value, 'offline')
  state.edit()
  assert.equal(state.editing.value, false)
  assert.equal(state.loaded.value, false)
  api.loadFailure = ''
  await state.load()
  state.edit()
  assert.equal(state.loaded.value, true)
  assert.equal(state.editing.value, true)
  assert.deepEqual(api.writes, [])
})

test('API applications still edit immediately and only save effective pending changes', async t => {
  const { state } = await fixture(t, API_CLIENT_TARGET)
  assert.equal(state.editing.value, false)
  state.update('device', ['read'])
  state.update('device', [])
  assert.deepEqual(state.pendingChanges.value, [])
  await state.save()
  assert.deepEqual(api.writes, [])
  state.toggleGroup(state.groups.value[1], true)
  await state.save()
  assert.equal(api.writes[0].targetType, API_CLIENT_TARGET)
  assert.deepEqual(api.writes[0].grants.find(grant => grant.groupId === 'device').operationIds, ['read'])
  assert.deepEqual(api.writes[0].grants.find(grant => grant.id === 'hidden'), api.grants.template.find(grant => grant.id === 'hidden'))
})
