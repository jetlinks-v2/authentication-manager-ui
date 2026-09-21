const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const fs = require('node:fs')
const root = path.resolve(__dirname, '../../..')
const esbuild = require(path.join(root, 'node_modules/esbuild'))
const vue = require(path.join(root, 'node_modules/vue'))
const group = path.join(root, 'modules/authentication-manager-ui/visDashboard/ResourceCenter').replaceAll('\\', '/')
global.__gatewayRequest = {}
global.__gatewayRoute = vue.reactive({ params: {}, query: {} })
global.__gatewayPage = async () => ({ data: [], total: 0 })
const tick = async () => { await vue.nextTick(); await new Promise(resolve => setTimeout(resolve, 10)) }

;(async () => {
  const build = await esbuild.build({
    stdin: { contents: `export * from '${group}/services/gatewayStatus.ts'; export * from '${group}/hooks/useGatewayStatus.ts'`, resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'boundaries', setup(build) {
      build.onResolve({ filter: /^@jetlinks-web\/core$|^@jetlinks-web-core\/utils\/project-runtime$|^vue-router$|^vue-i18n$|api\/overview$/ }, args => ({ path: args.path, namespace: 'mock' }))
      build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
        args.path === '@jetlinks-web/core' ? 'export const request = global.__gatewayRequest' :
        args.path === 'vue-router' ? 'export const useRoute = () => global.__gatewayRoute' :
        args.path === 'vue-i18n' ? 'export const useI18n = () => ({t: key => key})' :
        args.path.endsWith('api/overview') ? 'export const queryOverviewGatewayPage = (...args) => global.__gatewayPage(...args)' :
        'export const getProjectCodeFromLocation = () => "project"' }))
    } }],
  })
  const module = new Module(path.join(root, 'gateway-check.cjs'))
  module.paths = Module._nodeModulePaths(root)
  module._compile(build.outputFiles[0].text, path.join(root, 'gateway-check.cjs'))
  const api = module.exports

  for (const value of [null, '', ' ', false, {}, [], -1, 'oops']) assert.equal(api.metricNumber(value), undefined)
  assert.equal(api.metricNumber(0), 0)
  global.__gatewayRequest.get = async () => { throw Error('GET metrics endpoint must not be called') }
  const gateway = {id:'a',name:'A',online:true}
  const pages=[]
  global.__gatewayPage=async(size,page)=>{pages.push(page);return {data:[{...gateway,id:page?'b':'a'}],total:2}}
  let requests=[]
  global.__gatewayRequest.post=async(url,body)=>{
    assert.equal(url,'/device/metrics/_agg'); requests.push(body)
    return {result:[{thingId:'b',queuePending:96},{thingId:'a',queuePending:0},{thingId:'outside',queuePending:100}]}
  }
  const now=Date.parse('2026-09-21T12:00:00+08:00')
  const ranking=await api.loadGatewayStatuses('queue',now)
  assert.deepEqual(pages,[0,1]);assert.deepEqual(ranking.gateways.map(x=>x.metrics.queue.value),[96,0])
  assert.deepEqual(requests[0],{thingIds:['a','b'],pointType:'edge-ai-gateway',metrics:[{pointId:'edge.ai.review.queue.pending',alias:'queuePending',aggregation:'LAST'}],from:'2026-09-21 11:40:00',to:'2026-09-21 12:00:00',groupBy:['thingId'],sorts:[{alias:'queuePending',order:'DESC'}],limit:10})
  for(const metric of ['cpu','memory','disk']){
    const def=api.metricDefinitions[metric]
    global.__gatewayRequest.post=async(url,body)=>{
      assert.equal(body.pointType,'device-health');assert.equal(body.metrics.length,1)
      assert.deepEqual(body.metrics[0],{pointId:def.pointId,alias:def.alias,aggregation:'LAST'})
      return {result:[{thingId:'a',[def.alias]:0.5},{thingId:'b',[def.alias]:null}]}
    }
    const result=await api.loadGatewayStatuses(metric,now)
    assert.equal(result.gateways[0].metrics[metric].value,0.5) // Never infer x100 from value magnitude.
    assert.equal(result.unit,'%');assert.equal(result.gateways.length,1)
  }
  global.__gatewayRequest.post=async()=>({result:[]})
  assert.deepEqual((await api.loadGatewayStatuses('queue')).gateways,[])
  global.__gatewayRequest.post=async(url,body)=>{
    assert.equal(url,'/device/metrics/_agg');assert.equal(body.interval,'15m')
    assert.equal(body.from,'2026-09-20 12:00:00');assert.equal(body.to,'2026-09-21 12:00:00')
    assert.equal(body.groupBy,undefined);assert.equal(body.labelGroupBy,undefined)
    assert.equal(body.metrics[0].aggregation,'LAST')
    return {result:[{timestamp:'2026-09-21 11:45:00',queuePending:9},{timestamp:'2026-09-21 11:15:00',queuePending:0},{timestamp:'2026-09-21 11:30:00',queuePending:null},{timestamp:'invalid',queuePending:100}]}
  }
  const points=await api.loadGatewayHistory('a','queue',now)
  assert.equal(points.length,96);assert.deepEqual(points.slice(-3).map(x=>x.value),[0,null,9])
  assert.ok(points[0].value===null);assert.deepEqual(api.normalizeGatewayHistory({result:[]},'queuePending',now-86400000,now),[])
  let calls=0
  global.__gatewayPage=async()=>{calls++;return {data:[gateway],total:1}}
  const scope=vue.effectScope(),preview=vue.ref(true);let widget
  scope.run(()=>{widget=api.useGatewayStatus(vue.ref({componentProps:{resourceCenterVideoPlaybackTrend:{refreshSeconds:0}}}),preview)})
  await tick();assert.equal(calls,0);assert.equal(widget.rows.value.length,10)
  const pending=[]
  global.__gatewayRequest.post=async(url,body)=>{
    const alias=body.metrics[0].alias
    if(!body.interval)return {result:[{thingId:'a',[alias]:20}]}
    return new Promise(resolve=>pending.push({resolve,alias}))
  }
  preview.value=false;await tick();assert.equal(pending.length,1)
  widget.metric.value='cpu';await tick();assert.equal(pending.length,2)
  const time=Math.floor(Date.now()/900000)*900000
  pending[1].resolve({result:[{timestamp:time,cpuUsage:35}]});await tick()
  pending[0].resolve({result:[{timestamp:time,queuePending:999}]});await tick()
  assert.equal(widget.points.value.at(-1).value,35)
  assert.equal(widget.hasHistory.value,true)
  assert.equal(widget.option.value.series[0].connectNulls,false)
  widget.metric.value='disk';await tick();scope.stop()
  pending[2].resolve({result:[{timestamp:time,diskUsage:77}]});await tick()
  assert.equal(widget.points.value.length,0)
  const compiler = require(path.join(root, 'node_modules/vue/compiler-sfc'))
  for (const file of ['components/GatewayStatusPanel.vue', 'VideoPlaybackTrend/VideoPlaybackTrend.vue', 'components/ResourceWidget.vue', 'components/ResourceConfig.vue']) {
    const source = fs.readFileSync(path.join(group, file), 'utf8')
    const { descriptor, errors } = compiler.parse(source)
    assert.deepEqual(errors, [])
    const script = compiler.compileScript(descriptor, { id: file })
    const template = compiler.compileTemplate({ source: descriptor.template.content, filename: file, id: file, compilerOptions: { bindingMetadata: script.bindings } })
    assert.deepEqual(template.errors, [])
    assert.ok(source.split('\n').length <= 300)
  }
  console.log('PASS: POST-only aggregation payloads, gateway pagination, fixed documented units, missing buckets, 24h LAST history, preview isolation, stale response protection, disposal and Vue compilation')
})().catch(error => { console.error(error); process.exitCode = 1 })
