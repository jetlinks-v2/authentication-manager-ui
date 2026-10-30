import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url), { build } = require('esbuild'), vue = require('vue')
const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({
  stdin: { contents: `export * from ${JSON.stringify(path.join(root, 'visDashboard/Base/Saas/services/recentVisits.ts'))}; export * from ${JSON.stringify(path.join(root, 'visDashboard/Base/Saas/useSaasRecent.ts'))}`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.hot': 'false' },
  plugins: [{ name: 'boundaries', setup(api) {
    const boundaries = {
      'vue-router': 'export const useRouter=()=>context.router',
      'vue-i18n': 'export const useI18n=()=>({t:(key,params)=>{const value=context.translations?.[key] ?? key; return params ? value.replace("{time}",params.time) : value}})',
      '@vueuse/core': 'export const useNow=()=>context.now',
      '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>context.menu',
      '@jetlinks-web-core/store/user': 'export const useUserStore=()=>context.user',
      '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation=()=>context.project; export const getApplicationRuntimeEntry=()=>({applicationId:context.application})',
      '@jetlinks-web-core/utils/request-context': 'export const getBaseApi=()=>context.base',
      './access': 'export const getSaasGrantedMenus=()=>context.granted; export const hasSaasTarget=(granted,target)=>target.menus.some(code=>granted.has(code))',
      './services/access': 'export const getSaasGrantedMenus=()=>context.granted; export const hasSaasTarget=(granted,target)=>target.menus.some(code=>granted.has(code))',
      '@jetlinks-web-core/utils/deployment': 'export const isPrivateDeployment=()=>false',
    }
    api.onResolve({ filter: /^(vue-router|vue-i18n|@vueuse\/core|@jetlinks-web-core\/store\/(menu|user)|@jetlinks-web-core\/utils\/(project-runtime|request-context|deployment)|\.\/access|\.\/services\/access)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: boundaries[args.path], loader: 'js' }))
  } }],
})
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) } }
const route = (name, query = {}) => ({ name, params: {}, query, meta: { title: 'Devices' } })

test('recorder deduplicates authorized pages, filters sensitive query, rejects edit routes and revocation', () => {
  const saved = globalThis.localStorage; globalThis.localStorage = storage()
  try {
    const context = { now: vue.ref(new Date()), user: { userInfo: { id: 'a' } }, project: 'p', application: 'app', base: '/api', granted: new Set(['iot-user-device-list']), router: { afterEach(fn) { this.callback = fn; return () => {} } } }
    context.menu = { siderMenus: [], getMenu: code => code.startsWith('iot-user-device-list') ? { title: 'Devices', routeName: code, path: `/${code}` } : undefined, jumpPage() {} }
    const module = { exports: {} }; Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(module, module.exports, require, context)
    const api = module.exports, key = api.recentVisitStorageKey()
    api.ensureRecentVisitRecorder(context.router)
    const visit = context.router.callback
    visit(route('iot-user-device-list', { type: 'device', token: 'secret', arbitrary: 'no' }), {}, undefined)
    visit(route('iot-user-device-list', { type: 'device', token: 'changed' }), {}, undefined)
    visit(route('iot-user-device-list/Save'), {}, undefined)
    visit(route('project/Overview'), {}, undefined)
    visit(route('iot-user-device-list', {}), {}, new Error('navigation failure'))
    let rows = api.readRecentVisits(globalThis.localStorage, key)
    assert.equal(rows.length, 1)
    assert.deepEqual(rows[0].target.query, { type: 'device' })
    assert.ok(!JSON.stringify(rows).includes('secret'))
    const state = api.useSaasRecent()
    assert.equal(state.rows.value.length, 1)
    context.granted.delete('iot-user-device-list')
    api.recentVisitsRevision.value++
    assert.equal(state.rows.value.length, 0)
    visit(route('iot-user-device-list'), {}, undefined)
    assert.equal(api.readRecentVisits(globalThis.localStorage, key).length, 1)
    globalThis.localStorage.setItem(key, '{broken')
    assert.deepEqual(api.readRecentVisits(globalThis.localStorage, key), [])
    globalThis.localStorage.setItem(key, JSON.stringify([{ id: 'incomplete' }]))
    assert.deepEqual(api.readRecentVisits(globalThis.localStorage, key), [])
    context.project = 'other'
    assert.notEqual(api.recentVisitStorageKey(), key)
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved }
})

