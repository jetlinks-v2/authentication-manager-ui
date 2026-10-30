import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const require = createRequire(import.meta.url)
const vue = require('vue')
const { renderToString } = require('vue/server-renderer')
const { parse, compileScript } = require('vue/compiler-sfc')
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.join(root, 'visDashboard/Base')
const bundle = await build({ stdin: { contents: `export { default as Resource } from ${JSON.stringify(path.join(base,'Saas/components/ResourceOverview.vue'))}; export { default as Today } from ${JSON.stringify(path.join(base,'Saas/components/TodayOverview.vue'))}; export { default as Applications } from ${JSON.stringify(path.join(base,'Applications/ProjectHomeApplications.vue'))}; export { default as AppView } from ${JSON.stringify(path.join(base,'Applications/components/HomeView.vue'))}`, resolveDir: root, loader: 'ts' }, bundle:true, write:false, platform:'node', format:'cjs', packages:'external', external:['vue'], plugins:[{name:'fixture',setup(b){
  b.onResolve({filter:/\.vue$/}, args => {
    if (/HomeIcon\.vue|CloudEmpty\/index\.vue|shared\/HomeWidget\.vue/.test(args.path)) return {path:args.path,namespace:'stub-vue'}
    return {path:path.resolve(args.resolveDir,args.path),namespace:'vue'}
  })
  b.onLoad({filter:/.*/,namespace:'vue'}, args => {const {descriptor,errors}=parse(readFileSync(args.path,'utf8'),{filename:args.path}); if(errors.length)throw errors[0]; const script=compileScript(descriptor,{id:args.path,inlineTemplate:true}); return {contents:script.content,loader:'ts',resolveDir:path.dirname(args.path)}})
  b.onLoad({filter:/.*/,namespace:'stub-vue'}, args => ({contents:args.path.includes('HomeWidget') ? `import {h} from 'vue'; export default { setup(_, {slots}) { return ()=>h('section', slots.empty?.()) } }` : `import {h} from 'vue'; export default {setup(_, {slots}) { return ()=>h('span',[slots.description?.(),slots.default?.()]) }}`,loader:'js'}))
  b.onResolve({filter:/^(vue-i18n|@ant-design\/icons-vue|@jetlinks-web-core\/store\/menu|.*useApplicationOpenGuard|.*useHomeApplications)$/},args=>({path:args.path,namespace:'stub-js'}))
  b.onLoad({filter:/.*/,namespace:'stub-js'}, args=>({contents:args.path==='vue-i18n' ? `import {ref} from 'vue'; export const useI18n=()=>({t:k=>k.split('.').pop(),locale:ref('zh-CN')})` : args.path.includes('icons-vue') ? `export const RightOutlined={render:()=>null}` : args.path.includes('useHomeApplications') ? `import {ref} from 'vue'; export const useHomeApplications=()=>({openingApplicationIds:ref([]),canOpenApp:()=>true,canCreateApp:ref(true),handleOpenApp:()=>{},handleCreateApp:()=>{}})` : args.path.includes('store/menu') ? `export const useMenuStore=()=>({getMenu:()=>false})` : `import {ref} from 'vue'; export const useApplicationOpenGuard=()=>({openingApplicationIds:ref([]),openApplication:()=>{}})`,loader:'js'}))
}}]})
const module={exports:{}}; Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,require)
const {Resource,Today,Applications,AppView}=module.exports
async function render(component,props){const app=vue.createSSRApp({render:()=>vue.h(component,props)}); app.component('a-badge',{render:()=>null}); app.component('a-tooltip',{render(){return this.$slots.default?.()}});app.component('j-ellipsis',{render(){return vue.h('span',this.$slots.default?.())}}); app.component('a-button',{render(){return vue.h('button',this.$slots.default?.())}});return renderToString(app)}
test('new project renders genuine resource zero and unknown distinctly',async()=>{
 const html=await render(Resource,{canOpen:()=>true,rows:[{id:'devices',label:'设备',value:0,unit:'台',statuses:[{labelKey:'online',value:0}]},{id:'video',label:'视频',value:0,failed:true}]})
 assert.match(html,/设备/);assert.match(html,/<strong>0<\/strong>/);assert.doesNotMatch(html,/saasOpenResource/);assert.match(html,/online 0/);assert.doesNotMatch(html,/metricUnknown/)
 assert.match(html,/视频[\s\S]*?<strong>—<\/strong>/)
})
test('new project today renders zero, existing messages and failed metric distinctly',async()=>{
 const html=await render(Today,{canOpen:()=>true,rows:[{id:'alarm',label:'告警',value:0,yesterday:0,unit:'条'},{id:'message',label:'消息',value:1248,yesterday:2031,unit:'条'},{id:'failed',label:'失败',value:0,yesterday:0,failed:true}]})
 assert.match(html,/告警[\s\S]*?<strong>0<\/strong>/);assert.match(html,/消息[\s\S]*?<strong>1,248<\/strong>/);assert.match(html,/失败[\s\S]*?<strong>—<\/strong>/)
})
test('new project applications empty slot presents an actionable empty state',async()=>{
 const html=await render(Applications,{});assert.match(html,/ApplicationsEmpty/);assert.match(html,/ApplicationsEmptyDesc/);assert.match(html,/ApplicationsCreate/)
})

