import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const vueUrl = pathToFileURL(require.resolve('vue/dist/vue.runtime.esm-bundler.js')).href
const { createRenderer, defineComponent, h } = await import(vueUrl)
const settingDir = fileURLToPath(new URL('../views/system/Menu/Setting/', import.meta.url))
const { outputFiles } = await build({
  stdin: { contents: `export * from './utils'; export * from './menuTree';
    export * from './menuSettingService'; export * from './useMenuSetting';`, resolveDir: settingDir },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{
    name: 'menu-owner-api-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: vueUrl, external: true }))
      plugin.onResolve({ filter: /^@authentication-manager-ui\// }, args => ({
        path: fileURLToPath(new URL(`../${args.path.replace('@authentication-manager-ui/', '')}.ts`, import.meta.url)),
      }))
      plugin.onResolve({ filter: /^@jetlinks-web-core\/(api\/initHome|views\/init-home\/data\/baseMenu)$/ }, args => ({
        path: fileURLToPath(new URL(`../../../jetlinks-web-core/src/${args.path.replace('@jetlinks-web-core/', '')}.ts`, import.meta.url)),
      }))
      plugin.onResolve({ filter: /^(@jetlinks-web\/core|@jetlinks-web-core\/utils\/|vue-i18n)/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
        '@jetlinks-web/core': `export const request = Object.fromEntries(['get','post','patch'].map(method =>
          [method, (url, data) => globalThis.menuFixture.request(method, url, data)]));`,
        '@jetlinks-web-core/utils/modules': `export const getModulesMenu = () => globalThis.menuFixture.definitions;`,
        '@jetlinks-web-core/utils/consts': `export const USER_CENTER_MENU_CODE = 'account-center';
          export const messageSubscribe = 'message-subscribe'; export const USER_CENTER_MENU_BUTTON_CODE = 'password';
          export const ACCESS_AI_AGENT_CODE = 'access-ai-agent-code';`,
        '@jetlinks-web-core/utils/comm': `export const onlyMessage = (...args) => globalThis.menuFixture.messages.push(args);`,
        'vue-i18n': `export const useI18n = () => ({ t: (key, args) => args ? key + ':' + args.owners : key });`,
      }[args.path] }))
    },
  }],
})
const { createMenuDrafts, flattenMenus, buildMenuPayloads, selectMenu, moveMenu, hasValidMenuDepth,
  synchronizeMenuDefinitions, loadMenuSettings, saveMenuSettings, useMenuSetting } =
  await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

const menu = (id, owner = 'iot', fields = {}) => ({ id, code: id, name: id, owner, ...fields })
const rows = drafts => [...flattenMenus(drafts.iot), ...flattenMenus(drafts.app)]
const byId = (drafts, id) => rows(drafts).find(menu => menu.id === id)
const calls = []
let behavior = {}
const fixture = (definitions = [], saved = []) => {
  calls.length = 0
  behavior = {}
  globalThis.menuFixture = { definitions, messages: [], reloads: 0,
    request: async (method, url, data) => {
      calls.push({ method, url, data: structuredClone(data) })
      if (behavior[url]) return behavior[url](data)
      if (url === '/menu/_query/no-paging') return { success: true, result: saved }
      if (url === '/system/resources/permission') return { success: true, result: ['{"id":"query"}', '{"id":"application"}'] }
      return { success: true, status: 200 }
    },
  }
  globalThis.location = { reload: () => { globalThis.menuFixture.reloads++ } }
}

test('separates owners and echoes by ID even when codes are equal', () => {
  const base = [menu('project', 'iot', { code: 'same' }), menu('app', 'app', { code: 'same' }), menu('new', 'app')]
  const { drafts } = createMenuDrafts(base, [menu('project', 'iot', { code: 'same', options: { show: true } }),
    menu('app', 'app', { code: 'same', sortIndex: 9, options: { show: false, retained: 'yes' } })])
  assert.equal(byId(drafts, 'project').options.show, true)
  assert.equal(byId(drafts, 'app').options.show, false)
  assert.equal(byId(drafts, 'new').options.show, false)
  assert.equal(byId(drafts, 'app').sortIndex, 9)
  assert.equal(byId(drafts, 'app').options.retained, 'yes')
  const changed = selectMenu(drafts.app, 'app', true)
  assert.equal(flattenMenus(changed).find(node => node.id === 'app').options.show, true)
  assert.equal(flattenMenus(changed).find(node => node.id === 'new').options.show, false)
  assert.equal(byId(drafts, 'app').options.show, false)
})

