const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../../..');
const esbuild = require(path.join(root,'node_modules/esbuild'));
const group = path.join(root,'modules/authentication-manager-ui/visDashboard/ResourceCenter');
let calls=[];
global.__resourceRequest={
  post:async(...args)=>{calls.push(args);throw new Error('Unexpected request '+args[0])},
  get:async(...args)=>{calls.push(args);throw new Error('Unexpected get '+args[0])}
};
(async()=>{
 const result=await esbuild.build({stdin:{contents:`export * from '${group}/services/distribution.ts';export * from '${group}/services/trends.ts';export * from '${group}/services/metrics.ts';export * from '${group}/shared.ts';export * from '${group}/hooks/useResourceWidget.ts';`,resolveDir:root},bundle:true,write:false,format:'cjs',platform:'node',packages:'external',plugins:[{name:'test-boundaries',setup(build){
 build.onResolve({filter:/^@jetlinks-web\/core$/},()=>({path:'request',namespace:'test'}));
 build.onResolve({filter:/^@jetlinks-web-core\/utils\/consts$/},()=>({path:'platform',namespace:'test'}));
 build.onResolve({filter:/^@jetlinks-web-core\/locales$/},()=>({path:'locale',namespace:'test'}));
 build.onResolve({filter:/api\/overview$/},()=>({path:'overview',namespace:'test'}));
 build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='platform'?'export const isSaaS=false':args.path==='locale'?'export default {global:{t:key=>key}}':args.path==='request'?'export const request=global.__resourceRequest':`export const queryOverviewDeviceIds=async()=>new Set(['iot-1','edge-1']); export const queryOverviewGatewaySummary=async()=>({total:5,online:3});export const queryOverviewIotDeviceSummary=queryOverviewGatewaySummary;export const queryOverviewChannelSummary=queryOverviewGatewaySummary;`}));
 }}]});
 const mod=new Module(path.join(root,'resource-check.cjs'));mod.paths=Module._nodeModulePaths(root);mod._compile(result.outputFiles[0].text,path.join(root,'resource-check.cjs'));
 const api=mod.exports;
 const spaces=api.flattenSpaces([{id:'parent',name:'园区',children:[{id:'child',name:'楼栋'}]}]);
 assert.equal(spaces.length,2);
 const rows=[{spaceId:'parent',deviceId:'iot-1'},{spaceId:'parent',deviceId:'iot-1'},{spaceId:'child',deviceId:'iot-1'},{spaceId:'parent',edgeDeviceId:'edge-1',deviceId:'cam',channelRecordId:'ch'},{spaceId:'parent',edgeDeviceId:'edge-2',deviceId:'cam',channelRecordId:'ch'}];
 assert.deepEqual(api.mapDistribution(spaces,rows,'iot',new Set(['iot-1'])).map(x=>x.value),[1,1]);
 assert.deepEqual(api.mapDistribution(spaces,rows,'video').map(x=>x.value),[2,0]);
 assert.deepEqual(api.mapDistribution(spaces,rows,'edge',new Set(['edge-1'])).map(x=>x.value),[1,0]);
 assert.throws(()=>api.numberOf(null));assert.throws(()=>api.numberOf('oops'));assert.equal(api.numberOf(0),0);
 const dayjs=require(path.join(root,'node_modules/dayjs'));const now=dayjs('2026-09-10T12:00:00');
 const yesterday=api.rangeOf('yesterday',now);assert.equal(dayjs(yesterday.from).format('YYYY-MM-DD HH:mm:ss'),'2026-09-09 00:00:00');assert.equal(dayjs(yesterday.to).format('YYYY-MM-DD HH:mm:ss'),'2026-09-09 23:59:59');
 for(const [range,limit] of [['today',24],['yesterday',24],['3d',3],['7d',7],['30d',30]])assert.equal(api.rangeOf(range,now).limit,limit);
 assert.equal(api.settingsOf('MessageTrend',{componentProps:{resourceCenterMessageTrend:{refreshSeconds:1,limit:100}}}).refreshSeconds,15);
 assert.equal(api.settingsOf('MessageTrend',{componentProps:{resourceCenterMessageTrend:{refreshSeconds:0}}}).refreshSeconds,0);
 assert.equal(api.settingsOf('DeviceDistribution',{componentProps:{resourceCenterDeviceDistribution:{limit:100}}}).limit,50);
 const partial=await api.settleMetrics({ok:async()=>7,failed:async()=>{throw Error('missing')}});assert.equal(partial[0].value,7);assert.equal(partial[1].failed,true);
 global.__resourceRequest.post=async(path,payload)=>{calls.push([path,payload]);if(path==='/dashboard/_multi')return {status:200,result:[{data:{timeString:'2026-09-10 02:00:00',value:2}},{data:{timeString:'2026-09-10 01:00:00',value:1}}]};throw Error(path)};
 assert.deepEqual((await api.loadMessageTrend('today')).map(x=>x.value),[1,2]);
 global.__resourceRequest.post=async(path,payload)=>payload[0].measurement==='rank'?{status:200,result:[{data:{value:{cardId:'c2',id:'222',sum:20}}},{data:{value:{cardId:'c1',id:'111',sum:30}}}]}:{status:200,result:[{group:'month',data:{value:10}},{group:'month',data:{value:20}},{group:'year',data:{value:100}}]};
 const flow=await api.loadNetworkCards();assert.equal(flow.metrics.find(x=>x.key==='month').value,30);assert.deepEqual(flow.ranking.map(x=>x.id),['c1','c2']);
 global.__resourceRequest.post=async(path,payload)=>{if(payload[0].measurement==='rank')throw Error('rank unavailable');return {status:200,result:[]}};
 const failedRank=await api.loadNetworkCards();assert.equal(failedRank.rankingFailed,true);assert.equal(failedRank.metrics[0].value,0);
 const {effectScope,ref,nextTick}=require(path.join(root,'node_modules/vue'));
 const pending=[];global.__resourceRequest.post=(path,payload)=>new Promise(resolve=>pending.push(resolve));
 const scope=effectScope();const edit=ref(false);let widget;
 scope.run(()=>{widget=api.useResourceWidget('MessageTrend',ref({componentProps:{resourceCenterMessageTrend:{refreshSeconds:0}}}),edit)});
 assert.equal(pending.length,1);widget.timeRange.value='7d';await nextTick();assert.equal(pending.length,2);
 pending[1]({status:200,result:[{data:{timeString:'2026-09-10',value:7}}]});await new Promise(resolve => setTimeout(resolve, 20));
 pending[0]({status:200,result:[{data:{timeString:'2026-09-09',value:1}}]});await new Promise(resolve => setTimeout(resolve, 20));
 assert.equal(widget.data.value.series[0].value,7);assert.equal(widget.loading.value,false);
 edit.value=true;await nextTick();assert.equal(pending.length,2);assert.equal(widget.data.value.series.length,24);
 edit.value=false;await nextTick();assert.equal(pending.length,3);scope.stop();
 pending[2]({status:200,result:[{data:{timeString:'2026-09-10',value:99}}]});await new Promise(resolve => setTimeout(resolve, 20));assert.notEqual(widget.data.value.series[0]?.value,99);
 global.__resourceRequest.get=async(path)=>{
   calls.push([path]);
   if(path==='/ai/edge/task/coverage/scene/_counts')return {status:200,result:[
     {sceneId:'demoData',sceneName:'消防通道检测',taskTarget:{value:'SmokingBehaviorDetection',text:'抽烟行为检测'},gatewayCount:1,channelCount:1}
   ]};
   if(path==='/ai/edge/task/coverage/scene/_count')return {status:200,result:{channelCount:1}};
   throw Error(path);
 };
 const algoScope=effectScope();let algoWidget;
 algoScope.run(()=>{algoWidget=api.useResourceWidget('AlgorithmCoverage',ref({}),ref(false))});
 await new Promise(resolve => setTimeout(resolve, 20));
 assert.equal(algoWidget.data.value.algorithms.length,2);
 assert.equal(algoWidget.data.value.algorithms[0].name,'抽烟行为检测');
 assert.equal(algoWidget.data.value.algorithms[0].value,1);
 assert.equal(algoWidget.data.value.algorithms.find(x=>x.id==='unconfigured').value,4);
 algoScope.stop();
 const videoScope=effectScope();let videoWidget;
 videoScope.run(()=>{videoWidget=api.useResourceWidget('VideoPlaybackTrend',ref({}),ref(false))});
 await new Promise(resolve => setTimeout(resolve, 20));
 assert.equal(videoWidget.data.value.series.length,24);
 videoScope.stop();
 console.log('PASS: lifecycle stale responses, unmount cleanup, preview request isolation;  distribution deduplication, device scopes, tree flattening, invalid metrics, five natural-day ranges, config bounds, partial errors, trend ordering, flow sums/ranking and independent failure; algorithm coverage and video playback trend widgets');
})().catch(error=>{console.error(error);process.exitCode=1});