const defaultCodes = ['resources/Dashboard', 'iot-user-device-list', 'iot-user/device/alarm', 'video/event', 'iot-user/scene-linkage', 'system/ThirdPartyLogin']
const makeVisit = (code, index = 0, query = {}) => ({ id: `visit-${index}-${code}`, menuCode: code, ownerCode: code, title: `Visit ${index}`, visitedAt: 1700000000000 + index, target: { menus: [code], query } })
function recentFixture(codes = defaultCodes) {
  const store = storage(), granted = new Set(codes), available = new Set(codes)
  const context = { user: { userInfo: { id: 'fixture' } }, project: 'p', application: 'app', base: '/api', granted, now: vue.ref(new Date()),
    router: { afterEach() { return () => {} } }, menu: { siderMenus: [], getMenu: code => available.has(code) ? { title: code, routeName: code, path: `/${code}` } : undefined, jumpPage(...args) { this.lastJump = args } } }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(module, module.exports, require, context)
  const api = module.exports, key = api.recentVisitStorageKey()
  const setHistory = rows => { store.setItem(key, JSON.stringify(rows)); api.recentVisitsRevision.value++ }
  globalThis.localStorage = store
  return { api, context, granted, available, setHistory, state: api.useSaasRecent() }
}

test('history leads and defaults fill up to six without fabricated timestamps', () => {
  const saved = globalThis.localStorage
  try {
    const extra = Array.from({ length: 7 }, (_, i) => `extra/${i}`)
    const f = recentFixture([...defaultCodes, ...extra])
    for (const count of [0, 1, 4, 6, 7]) {
      const visits = extra.slice(0, count).map((code, i) => makeVisit(code, i))
      f.setHistory(visits)
      const rows = f.state.rows.value
      assert.equal(rows.length, 6, `history count ${count}`)
      assert.deepEqual(rows.slice(0, Math.min(count, 6)).map(row => row.id), visits.slice(0, 6).map(row => row.id))
      assert.equal(f.state.isStarting.value, count === 0)
      for (const row of rows.slice(Math.min(count, 6))) {
        assert.equal(row.description, `saasRecent.group.${row.id}`)
        assert.equal(row.target.menus.length, 1)
      }
    }
    f.setHistory([makeVisit(extra[0])])
    const first = f.state.rows.value.map(row => row.id)
    f.setHistory([makeVisit(extra[1], 1), makeVisit(extra[0])])
    const second = f.state.rows.value.map(row => row.id)
    assert.deepEqual(second.slice(0, 2), ['visit-1-extra/1', 'visit-0-extra/0'])
    assert.deepEqual(second.slice(2), first.slice(1, -1))
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved }
})

test('aliases deduplicate defaults and authorized routes preserve query on open', () => {
  const saved = globalThis.localStorage
  try {
    const alias = 'iot-user/device/list'
    const f = recentFixture([...defaultCodes, alias])
    const visit = makeVisit(alias, 0, { type: 'gateway', tab: 'detail' })
    f.setHistory([visit])
    assert.equal(f.state.rows.value[0].id, visit.id)
    assert.ok(!f.state.rows.value.some(row => row.id === 'devices'))
    f.state.open(f.state.rows.value[0].target)
    assert.deepEqual(f.context.menu.lastJump, [alias, { params: undefined, query: visit.target.query }])
    f.setHistory([])
    f.granted.delete('iot-user-device-list')
    f.api.recentVisitsRevision.value++
    const devices = f.state.rows.value.find(row => row.id === 'devices')
    assert.deepEqual(devices.target, { menus: [alias], query: { type: 'device' } })
    f.state.open(devices.target)
    assert.deepEqual(f.context.menu.lastJump, [alias, { params: undefined, query: { type: 'device' } }])
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved }
})

test('revoked or unavailable history and defaults are removed, including the all-empty case', () => {
  const saved = globalThis.localStorage
  try {
    const f = recentFixture()
    f.setHistory([makeVisit(defaultCodes[0]), makeVisit(defaultCodes[1], 1)])
    f.granted.delete(defaultCodes[0])
    f.available.delete(defaultCodes[1])
    f.api.recentVisitsRevision.value++
    assert.equal(f.state.isStarting.value, true)
    assert.deepEqual(f.state.rows.value.map(row => row.id), ['alarms', 'events', 'scenes', 'login'])
    f.granted.clear()
    f.api.recentVisitsRevision.value++
    assert.deepEqual(f.state.rows.value, [])
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved }
})