test('resource view renders all eight authorized rows', async () => {
 const rows=Array.from({length:8},(_,i)=>({id:`resource-${i}`,label:`resource-${i}`,value:i}))
 const html=await render(Resource,{canOpen:()=>true,rows})
 for(const row of rows) assert.match(html,new RegExp(row.label))
})

test('overview catalog leaves resources and today uncapped and removes unauthorized blocks before layout', async () => {
 const entry=path.join(root,'views/project/Overview/useSaasOverviewDashboard.ts')
 const built=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'catalog-test',setup(b){
  b.onResolve({filter:/\.vue$/},args=>({path:args.path,namespace:'empty'}))
  b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export default {}',loader:'js'}))
  const stubs={useResourceCapabilities:`import {ref} from 'vue'; export const useResourceCapabilities=()=>({scope:ref('scope'),loading:ref(false),errors:ref([]),reload:()=>{}})`,access:`export const getSaasGrantedMenus=()=>context.menus; export const getSaasOverviewAccess=()=>context.access; export const hasSaasTarget=(menus,target)=>menus.has(target.key)`,navigation:`export const HOME_TARGETS={usage:{key:'usage'},applications:{key:'apps'}}`,config:`export const createDefaults=()=>({chart:{}})`,useHomeRuntime:`import {ref} from 'vue'; export const useHomeRuntime=(feature,edit,refresh,unused,polling,enabled)=>{ context.calls.push({feature,polling,enabled}); return {rows:ref(Array.from({length:feature==='SaasResources'?8:4},()=>({}))),loading:ref(false)} }`,useSaasUtilities:`import {ref} from 'vue'; export const useSaasUtilities=()=>({hasActions:ref(context.actions)})`}
  b.onResolve({filter:/(useResourceCapabilities|services\/access|shared\/navigation|shared\/config|shared\/useHomeRuntime|useSaasUtilities)$/},args=>({path:args.path.split('/').pop(),namespace:'bound'}))
  b.onLoad({filter:/.*/,namespace:'bound'},args=>({contents:stubs[args.path],loader:'js',resolveDir:root}))
 }}]})
 const context={calls:[],menus:new Set(['usage','apps']),access:{showResources:true,showToday:true,resourceIds:['devices','video','gateway','screen'],todayIds:['deviceAlarm','visionAlarm','message','aiEvent']},actions:true}, module={exports:{}}; Function('module','exports','require','context',built.outputFiles[0].text)(module,module.exports,require,context)
 const state=module.exports.useSaasOverviewDashboard(vue.ref(undefined))
 const chart=feature=>state.catalog.components[`projectHome${feature}`].defaultConfig.componentProps[`projectHome${feature}`].chart
 assert.equal(chart('SaasResources').maxItems,undefined);assert.equal(chart('SaasToday').maxItems,undefined)
 assert.equal(chart('Applications').maxItems,undefined);assert.equal(chart('Announcements').maxItems,4);assert.equal(chart('SaasQuotas').maxItems,5)
 assert.equal(state.dashboard.value.components.length,7)
 context.access.showResources=false; context.access.showToday=false; context.menus.clear(); context.actions=false
 const reduced=module.exports.useSaasOverviewDashboard(vue.ref(undefined)); assert.deepEqual(reduced.dashboard.value.components.map(x=>x.type),['projectHomeSaasRecent','projectHomeAnnouncements','projectHomeSaasHelp'])
 assert.equal(context.calls.length,0)
})