test('local owners override saved pollution; empty owners default to iot and cloud stays outside this change', () => {
  const { drafts } = createMenuDrafts([menu('app', 'app')], [menu('app'), menu('legacy', null), menu('old-cloud', 'cloud')])
  assert.equal(byId(drafts, 'app').owner, 'app')
  assert.equal(byId(drafts, 'legacy').owner, 'iot')
  assert.equal(byId(drafts, 'old-cloud'), undefined)
})

test('cross-owner children appear in their own tab without losing parent references', () => {
  const base = [menu('parent', 'app', { children: [menu('child', 'iot', { children: [menu('grandchild')] })] })]
  const { drafts } = createMenuDrafts(base, [])
  assert.equal(drafts.iot[0].id, 'child')
  assert.equal(drafts.iot[0].parentId, 'parent')
  assert.equal(drafts.iot[0].children[0].parentId, 'child')
  const payloads = buildMenuPayloads(drafts, [])
  assert.deepEqual(payloads.app.map(node => node.id), ['parent'])
  assert.deepEqual(payloads.iot.map(node => node.id), ['child', 'grandchild'])
  assert.equal(payloads.iot[0].parentId, 'parent')
  assert(payloads.iot.every(node => node.owner === 'iot' && !('children' in node) && !('key' in node)))
})

test('keeps hidden system menus and their descendants in the correct owner payload', () => {
  const saved = [menu('center', 'iot', { code: 'account-center', children: [menu('center-child')] }),
    menu('messages', 'app', { code: 'message-subscribe' })]
  const { drafts, preserved } = createMenuDrafts([], saved)
  assert.equal(rows(drafts).length, 0)
  const payloads = buildMenuPayloads(drafts, preserved)
  assert.deepEqual(payloads.iot.map(node => node.id), ['center', 'center-child'])
  assert.deepEqual(payloads.app.map(node => node.id), ['messages'])
  assert.equal(payloads.iot[1].parentId, 'center')
})

test('selection cascades by ID and preserves the menu configuration entry', () => {
  const { drafts } = createMenuDrafts([menu('parent', 'iot', { children: [menu('config', 'iot', { code: 'system/Menu' }), menu('other')] })], [])
  const selected = selectMenu(drafts.iot, 'parent', true)
  assert(flattenMenus(selected).every(node => node.options.show))
  const deselected = selectMenu(selected, 'parent', false)
  assert.equal(deselected[0].options.show, true)
  assert.equal(flattenMenus(deselected).find(node => node.id === 'config').options.show, true)
  assert.equal(flattenMenus(deselected).find(node => node.id === 'other').options.show, false)
})

test('dragging changes only parent/order and never selects or changes owner', () => {
  const { drafts } = createMenuDrafts([menu('first'), menu('second', 'iot', { options: { retained: true } }), menu('application', 'app')], [])
  const moved = moveMenu(drafts.iot, { dragId: 'second', targetId: 'first', placement: 'inside' })
  assert.equal(moved[0].children[0].parentId, 'first')
  assert.equal(moved[0].children[0].owner, 'iot')
  assert.equal(moved[0].children[0].options.show, false)
  assert.equal(moved[0].children[0].options.retained, true)
  assert.equal(drafts.iot.length, 2)
  assert.deepEqual(moveMenu(moved, { dragId: 'first', targetId: 'second', placement: 'inside' }), moved)
  assert.deepEqual(moveMenu(drafts.iot, { dragId: 'first', targetId: 'application', placement: 'inside' }), drafts.iot)
})

