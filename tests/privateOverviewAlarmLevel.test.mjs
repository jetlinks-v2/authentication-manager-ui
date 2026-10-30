import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => 'zh' }, configurable: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const alarm = path.join(root, 'visDashboard/Base/Private/services/alarms.ts')
const levels = path.resolve(root, '../rule-engine-manager-ui/api/alarmLevel.ts')
const { outputFiles } = await build({ stdin: { contents: `export * from ${JSON.stringify(alarm)}; export { queryAlarmLevelOptions as realQuery, normalizeAlarmLevelValue as realNormalize } from ${JSON.stringify(levels)}`, resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'stubs', setup(b) {
  const stub = (filter, contents) => { const ns = `s${Math.random()}`; b.onResolve({ filter }, () => ({ path: 'stub', namespace: ns })); b.onLoad({ filter: /.*/, namespace: ns }, () => ({ contents, loader: 'js' })) }
  stub(/^@jetlinks-web-core\/utils\/module-registry$/, 'export const moduleRegistry = { getResource: () => context.levelApi }')
  stub(/^@jetlinks-web\/core$/, 'export const request = { post: (...args) => context.post(...args), get: (...args) => context.get(...args) }')
  stub(/^@jetlinks-web-core\/utils\/consts$/, 'export const langKey="zh"')
  stub(/\/access$/, 'export const getPrivateOverviewAccess=()=>({iotAlarm:true}); export const PRIVATE_TARGETS={iotAlarm:{menus:["alarm"]}}')
} }] })
function fixture() {
  const rows = [1, '2', {value:'3'}].map((level, i) => ({id:String(i),alarmName:`a${i}`,alarmTime: 1000+i,level}))
  const context = {
    get: async () => ({ result: { levels: [{level:1,title:'紧急'}, {level:2,title:'严重'}, {level:3,title:'一般'}] } }),
    post: async url => url.endsWith('_query') ? { result: {total:rows.length,data:rows} } : url.endsWith('_aggregation') ? { result: [] } : {result:0},
  }
  const module = {exports:{}}
  Function('module','exports','require','context',outputFiles[0].text)(module,module.exports,require,context)
  context.levelApi = { queryAlarmLevelOptions: module.exports.realQuery, normalizeAlarmLevelValue: module.exports.realNormalize }
  return { api:module.exports, context }
}
test('recent records preserve numeric, string and object levels through real dictionary normalization', async () => {
  const {api} = fixture()
  const rows = (await api.loadPrivateAlarms()).latest
  assert.deepEqual(rows.map(row => [row.level,row.tone]), [['一般','med'],['严重','high'],['紧急','high']])
})
test('failed dictionary preserves records without invented level or tone', async () => {
  const {api,context} = fixture()
  context.get = async () => {throw Error('dictionary unavailable')}
  const result = await api.loadPrivateAlarms()
  assert.equal(result.latest.length,3)
  assert.ok(result.latest.every(row => row.level === undefined && row.tone === undefined))
  assert.equal(result.sources[0].levelsFailed,true)
})

test('missing optional rule module keeps recent records with unknown levels', async () => {
  const {api,context}=fixture(); context.levelApi=undefined
  const result=await api.loadPrivateAlarms()
  assert.equal(result.latest.length,3); assert.ok(result.latest.every(row=>row.level===undefined)); assert.equal(result.sources[0].levelsFailed,true)
})