test('menu tree supplies current translated titles, inherited icons, paths and local dates for old history', () => {
  const saved = globalThis.localStorage
  try {
    const codes = ['devices', 'list', 'detail', 'orphan']
    const f = recentFixture(codes)
    f.context.translations = vue.reactive({ root: '资源中心', group: '设备管理', list: '设备列表', detail: '设备详情',
      'saasRecent.todayTime': '今天 {time}', 'saasRecent.yesterdayTime': '昨天 {time}' })
    f.context.now.value = new Date(2026, 9, 30, 10, 0)
    f.context.menu.siderMenus = vue.reactive([{ name: 'root', meta: { title: 'root', icon: 'RootIcon' }, children: [
      { name: 'devices', meta: { title: 'group', icon: 'GroupIcon' }, children: [
        { name: 'list', meta: { title: 'list', icon: 'ListIcon' } },
      ] },
    ] }])
    f.context.menu.getMenu = code => f.available.has(code) ? { routeName: code, title: code, path: `/${code}` } : undefined
    f.setHistory([
      { ...makeVisit('list'), ownerCode: 'list', title: 'Old stored title', visitedAt: new Date(2026, 9, 30, 9, 5).getTime() },
      { ...makeVisit('detail', 1), ownerCode: 'devices', visitedAt: new Date(2026, 9, 29, 23, 1).getTime() },
      { ...makeVisit('orphan', 2), visitedAt: new Date(2026, 9, 28, 8, 2).getTime() },
    ])
    let [list, detail, orphan] = f.state.rows.value
    assert.deepEqual([list.title, list.icon, list.fullPath, list.description], ['设备列表', 'GroupIcon', '资源中心 › 设备管理 › 设备列表', '资源中心 · 今天 09:05'])
    assert.deepEqual([detail.title, detail.icon, detail.fullPath, detail.description], ['设备详情', 'GroupIcon', '资源中心 › 设备管理 › 设备详情', '资源中心 · 昨天 23:01'])
    assert.deepEqual([orphan.icon, orphan.description], ['FileOutlined', 'orphan · 10-28 08:02'])
    f.context.menu.siderMenus[0].children[0].children[0].meta.icon = 'icon-yuandian'
    f.context.translations.list = 'Device list'
    f.context.translations.root = 'Resources'
    ;[list] = f.state.rows.value
    assert.deepEqual([list.title, list.icon, list.fullPath], ['Device list', 'GroupIcon', 'Resources › 设备管理 › Device list'])
    for (const icon of ['icon-yuandian', undefined]) {
      f.context.menu.siderMenus[0].children[0].meta.icon = icon
      assert.equal(f.state.rows.value[0].icon, 'RootIcon')
      assert.equal(f.state.rows.value[1].icon, 'RootIcon')
    }
    f.context.now.value = new Date(2026, 9, 31, 0, 1)
    assert.equal(f.state.rows.value[0].description, 'Resources · 昨天 09:05')
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved }
})

test('default uses real menu presentation and aliases resolving to the same route do not duplicate it', () => {
  const saved = globalThis.localStorage
  try {
    const f = recentFixture([...defaultCodes, 'alias-device'])
    f.context.menu.siderMenus = [{ name: 'root', meta: { title: 'Resources', icon: 'RootIcon' }, children: [
      { name: 'group', meta: { title: 'Devices', icon: 'DeviceIcon' }, children: [
        { name: 'device-route', meta: { title: 'Current devices', icon: 'LeafIcon' } },
      ] },
    ] }]
    f.context.menu.getMenu = code => f.available.has(code) ? { title: code, routeName: ['iot-user-device-list', 'alias-device'].includes(code) ? 'device-route' : code, path: `/${code}` } : undefined
    const device = f.state.rows.value.find(row => row.id === 'devices')
    assert.deepEqual([device.title, device.description, device.icon, device.fullPath], ['Current devices', 'Resources', 'DeviceIcon', 'Resources › Devices › Current devices'])
    f.setHistory([makeVisit('alias-device')])
    assert.equal(f.state.rows.value[0].title, 'Current devices')
    assert.ok(!f.state.rows.value.some(row => row.id === 'devices'))
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved }
})