test('validates real depth and cycles through ancestors in another owner tab', () => {
  const { drafts } = createMenuDrafts([menu('a', 'app', { children: [menu('b', 'iot', { children: [menu('c', 'app')] })] })], [])
  assert.equal(hasValidMenuDepth(drafts, []), true)
  const cycled = { ...drafts, app: moveMenu(drafts.app, { dragId: 'a', targetId: 'c', placement: 'inside' }) }
  assert.equal(hasValidMenuDepth(cycled, []), false)
  const tooDeep = { ...drafts, iot: [...drafts.iot, { ...menu('d'), key: 'd', parentId: 'c' }] }
  assert.equal(hasValidMenuDepth(tooDeep, []), false)
})

test('sync adds button and permission actions without changing draft visibility, parent or sort', () => {
  const current = menu('app', 'app', { parentId: 'external', sortIndex: 8, options: { show: false },
    buttons: [{ id: 'edit', permissions: [{ permission: 'device', actions: ['query'] }] }],
    permissions: [{ permission: 'device', actions: ['query'] }], assetTypes: ['device'] })
  const base = [menu('app', 'app', { buttons: [{ id: 'edit', permissions: [{ permission: 'device', actions: ['save'] }] }, { id: 'new' }],
    permissions: [{ permission: 'device', actions: ['save'] }], assetTypes: ['device', 'alarmConfig'] })]
  const { drafts } = createMenuDrafts(base, [current])
  const synced = synchronizeMenuDefinitions(drafts, base)
  const node = byId(synced, 'app')
  assert.equal(node.owner, 'app')
  assert.equal(node.parentId, 'external')
  assert.equal(node.sortIndex, 8)
  assert.equal(node.options.show, false)
  assert.deepEqual(node.permissions[0].actions, ['query', 'save'])
  assert.deepEqual(node.assetTypes, ['device', 'alarmConfig'])
  assert.deepEqual(node.buttons[0].permissions[0].actions, ['query', 'save'])
  assert.equal(node.buttons[1].id, 'new')
  assert.deepEqual(byId(drafts, 'app').permissions[0].actions, ['query'])
})

test('load queries both owners as flat definitions and preserves permission filtering and system entries', async () => {
  fixture([menu('project', 'iot', { showPage: ['query'] }), menu('application', 'app', { showPage: ['query'] }),
    menu('not-allowed', 'app', { showPage: ['query', 'missing'] })], [menu('application', 'app', { parentId: 'outside-query' })])
  const result = await loadMenuSettings()
  assert.equal(byId(result.drafts, 'application').parentId, 'outside-query')
  assert.equal(byId(result.drafts, 'application').options.show, true)
  assert.equal(byId(result.drafts, 'project').options.show, false)
  assert.equal(byId(result.drafts, 'not-allowed'), undefined)
  assert(result.preserved.some(node => node.code === 'account-center'))
  const query = calls.find(call => call.url === '/menu/_query/no-paging')
  assert.deepEqual(query.data.terms[0].terms[0].value, ['iot', 'app'])
  assert(query.data.terms[0].terms.some(term => term.termType === 'isnull'))
})

test('new application selections round-trip without losing metadata, owner or hidden state', () => {
  const base = [menu('app', 'app', { options: { appName: 'module', retained: 'value' },
    supportDataAccess: true, assetTypes: ['device'] })]
  const { drafts } = createMenuDrafts(base, [])
  drafts.app = selectMenu(drafts.app, 'app', true)
  const payloads = buildMenuPayloads(drafts, [])
  assert.equal(payloads.iot.length, 0)
  assert.equal(payloads.app[0].owner, 'app')
  assert.equal(payloads.app[0].supportDataAccess, true)
  assert.deepEqual(payloads.app[0].assetTypes, ['device'])
  const loaded = createMenuDrafts(base, payloads.app).drafts
  assert.equal(loaded.app[0].options.show, true)
  assert.equal(loaded.app[0].options.retained, 'value')
  loaded.app = selectMenu(loaded.app, 'app', false)
  const unchecked = buildMenuPayloads(loaded, []).app
  assert.equal(unchecked.length, 1)
  assert.equal(unchecked[0].owner, 'app')
  assert.equal(createMenuDrafts(base, unchecked).drafts.app[0].options.show, false)
})