test('SaaS application list hides routine status but retains disabled status', async () => {
 const html=await render(AppView,{chart:{displayStyle:'saas',showDescription:true},canOpen:row=>row.application.status!=='disabled',rows:[{id:'one',label:'正常应用',application:{status:'enabled',statusText:'运行中'}},{id:'two',label:'停用应用',application:{status:'disabled',statusText:'已停用'}}]})
 assert.match(html,/正常应用/);assert.doesNotMatch(html,/运行中/);assert.match(html,/已停用/);assert.match(html,/disabled/)
})

test('application cards display the description or a no-description placeholder', async () => {
 const html=await render(AppView,{chart:{displayStyle:'saas',showDescription:true},canOpen:()=>true,rows:[
  {id:'with-description',label:'有描述',description:'现场设备工作台',application:{status:'enabled'}},
  {id:'without-description',label:'无描述',application:{status:'enabled'}},
 ]})
 assert.match(html,/现场设备工作台/);assert.match(html,/appNoDescription/)
})

test('application creation requires live menu add permission, navigation and non-preview', async () => {
 const entry=path.join(base,'Applications/useHomeApplications.ts')
 const built=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'app-access',setup(b){
  const stubs={auth:`export const useAuthStore=()=>({hasPermission:()=>context.allowed})`,menu:`export const useMenuStore=()=>({getMenu:()=>context.menu, jumpPage:(...args)=>context.calls.push(args)})`,config:`export const getHomeConfig=()=>({chart:{navigation:context.navigation}})`,navigation:`export const HOME_TARGETS={createApplication:{menus:['apps'],query:{action:'create'}}}`,useApplicationOpenGuard:`import {ref} from 'vue';export const useApplicationOpenGuard=()=>({openingApplicationIds:ref([]),openApplication:async()=>{}})`}
  b.onResolve({filter:/(store\/auth|store\/menu|shared\/config|shared\/navigation|useApplicationOpenGuard)$/},args=>({path:args.path.split('/').pop(),namespace:'bound'}))
  b.onLoad({filter:/.*/,namespace:'bound'},args=>({contents:stubs[args.path],loader:'js',resolveDir:root}))
 }}]})
 const context={allowed:true,menu:true,navigation:true,calls:[]}, module={exports:{}};Function('module','exports','require','context',built.outputFiles[0].text)(module,module.exports,require,context)
 for(const [allowed,menu,navigation,edit,expected] of [[true,true,true,false,true],[false,true,true,false,false],[true,false,true,false,false],[true,true,false,false,false],[true,true,true,true,false]]) {
  Object.assign(context,{allowed,menu,navigation}); const state=module.exports.useHomeApplications({isEdit:()=>edit,info:()=>undefined})
  assert.equal(state.canCreateApp.value,expected);const before=context.calls.length;state.handleCreateApp();assert.equal(context.calls.length-before,Number(expected))
 }
})

