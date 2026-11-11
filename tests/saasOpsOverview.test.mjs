import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url), vue = require('vue'), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const accountBundle = await build({entryPoints:[path.join(root,'visDashboard/Base/Saas/useSaasUtilities.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'account-boundaries',setup(b){
 const stubs={
  '@jetlinks-web-core/store/user':'export const useUserStore=()=>context.user',
  '@jetlinks-web-core/store/menu':'export const useMenuStore=()=>context.menu',
  'vue-i18n':'export const useI18n=()=>({t:key=>key})',
  '@jetlinks-web-core/utils/consts':"export const USER_CENTER_MENU_CODE='account-center'",
  '../../../useDashboardModules':'export const getDashboardModules=()=>({})',
  '../../shared/navigation':'export const HOME_TARGETS={}',
 }
 b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'stub'}:undefined)
 b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'js'}))
}}]})
function accountFixture() {
 const calls=[],granted=vue.reactive(new Set(['iot-user-device-list','iot-user/device/alarm']))
 const menu=vue.reactive({initialized:true,loading:false,get menuResultCache(){return [{children:[...granted].map(code=>({code}))}]},siderMenus:[{name:'resources',meta:{title:'资源中心'},children:[{name:'iot-user-device-list'}]},{name:'alarms',meta:{title:'告警中心'},children:[{name:'iot-user/device/alarm'}]},{name:'hidden',meta:{title:'隐藏入口',hideInMenu:true},children:[{name:'iot-user-device-list'}]}],getMenu:code=>granted.has(code)?{routeName:code}:undefined,jumpPage:code=>calls.push(code),routerPush:code=>calls.push(code)})
 const context={menu,granted,user:vue.reactive({userInfo:{id:'a',name:'李伟',username:'liwei',roleList:[{name:'设备运维'}],orgList:[{name:'运维组'}],loginInfo:{loginTime:1793790000000}}})}
 const mod={exports:{}};Function('module','exports','require','context',accountBundle.outputFiles[0].text)(mod,mod.exports,require,context)
 const edit=vue.ref(false),state=mod.exports.useSaasAccount(()=>edit.value)
 return {context,state,calls,edit}
}
test('account displays current identity and only authorized navigable menu groups',()=>{
 const f=accountFixture();assert.equal(f.state.profile.value.name,'李伟');assert.deepEqual(f.state.profile.value.roles,['设备运维'])
 assert.deepEqual(f.state.entries.value.map(x=>x.name),['资源中心','告警中心'])
 f.state.open('iot-user/device/alarm');assert.deepEqual(f.calls,['iot-user/device/alarm'])
 f.context.granted.delete('iot-user/device/alarm');assert.deepEqual(f.state.entries.value.map(x=>x.name),['资源中心'])
 f.state.open('iot-user/device/alarm');assert.equal(f.calls.length,1)
 f.edit.value=true;f.state.open('iot-user-device-list');f.state.openAccount();assert.equal(f.calls.length,1)
 f.context.user.userInfo.name='另一用户';f.context.user.userInfo.roleList=[];assert.equal(f.state.profile.value.name,'另一用户');assert.deepEqual(f.state.profile.value.roles,[])
})

const apiBundle=await build({entryPoints:[path.join(root,'api/overview.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'api-boundaries',setup(b){
 b.onResolve({filter:/^@jetlinks-web\/core$/},()=>({path:'request',namespace:'stub'}))
 b.onResolve({filter:/^@jetlinks-web-core\/locales$/},()=>({path:'i18n',namespace:'stub'}));
 // The request and i18n stubs have separate loaders to avoid importing the real application runtime.
 b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='i18n'?'export default {global:{t:key=>key}}':'export const request={post:(...args)=>context.post(...args)}'}))
}}]})
test('device breakdown reuses IoT asset scope and keeps failed categories unknown',async()=>{
 const calls=[],context={post:async(url,body)=>{calls.push({url,body});const kind=body.terms.find(x=>x.column==='deviceType')?.value;const offline=body.terms.some(x=>x.column==='state');if(kind==='gateway'&&offline)throw Error('offline query failed');if(kind==='childrenDevice'&&offline)return {result:null};return {result:kind==='device'?(offline?2:9):0}}}
 const mod={exports:{}};Function('module','exports','require','context',apiBundle.outputFiles[0].text)(mod,mod.exports,require,context)
 const rows=await mod.exports.queryOverviewIotDeviceBreakdown();assert.deepEqual(rows[0],{id:'device',value:9,offline:2});assert.deepEqual(rows[1],{id:'gateway',failed:true});assert.deepEqual(rows[2],{id:'childrenDevice',failed:true});assert.equal(calls.length,6)
 assert.ok(calls.every(call=>call.url==='/device/instance/_count'&&call.body.terms.some(term=>term.column==='productId$product-info'&&String(term.value).includes('accessProvider nin'))))
})