test('existing personal-center definitions are preserved without inserting a duplicate default ID', async () => {
  fixture([], [menu('existing-center', 'iot', { code: 'account-center', options: { show: true } })])
  const result = await loadMenuSettings()
  assert.deepEqual(result.preserved.map(menu => menu.id), ['existing-center'])
})

test('save issues one call per owner including empty groups; reports business and transport failures and can retry', async () => {
  fixture()
  behavior['/menu/app/_all'] = async () => ({ success: false, status: 200 })
  const payloads = { iot: [menu('project')], app: [] }
  assert.deepEqual(await saveMenuSettings(payloads), ['app'])
  assert.deepEqual(calls.map(call => call.url), ['/menu/iot/_all', '/menu/app/_all'])
  assert.deepEqual(calls[1].data, [])
  behavior['/menu/iot/_all'] = async () => { throw new Error('offline') }
  assert.deepEqual(await saveMenuSettings(payloads), ['iot', 'app'])
  behavior = {}
  assert.deepEqual(await saveMenuSettings(payloads), [])
})

const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
})
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const mount = async () => {
  let state
  const app = renderer.createApp(defineComponent({ setup() { state = useMenuSetting(); return () => h('div') } }))
  app.mount({})
  await flush()
  return { state, app }
}

test('tab switches keep drafts and partial saves do not refresh or report success; retry saves both', async () => {
  fixture([menu('project', 'iot', { showPage: ['query'] }), menu('application', 'app', { showPage: ['query'] })])
  const { state, app } = await mount()
  assert.equal(state.activeOwner.value, 'iot')
  state.onSelect([], { node: { key: 'project' }, selected: true })
  state.activeOwner.value = 'app'
  state.onSelect([], { node: { key: 'application' }, selected: true })
  state.activeOwner.value = 'iot'
  assert.deepEqual(state.selectedKeys.value, ['project'])
  behavior['/menu/app/_all'] = async () => { throw new Error('offline') }
  state.visible.value = true
  await state.save()
  assert.equal(globalThis.menuFixture.reloads, 0)
  assert.equal(globalThis.menuFixture.messages.length, 0)
  assert.match(state.failureMessage.value, /MenuSetting.owner.app/)
  assert.equal(state.visible.value, true)
  assert.deepEqual(state.selectedKeys.value, ['project'])
  behavior = {}
  await state.save()
  assert.equal(globalThis.menuFixture.reloads, 1)
  assert.equal(globalThis.menuFixture.messages[0][1], 'success')
  const saves = calls.filter(call => call.method === 'patch')
  assert.equal(saves.length, 4)
  assert(saves.filter(call => call.url === '/menu/app/_all').every(call => call.data[0].options.show && call.data[0].owner === 'app'))
  app.unmount()
})

test('sync shares owner save flow while retaining current unsaved choices', async () => {
  fixture([menu('app', 'app', { showPage: ['query'], permissions: [{ permission: 'device', actions: ['save'] }] })],
    [menu('app', 'app', { permissions: [{ permission: 'device', actions: ['query'] }], options: { show: false } })])
  const { state, app } = await mount()
  state.activeOwner.value = 'app'
  state.onSelect([], { node: { key: 'app' }, selected: true })
  await state.save(true)
  const saved = calls.find(call => call.url === '/menu/app/_all').data[0]
  assert.equal(saved.owner, 'app')
  assert.equal(saved.options.show, true)
  assert.deepEqual(saved.permissions[0].actions, ['query', 'save'])
  assert.equal(calls.filter(call => call.method === 'patch').length, 2)
  app.unmount()
})

test('failed loads disable saving until a successful retry', async () => {
  fixture()
  behavior['/menu/_query/no-paging'] = async () => ({ success: false })
  const { state, app } = await mount()
  assert.equal(state.loadError.value, true)
  assert.equal(state.canSave.value, false)
  await state.save()
  assert.equal(calls.filter(call => call.method === 'patch').length, 0)
  behavior = {}
  await state.load()
  assert.equal(state.canSave.value, true)
  assert.equal(state.loadError.value, false)
  app.unmount()
})