test('read-only today metric retains value and is disabled without an arrow', async () => {
 const html=await render(Today,{canOpen:target=>Boolean(target),rows:[{id:'event',label:'识别事件',value:7,yesterday:2,unit:'条'}]})
 assert.match(html,/<button[^>]*disabled/);assert.match(html,/<strong>7<\/strong>/);assert.doesNotMatch(html,/anticon-right/)
})

test('real HomeWidget hides partial-failure alerts and preserves full-error retry', async () => {
 const entry=path.join(base,'shared/HomeWidget.vue')
 const built=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'real-home-widget',setup(b){
  b.onResolve({filter:/\.vue$/},args=>args.path===entry?{path:entry,namespace:'real'}:{path:args.path,namespace:'stub'})
  b.onLoad({filter:/.*/,namespace:'real'},args=>{const {descriptor}=parse(readFileSync(args.path,'utf8'),{filename:args.path});return {contents:compileScript(descriptor,{id:'home',inlineTemplate:true}).content,loader:'ts',resolveDir:path.dirname(args.path)}})
  b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`import {h} from 'vue'; export default {props:['description'],render(){return h('div',{class:'full-error'},[this.description,this.$slots.default?.()])}}`,loader:'js'}))
  const stubs={ 'vue-i18n':`export const useI18n=()=>({t:k=>k,te:()=>false})`, 'ant-design-vue':`import {ref} from 'vue';export const theme={useToken:()=>({token:ref({})})}`, config:`export const getHomeConfig=()=>({chart:{displayStyle:'saas',navigation:false}})`,useHomeRuntime:`import {ref} from 'vue';export const useHomeRuntime=()=>({rows:ref(context.error?[]:[{label:'failure',failed:true}]),loading:ref(false),error:ref(context.error),retry:()=>{},available:ref(true),titleKey:ref('title'),updatedAt:ref(0)})`,useHomeNavigation:`export const useHomeNavigation=()=>({canOpen:()=>false,open:()=>{}})`,navigation:`export const HOME_MORE_TARGETS={}`,presentation:`export const failedMetricLabels=()=> 'failure'`}
  b.onResolve({filter:/^(vue-i18n|ant-design-vue|\.\/config|\.\/useHomeRuntime|\.\/useHomeNavigation|\.\/navigation|\.\.\/Saas\/services\/presentation)$/},args=>({path:args.path.split('/').pop(),namespace:'stub-js'}))
  b.onLoad({filter:/.*/,namespace:'stub-js'},args=>({contents:stubs[args.path],loader:'js'}))
 }}]})
 const context={error:false},mod={exports:{}};Function('module','exports','require','context',built.outputFiles[0].text)(mod,mod.exports,require,context)
 for(const [feature,alert] of [['SaasResources',false],['SaasToday',false],['Announcements',false]]) {
  const app=vue.createSSRApp({render:()=>vue.h(mod.exports.default,{feature,isEdit:false},{default:()=>vue.h('span','metric-content')})})
  app.component('a-card',{render(){return vue.h('section',this.$slots.default?.())}})
  app.component('a-alert',{render(){return vue.h('aside',{class:'warning'},this.$slots.action?.())}})
  app.component('a-button',{render(){return vue.h('button',this.$slots.default?.())}})
  const html=await renderToString(app)
  assert.match(html,/metric-content/);assert.equal(html.includes('class="warning"'),alert,feature)
 }
 context.error=true
 const app=vue.createSSRApp({render:()=>vue.h(mod.exports.default,{feature:'SaasQuotas',isEdit:false})})
 app.component('a-card',{render(){return vue.h('section',this.$slots.default?.())}})
 app.component('a-button',{render(){return vue.h('button',this.$slots.default?.())}})
 const html=await renderToString(app)
 assert.match(html,/full-error/);assert.match(html,/loadError/);assert.match(html,/<button>.*alarmRetry.*<\/button>/)
})
