import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

process.env.TZ = 'Asia/Shanghai'
const require = createRequire(import.meta.url), vue = require('vue')
const root = fileURLToPath(new URL('../', import.meta.url))
const messages = { ...JSON.parse(readFileSync(path.join(root, '../../jetlinks-web-core/src/locales/lang/zh.json'), 'utf8')), ...JSON.parse(readFileSync(path.join(root, 'locales/lang/zh.json'), 'utf8')) }
const t = (key, args = {}) => (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => args[k] ?? '')
const bundle = await build({ entryPoints: [path.join(root, 'views/project/Overview/useSaasSummary.ts')], bundle:true, write:false, platform:'node', format:'cjs', packages:'external', external:['vue','dayjs'], plugins:[{name:'boundaries',setup(b){
 const stubs={
  'vue-router':'export const useRoute=()=>context.route',
  'vue-i18n':'export const useI18n=()=>({t:context.t})',
  '@vueuse/core':'export const useNow=()=>context.now',
  '@jetlinks-web-core/utils/project-runtime':'export const getProjectCodeFromLocation=()=>context.code.value',
  '@jetlinks-web-core/utils/request-context':'export const getRequestBaseApi=()=>context.service.value',
  '@jetlinks-web-core/store/user':'export const useUserStore=()=>context.user',
  '../../../api/projectSummary':'export const getOverviewOrganization=(signal)=>context.load(signal)',
  '../../../visDashboard/Base/Saas/services/access':'export const getSaasOverviewAccess=()=>({showResources:true})',
  '../../../visDashboard/Base/shared/useHomeRuntime':"import {ref} from 'vue';export const useHomeRuntime=()=>({updatedAt:ref(undefined)})",
 }
 b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'stub'}:undefined)
 b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'js'}))
}}]})
function fixture(options={}) {
 const calls=[]
 const context={t,route:vue.reactive({fullPath:'/overview'}),code:vue.ref('project'),service:vue.ref('/api'),now:vue.ref(new Date(2026,9,30,10)),user:vue.reactive({userInfo:{id:'user',name:'张三',username:'account',type:{id:'mainAccount',name:'主账号'},roleList:[{name:'运维员'},{name:'其他角色'}],loginInfo:{loginTime:1793365107369,loginIpRegion:'其他地点'}}}),load:signal=>new Promise((resolve,reject)=>calls.push({signal,resolve,reject})),...options}
 const mod={exports:{}};Function('module','exports','require','context',bundle.outputFiles[0].text)(mod,mod.exports,require,context)
 const renderer=vue.createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},setText(){},setElementText(){},patchProp(){},parentNode:()=>null,nextSibling:()=>null})
 let state;const app=renderer.createApp({setup(){state=mod.exports.useSaasSummary();return()=>null}})
 const previous=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}};app.mount({})
 return {context,state,calls,deactivate(){app._instance.da?.forEach(h=>h())},activate(){app._instance.a?.forEach(h=>h())},close(){app.unmount();globalThis.window=previous}}
}
const tick=async()=>{await vue.nextTick();await new Promise(setImmediate)}
test('current user, first role and actual recent login are displayed with fixed Chongqing',async t=>{
 const f=fixture();t.after(()=>f.close());f.calls[0].resolve('根组织');await tick()
 assert.equal(f.state.summary.value.welcome,'上午好，张三')
 assert.deepEqual(f.state.summary.value.details,['根组织','运维员 等 2 个角色','最近登录：2026-10-30 20:58（重庆）'])
 assert.doesNotMatch(f.state.summary.value.details.join(' '),/主账号|其他角色|其他地点/)
 f.context.user.userInfo.name='李四';await tick();assert.equal(f.state.summary.value.welcome,'上午好，李四')
 f.context.user.userInfo.name='   ';await tick();assert.equal(f.state.summary.value.welcome,'上午好，account')
})
test('role summary responds to zero, one and multiple roles in returned order', async t=>{
 const f=fixture();t.after(()=>f.close());f.calls[0].resolve(undefined);await tick()
 const role=()=>f.state.summary.value.details.filter(x=>!x.startsWith('最近登录'))
 f.context.user.userInfo.roleList=[];await tick();assert.deepEqual(role(),[])
 f.context.user.userInfo.roleList=[{name:'单角色'}];await tick();assert.deepEqual(role(),['单角色'])
 f.context.user.userInfo.roleList=[{name:'首角色'},{name:'次角色'},{name:'第三角色'}];await tick();assert.deepEqual(role(),['首角色 等 3 个角色'])
 f.context.user.userInfo.roleList.reverse();await tick();assert.deepEqual(role(),['第三角色 等 3 个角色'])
})
test('identity falls back to meaningful account type when roles are empty and reacts to changes', async t=>{
 const f=fixture();t.after(()=>f.close());f.calls[0].resolve(undefined);await tick()
 const identity=()=>f.state.summary.value.details.filter(x=>!x.startsWith('最近登录'))
 f.context.user.userInfo.roleList=[];f.context.user.userInfo.type={id:'mainAccount',name:'超级管理员'};await tick();assert.deepEqual(identity(),['超级管理员'])
 f.context.user.userInfo.type.name='自定义身份';await tick();assert.deepEqual(identity(),['自定义身份'])
 f.context.user.userInfo.type={id:'mainAccount',name:'主账号'};await tick();assert.deepEqual(identity(),[])
 f.context.user.userInfo.type={id:'subAccount',name:'子账号'};await tick();assert.deepEqual(identity(),[])
 f.context.user.userInfo.type={id:'mainAccount',name:'超级管理员'};f.context.user.userInfo.roleList=[{name:'首角色'},{name:'次角色'},{name:'第三角色'}];await tick();assert.deepEqual(identity(),['首角色 等 3 个角色'])
 f.context.user.userInfo.roleList=[];await tick();assert.deepEqual(identity(),['超级管理员'])
})
test('invalid and absent login time or role are omitted',async t=>{
 const f=fixture();t.after(()=>f.close());f.calls[0].resolve(undefined);await tick()
 f.context.user.userInfo.roleList=[]
 for(const value of [undefined,null,'',true,false,'1793365107369',0,-1,'bad',NaN]) {f.context.user.userInfo.loginInfo.loginTime=value;await tick();assert.deepEqual(f.state.summary.value.details,[])}
})
test('no initialized user does not request; 403 and empty org hide only the organization',async t=>{
 const f=fixture({user:vue.reactive({userInfo:{}})});t.after(()=>f.close());assert.equal(f.calls.length,0)
 Object.assign(f.context.user.userInfo,{id:'u',name:'用户',roleList:[{name:'角色'}],loginInfo:{loginTime:1793365107369}});await tick()
 f.calls[0].reject(new Error('403'));await tick();assert.deepEqual(f.state.summary.value.details,['角色','最近登录：2026-10-30 20:58（重庆）'])
 const p=f.state.reload();f.calls[1].resolve(undefined);await p;assert.deepEqual(f.state.summary.value.details,['角色','最近登录：2026-10-30 20:58（重庆）'])
})
test('account, project and API changes abort and ignore late responses',async t=>{
 const f=fixture();t.after(()=>f.close())
 for (const mutate of [()=>f.context.user.userInfo.id='other',()=>f.context.code.value='other',()=>f.context.service.value='/other-api']) {
  const prev=f.calls.at(-1);mutate();await tick();assert.equal(prev.signal.aborted,true);const next=f.calls.at(-1);assert.notEqual(next,prev)
  next.resolve('新组织');await tick();prev.resolve('旧组织');await tick();assert.equal(f.state.summary.value.details[0],'新组织')
 }
})
test('deactivation and unmount abort pending work; activation reloads',async()=>{
 const f=fixture();f.deactivate();await tick();assert.equal(f.calls[0].signal.aborted,true);f.calls[0].resolve('旧组织');await tick();assert.ok(!f.state.summary.value.details.includes('旧组织'))
 f.activate();await tick();assert.equal(f.calls.length,2);f.calls[1].resolve('新组织');await tick();assert.equal(f.state.summary.value.details[0],'新组织')
 const p=f.state.reload();const pending=f.calls.at(-1);f.close();assert.equal(pending.signal.aborted,true);pending.resolve('离页组织');await p;assert.notEqual(f.state.summary.value.details[0],'离页组织')
})
test('greeting uses five periods, exact boundaries and reactive name',async t=>{
 const f=fixture();t.after(()=>f.close());f.calls[0].resolve(undefined)
 for(const [hour,greeting] of [[0,'晚上好'],[4,'晚上好'],[5,'早上好'],[8,'早上好'],[9,'上午好'],[11,'上午好'],[12,'中午好'],[13,'中午好'],[14,'下午好'],[17,'下午好'],[18,'晚上好'],[23,'晚上好']]) {f.context.now.value=new Date(2026,9,30,hour);await tick();assert.equal(f.state.summary.value.welcome,`${greeting}，张三`)}
})
test('organization query uses organization page ordering, hidden error and abort signal',async()=>{
 const built=await build({entryPoints:[path.join(root,'api/projectSummary.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'request',setup(b){b.onResolve({filter:/^@jetlinks-web\/core$/},()=>({path:'core',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const request=context.request'}));b.onResolve({filter:/^@jetlinks-web\/core\/src\/fetch$/},()=>({path:'fetch',namespace:'stub2'}));b.onLoad({filter:/.*/,namespace:'stub2'},()=>({contents:'export const ndJson={}' }))}}]})
 let response={result:[{name:'首根',children:[{name:'子组织'}]},{name:'第二根'}]}, calls=[];const context={request:{post:async(...args)=>{calls.push(args);return response}}}, mod={exports:{}};Function('module','exports','context',built.outputFiles[0].text)(mod,mod.exports,context)
 const signal=new AbortController().signal;assert.equal(await mod.exports.getOverviewOrganization(signal),'首根');assert.deepEqual(calls[0],['/organization/_all/tree',{paging:false,sorts:[{name:'sortIndex',order:'asc'},{name:'createTime',order:'asc'}]},{hiddenError:true,signal}])
 response={result:[]};assert.equal(await mod.exports.getOverviewOrganization(signal),undefined)
})

test('welcome reads its name getter once per recomputation', async () => {
 const built=await build({entryPoints:[path.join(root,'visDashboard/Base/Saas/useSaasWelcome.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'clock',setup(b){
  b.onResolve({filter:/^(@vueuse\/core|vue-i18n)$/},args=>({path:args.path,namespace:'stub'}))
  b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='vue-i18n'?'export const useI18n=()=>({t:context.t})':'export const useNow=()=>context.now'}))
 }}]})
 const context={t,now:vue.ref(new Date(2026,9,30,10))}, mod={exports:{}};Function('module','exports','require','context',built.outputFiles[0].text)(mod,mod.exports,require,context)
 let reads=0;const welcome=mod.exports.useSaasWelcome(()=>{reads++;return '用户'});assert.equal(welcome.value,'上午好，用户');assert.equal(reads,1)
})
