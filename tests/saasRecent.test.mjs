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
      'vue-i18n': 'export const useI18n=()=>({t:key=>key})',
      '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>context.menu',
      '@jetlinks-web-core/store/user': 'export const useUserStore=()=>context.user',
      '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation=()=>context.project; export const getApplicationRuntimeEntry=()=>({applicationId:context.application})',
      '@jetlinks-web-core/utils/request-context': 'export const getBaseApi=()=>context.base',
      './access': 'export const getSaasGrantedMenus=()=>context.granted; export const hasSaasTarget=(granted,target)=>target.menus.some(code=>granted.has(code))',
      './services/access': 'export const getSaasGrantedMenus=()=>context.granted; export const hasSaasTarget=(granted,target)=>target.menus.some(code=>granted.has(code))',
      '@jetlinks-web-core/utils/deployment': 'export const isPrivateDeployment=()=>false',
    }
    api.onResolve({ filter: /^(vue-router|vue-i18n|@jetlinks-web-core\/store\/(menu|user)|@jetlinks-web-core\/utils\/(project-runtime|request-context|deployment)|\.\/access|\.\/services\/access)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: boundaries[args.path], loader: 'js' }))
  } }],
})
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) } }
const route = (name, query = {}) => ({ name, params: {}, query, meta: { title: 'Devices' } })

test('recorder deduplicates authorized pages, filters sensitive query, rejects edit routes and revocation', () => {
  const saved = globalThis.localStorage; globalThis.localStorage = storage()
  try {
    const context = { user: { userInfo: { id: 'a' } }, project: 'p', application: 'app', base: '/api', granted: new Set(['iot-user-device-list']), router: { afterEach(fn) { this.callback = fn; return () => {} } } }
    context.menu = { getMenu: code => code.startsWith('iot-user-device-list') ? {} : undefined, jumpPage() {} }
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