const dashboardBundle=await build({entryPoints:[path.join(root,'views/project/Overview/useSaasOverviewDashboard.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'dashboard-boundaries',setup(b){
 b.onResolve({filter:/\.vue$/},args=>({path:args.path,namespace:'component'}));b.onLoad({filter:/.*/,namespace:'component'},()=>({contents:'export default {}'}))
 const stubs={
  '@vueuse/core':'export const useElementSize=()=>({width:context.width})',
  '@jetlinks-web-core/store/user':'export const useUserStore=()=>context.user',
  '@jetlinks-web-core/components/DashBoardCanvas/utils/layout':'export const parseStoredLayout=value=>Array.isArray(value)?value:undefined',
  '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities':`import {ref} from 'vue';export const useResourceCapabilities=()=>({scope:ref('user/project/api/app'),loading:ref(false),errors:ref([]),reload:()=>{}})`,
  '../../../visDashboard/Base/Saas/services/access':'export const getSaasGrantedMenus=()=>context.granted;export const getSaasOverviewAccess=()=>context.access;export const getSaasProjectEntries=()=>[];export const hasSaasTarget=(menus,target)=>target.menus.some(code=>menus.has(code))',
  '../../../visDashboard/Base/shared/navigation':`export const HOME_TARGETS={usage:{menus:['quota']},applications:{menus:['apps']}}`,
  '../../../visDashboard/Base/shared/config':'export const createDefaults=()=>({chart:{}})',
  '../../../visDashboard/Base/QuickGuide/useQuickGuideSteps':`import {ref} from 'vue';export const useQuickGuideSteps=()=>({showGuide:ref(false)})`,
  '../../../visDashboard/Base/QuickGuide/quickGuideContext':'export const quickGuideContextKey=Symbol()',
  '../../../visDashboard/Base/Private/usePrivateApplicationEntry':"import {ref} from 'vue';export const usePrivateApplicationEntry=()=>({mode:ref('normal')})",
  '../../../visDashboard/Base/Saas/useSaasUtilities':'export const saasApplicationEntryKey=Symbol()',
 }
 b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'stub'}:undefined)
 b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'js'}))
}}]})
test('overview selects the account sidebar from actual menu grants, not role labels',()=>{
 const context={width:vue.ref(1400),user:vue.reactive({isAdmin:false,userInfo:{roleList:[{name:'设备运维'}]}}),granted:vue.reactive(new Set(['devices','alarm'])),access:vue.reactive({showResources:true,showToday:true,resourceIds:['devices'],todayIds:['deviceAlarm','message']})}
 const mod={exports:{}};Function('module','exports','require','context',dashboardBundle.outputFiles[0].text)(mod,mod.exports,require,context)
 const effect=vue.effectScope(),state=effect.run(()=>mod.exports.useSaasOverviewDashboard(vue.ref()))
 const types=()=>state.dashboard.value.components.map(item=>item.type)
 assert.ok(types().includes('projectHomeSaasAccount'));assert.ok(!types().includes('projectHomeApplications'))
 context.user.userInfo.roleList=[{name:'其他名称'}];assert.ok(types().includes('projectHomeSaasAccount'))
 context.granted.add('apps');assert.ok(types().includes('projectHomeApplications'));assert.ok(!types().includes('projectHomeSaasAccount'))
 context.granted.delete('apps');context.granted.add('quota');assert.ok(types().includes('projectHomeSaasQuotas'));assert.ok(!types().includes('projectHomeSaasAccount'))
 context.granted.clear();context.user.isAdmin=true;assert.ok(!types().includes('projectHomeSaasAccount'))
 context.user.isAdmin=false;context.access.showResources=false;context.access.showToday=false
 assert.ok(!types().includes('projectHomeSaasAccount'))
 effect.stop()
})
