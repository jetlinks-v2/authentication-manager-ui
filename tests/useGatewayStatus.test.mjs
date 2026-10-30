import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const vue = require('vue')
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../visDashboard/ResourceCenter/hooks/useGatewayStatus.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'boundaries', setup(api) {
  const boundaries = {
    'vue-router': 'export const useRoute=()=>({params:{},query:{}})',
    'vue-i18n': 'export const useI18n=()=>({t:key=>key})',
    '@vueuse/core': 'export const useDocumentVisibility=()=>context.visibility',
    '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>({getMenu:()=>true})',
    '../../useDashboardModules': 'export const useDashboardModules=()=>context.modules',
    '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation=()=>undefined',
    '../shared': 'export const settingsOf=()=>({limit:10,refreshSeconds:0})',
    '../services/gatewayStatus': `export const gatewayMetrics=['cpu','memory','disk','queue'];export const loadGatewayDirectory=async()=>context.directory;export const loadGatewayNodeStatuses=async()=>({gateways:context.directory,unit:'%',partialError:false});export const loadGatewayStatuses=async()=>({gateways:context.directory,unit:'%',partialError:false})`,
  }
  api.onResolve({ filter: /.*/ }, args => boundaries[args.path] ? {path:args.path,namespace:'stub'} : undefined)
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({contents:boundaries[args.path],loader:'js'}))
} }] })
const tick = async () => { await vue.nextTick(); await new Promise(setImmediate) }
function fixture(t, directory) {
  const context = {directory,visibility:vue.ref('visible'),modules:vue.ref({edge:true,vision:false})}
  const module = {exports:{}}
  Function('module','exports','require','context',compiled.outputFiles[0].text)(module,module.exports,require,context)
  const scope = vue.effectScope()
  const state = scope.run(() => module.exports.useGatewayStatus(vue.ref(undefined),vue.ref(false)))
  t.after(() => scope.stop())
  return state
}
const item = (id, connectionStatus, metrics = {}) => ({id,name:id,online:connectionStatus === 'online',connectionStatus,metrics})

test('small directory exposes distinct states in table', async t => {
  const state = fixture(t,[item('online','online'),item('offline','offline'),{...item('disabled','disabled'),connectionStatusText:'禁用'}])
  await tick()
  assert.equal(state.tableMode.value,true)
  const byId = Object.fromEntries(state.tableRows.value.map(row => [row.id,row]))
  assert.equal(byId.online.stateText,'resourceDashboard.online')
  assert.equal(byId.offline.stateText,'resourceDashboard.offline')
  assert.equal(byId.disabled.stateText,'禁用')
  assert.deepEqual([byId.online.stateBadge,byId.offline.stateBadge,byId.disabled.stateBadge],['success','error','default'])
})

test('ranking distinguishes disabled, offline and missing online metrics', async t => {
  const state = fixture(t,[item('sample','online',{cpu:{value:20}}),item('missing','online'),item('offline','offline',{cpu:{value:99}}),item('disabled','disabled',{cpu:{value:99}})])
  await tick()
  const byId = Object.fromEntries(state.rows.value.map(row => [row.id,row]))
  assert.equal(byId.sample.rank,1)
  assert.equal(byId.missing.rank,0)
  assert.equal(byId.missing.color,'#bfbfbf')
  assert.equal(byId.offline.rank,0)
  assert.equal(byId.offline.text,'resourceDashboard.offline')
  assert.equal(byId.offline.color,'#ff4d4f')
  assert.equal(byId.disabled.rank,0)
  assert.equal(byId.disabled.text,'resourceDashboard.disabled')
  assert.equal(byId.disabled.color,'#bfbfbf')
})
