import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const vue = require('vue')
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../views/project/Overview/useSaasSummary.ts', import.meta.url))], bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue','dayjs'],plugins:[{name:'boundaries',setup(b){
  const stubs={
    'vue-router':'export const useRoute=()=>context.route',
    '@jetlinks-web-core/utils/project-runtime':'export const getProjectCodeFromLocation=()=>context.code.value;export const getProjectCodeFromPathname=()=>context.code.value',
    '@jetlinks-web-core/utils/project-storage':'export const isProjectStorageEnabled=()=>context.enabled.value;export const getProjectStorage=()=>context.cache.value',
    '@jetlinks-web-core/utils/request-context':'export const getRequestBaseApi=()=>context.service.value',
    '@jetlinks-web-core/store/user':'export const useUserStore=()=>context.user',
    '../../../api/projectSummary':'export const getCurrentProjectSummary=(...args)=>context.load(...args)',
    '../../../visDashboard/Base/Saas/services/access':'export const getSaasOverviewAccess=()=>({showResources:true})',
    '../../../visDashboard/Base/shared/useHomeRuntime':"import {ref} from 'vue';export const useHomeRuntime=()=>({updatedAt:ref(undefined)})",
  }
  b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'stub'}:undefined)
  b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'js'}))
}}]})
function fixture(options={}) {
  const calls=[]
  const context={route:vue.reactive({fullPath:'/overview'}),code:vue.ref('p_otygwy'),enabled:vue.ref(true),cache:vue.ref({id:'project-id'}),service:vue.ref('/api'),user:vue.reactive({userInfo:{id:'user'}}),load:(id,signal)=>new Promise((resolve,reject)=>calls.push({id,signal,resolve,reject})),...options}
  const module={exports:{}}
  Function('module','exports','require','context',bundle.outputFiles[0].text)(module,module.exports,require,context)
  const renderer=vue.createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},setText(){},setElementText(){},patchProp(){},parentNode:()=>null,nextSibling:()=>null})
  let state;const app=renderer.createApp({setup(){state=module.exports.useSaasSummary();return()=>null}})
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}};app.mount({})
  return {context,state,calls,deactivate(){app._instance.da?.forEach(hook => hook())},activate(){app._instance.a?.forEach(hook => hook())},close(){app.unmount();globalThis.window=oldWindow}}
}
const tick=async()=>{await vue.nextTick();await new Promise(setImmediate)}
test('real Vue immediate watcher loads current project and retains code instead of database ID',async t=>{
 const f=fixture();t.after(()=>f.close());assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,'project-id')
 f.calls[0].resolve({id:'project-id',name:'真实项目',expireTime:new Date(2026,10,18).getTime()});await tick()
 assert.deepEqual(f.state.summary.value,{id:'p_otygwy',name:'真实项目',expiresAt:'2026-11-18',updatedAt:undefined})
})
test('no context does not request; context change aborts and ignores old response',async t=>{
 const empty=fixture({code:vue.ref(''),cache:vue.ref(undefined)});assert.equal(empty.calls.length,0);empty.close()
 const f=fixture();t.after(()=>f.close());f.context.code.value='p_new';await tick();assert.equal(f.calls.length,2);assert.equal(f.calls[0].signal.aborted,true)
 f.calls[1].resolve({id:'new',name:'新项目'});await tick();f.calls[0].resolve({id:'old',name:'旧项目'});await tick();assert.equal(f.state.summary.value.name,'新项目');assert.equal(f.state.summary.value.id,'p_new')
})

test('authorization selects only matching or unique tenant and never invents names or expiry', async () => {
  let response = { status: 200, result: { dimensions: [
    { id: 'one', name: '项目一', type: { id: 'tenant' } },
    { id: 'two', name: '项目二', type: 'tenant' },
  ] } }
  const calls = []
  const result = await build({ entryPoints: [fileURLToPath(new URL('../api/projectSummary.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [{ name: 'auth', setup(b) {
    b.onResolve({ filter: /^@jetlinks-web-core\/api\/auth$/ }, () => ({ path: 'auth', namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const getMe_api=(options)=>context.get(options)' }))
  } }] })
  const module = { exports: {} }
  Function('module', 'exports', 'context', result.outputFiles[0].text)(module, module.exports, { get: async options => { calls.push(options); return response } })
  const signal = new AbortController().signal
  assert.deepEqual(await module.exports.getCurrentProjectSummary('two', signal), { id: 'two', name: '项目二' })
  assert.equal(calls[0].applicationScope, false)
  assert.equal(calls[0].hiddenError, true)
  assert.equal(calls[0].signal, signal)
  await assert.rejects(module.exports.getCurrentProjectSummary(), /unavailable/)
  await assert.rejects(module.exports.getCurrentProjectSummary('missing'), /unavailable/)
  response = { status: 200, result: { dimensions: [{ id: 'one', name: 'one', type: 'tenant' }] } }
  assert.deepEqual(await module.exports.getCurrentProjectSummary(), { id: 'one', name: undefined })
  response = { status: 403, success: false }
  await assert.rejects(module.exports.getCurrentProjectSummary(), /Invalid/)
})

test('error exposes retry, absent and invalid expiration stay hidden; account changes invalidate old data', async t => {
  const f = fixture()
  t.after(() => f.close())
  f.calls[0].reject(new Error('unavailable'))
  await tick()
  assert.equal(f.state.error.value, true)
  const retry = f.state.reload()
  f.calls[1].resolve({ id: 'project-id', name: '项目', expireTime: -1 })
  await retry
  assert.equal(f.state.error.value, false)
  assert.equal(f.state.summary.value.expiresAt, undefined)
  f.context.user.userInfo.id = 'other-user'
  await tick()
  assert.equal(f.calls.length, 3)
  assert.equal(f.state.summary.value.name, undefined)
  f.calls[2].resolve({ id: 'project-id', name: '新账号' })
  await tick()
  assert.equal(f.state.summary.value.name, '新账号')
  assert.equal(f.state.summary.value.expiresAt, undefined)
})

test('disabled project storage skips lookup and cached project name is shown while loading', async t => {
  const disabled = fixture({ enabled: vue.ref(false) })
  assert.equal(disabled.calls.length, 0)
  disabled.close()
  const f = fixture({ cache: vue.ref({ id: 'project-id', projectName: '缓存名称' }) })
  t.after(() => f.close())
  assert.equal(f.state.summary.value.name, '缓存名称')
  f.calls[0].resolve({ id: 'project-id', name: '真实名称', expireTime: null })
  await tick()
  assert.equal(f.state.summary.value.name, '真实名称')
  assert.equal(f.state.summary.value.expiresAt, undefined)
})


test('deactivation invalidates pending work and activation reloads the project', async t => {
  const f = fixture()
  t.after(() => f.close())
  f.deactivate()
  await tick()
  assert.equal(f.calls[0].signal.aborted, true)
  f.calls[0].resolve({ id: 'project-id', name: '旧项目' })
  await tick()
  assert.equal(f.state.summary.value.name, undefined)
  f.activate()
  await tick()
  assert.equal(f.calls.length, 2)
  f.calls[1].resolve({ id: 'project-id', name: '恢复项目' })
  await tick()
  assert.equal(f.state.summary.value.name, '恢复项目')
})
