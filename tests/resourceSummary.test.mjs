import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../', import.meta.url))
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../views/resources/Dashboard/services/resourceSummary.ts', import.meta.url))], bundle:true, write:false, platform:'node', format:'cjs', packages:'external', define:{'import.meta.env':'{}'}, plugins:[{name:'boundaries',setup(api) {
  const stubs = {
    '../../useDashboardModules':'export const getDashboardModules=()=>({})',
    '../../../../api/overview': `export { buildOverviewDeviceTerms } from ${JSON.stringify(root + 'api/overview.ts')}; export const queryOverviewChannelBreakdown=(scope)=>context.channels(scope)`,
    '../../../../visDashboard/Base/shared/navigation':'export const HOME_TARGETS={gateway:{},devices:{},video:{},card:{},collector:{},screen:{},image:{menus:[]},component:{menus:[]},model:{menus:[]},template:{menus:[]}}',
    '@jetlinks-web/core':'export const request={post:()=>{throw Error("unexpected request")}}',
    '@jetlinks-web-core/locales':'export default {global:{t:key=>key}}',
    '@jetlinks-web-core/store/menu':'export const useMenuStore=()=>({initialized:true,loading:false,menuResultCache:[]})',
    '@jetlinks-web-core/utils/module-registry':'export const moduleRegistry={hasModule:()=>true}',
    '../../../../visDashboard/Base/Private/services/query':'export const queryPrivateCount=(...args)=>context.count(...args)',
  }
  api.onResolve({filter:/.*/},args=>stubs[args.path] ? {path:args.path,namespace:'stub'} : undefined)
  api.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'js',resolveDir:root}))
} }] })
function fixture(failure, channelResult = []) {
  const calls=[]
  const context={channels: async scope => { calls.push({ scope }); if (channelResult instanceof Error) throw channelResult; return channelResult }, count:async (path,terms=[])=>{
    calls.push({path,terms})
    const state=terms.find(term=>term.column==='state')?.value
    if(failure !== undefined && state===failure) throw Error('count failed')
    return ({online:1,offline:3,notActive:1})[state] ?? 5
  }}
  const module={exports:{}}
  Function('module','exports','require','context',compiled.outputFiles[0].text)(module,module.exports,require,context)
  return {api:module.exports,calls}
}
const access={saas:true,edge:true,iot:true,video:true,visualization:false}

test('edge totals and three states use consistent gateway scope and independent counts',async()=>{
  const {api,calls}=fixture()
  const cards=api.createResourceSummaryCards(access)
  const edge=cards.find(card=>card.id==='edge')
  assert.deepEqual(edge.statuses.map(s=>[s.key,s.labelKey,s.tone]),[['online','resourcePage.summary.online','success'],['offline','resourcePage.summary.offline','error'],['disabled','resourceDashboard.disabled','default']])
  assert.deepEqual(cards.find(card=>card.id==='iot').statuses.map(s=>s.key),['online','offline'])
  assert.deepEqual(cards.find(card=>card.id==='video').statuses.map(s=>s.key),['online','offline'])
  const result=await api.loadResourceSummary(edge,access)
  assert.equal(result.value,5)
  assert.deepEqual(result.statuses.map(s=>s.value),[1,3,1])
  assert.equal(calls.length,4)
  assert.ok(calls.every(c=>c.path==='/device/instance/_count'))
  const base=calls.find(c=>!c.terms.some(t=>t.column==='state')).terms
  assert.ok(base.some(t=>t.column==='productId$product-info' && t.value==='accessProvider in (agent-device-gateway,agent-media-device-gateway)'))
  for(const call of calls) assert.deepEqual(call.terms.filter(t=>t.column!=='state'),base)
  assert.deepEqual(calls.flatMap(c=>c.terms.filter(t=>t.column==='state').map(t=>t.value)).sort(),['notActive','offline','online'])
})

test('an individual edge count failure stays failed while other counts survive',async()=>{
  const {api}=fixture('offline')
  const edge=api.createResourceSummaryCards(access).find(card=>card.id==='edge')
  const result=await api.loadResourceSummary(edge,access)
  assert.equal(result.value,5)
  assert.deepEqual(result.statuses.map(s=>[s.value,Boolean(s.failed)]),[[1,false],[undefined,true],[1,false]])
})

for (const saas of [true, false]) {
  test(`${saas ? 'SaaS' : 'private'} video card counts channels from all sources`, async () => {
    const groups = [{ id: 'onvif', total: 10, online: 4 }, { id: 'agent', total: 12, online: 5 }, { id: 'extension', total: 8, online: 2 }]
    const { api, calls } = fixture(undefined, groups)
    const currentAccess = { ...access, saas }
    const card = api.createResourceSummaryCards(currentAccess).find(item => item.id === 'video')
    assert.equal(card.labelKey, 'resourcePage.summary.video')
    assert.equal(card.unitKey, 'resourcePage.summary.unitChannels')
    const result = await api.loadResourceSummary(card, currentAccess)
    assert.equal(result.value, 30)
    assert.deepEqual(result.statuses.map(item => [item.key, item.value, Boolean(item.failed)]), [['online', 11, false], ['offline', 19, false]])
    assert.deepEqual(calls, [{ scope: 'all' }])
  })
}

test('empty channel collection produces zero counts', async () => {
  const { api, calls } = fixture()
  const card = api.createResourceSummaryCards(access).find(item => item.id === 'video')
  const result = await api.loadResourceSummary(card, access)
  assert.equal(result.value, 0)
  assert.equal(Boolean(result.failed), false)
  assert.deepEqual(result.statuses.map(item => [item.value, Boolean(item.failed)]), [[0, false], [0, false]])
  assert.deepEqual(calls, [{ scope: 'all' }])
})

test('channel loading failure marks total and states as failed', async () => {
  const { api, calls } = fixture(undefined, Error('channel load failed'))
  const card = api.createResourceSummaryCards(access).find(item => item.id === 'video')
  const result = await api.loadResourceSummary(card, access)
  assert.equal(result.value, undefined)
  assert.equal(result.failed, true)
  assert.deepEqual(result.statuses.map(item => [item.value, item.failed]), [[undefined, true], [undefined, true]])
  assert.deepEqual(calls, [{ scope: 'all' }])
})
