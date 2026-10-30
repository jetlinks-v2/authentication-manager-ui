import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require=createRequire(import.meta.url),{build}=require('esbuild'),vue=require('vue'),root=fileURLToPath(new URL('../',import.meta.url))
const result=await build({entryPoints:[path.join(root,'views/resources/Dashboard/useResourcePage.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'scope-boundaries',setup(b){
 const stubs={
 'vue-i18n':'export const useI18n=()=>({t:key=>key})',
 '@jetlinks-web-core/utils/consts':'export const isSaaS=true',
 '@jetlinks-web-core/locales':'export default {global:{t:key=>key}}',
 '@jetlinks-web-core/store/menu':'export const useMenuStore=()=>context.menu',
 '@jetlinks-web-core/utils/module-registry':'export const moduleRegistry={hasModule:()=>true}',
 '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources':'export const dashboardSources=new Map()',
 '@jetlinks-web-core/components/DashBoardCanvas/discovery':"export const useDashboardCatalog=()=>({catalog:context.vue.ref({components:{}}),loading:context.vue.ref(false),reload:()=>{}})",
 '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities':'export const useResourceCapabilities=()=>context.capabilities;export const provideResourceCapabilities=()=>{}',
 '../../../visDashboard/ResourceCenter/hooks/videoSummaryContext':'export const provideVideoSummary=()=>{}',
 './useResourceSummary':'export const useResourceSummary=()=>({})',
 './services/resourceSummary':"export const getResourceSummaryKinds=a=>['edge','iot','video','visualization'].filter(k=>a[k])",
 '../../../../visDashboard/Base/shared/navigation':"export const HOME_TARGETS={devices:{menus:['iot-user-device-list']},video:{menus:['video/resources']},gateway:{menus:['iot-user-device-list']},screen:{menus:['visualization/project']},collector:{menus:['data-collect']},card:{menus:['iot-card/CardManagement']}}",
 './components/ResourceDashboardWidget.vue':'export default {}',
 }
 b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'fixture'}:undefined)
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'js'}))
}}]})
const context={vue,menu:vue.reactive({initialized:true,loading:false,menuResultCache:[{code:'iot-user-device-list'},{code:'video/resources'},{code:'algorithm-center'}]}),capabilities:{scope:vue.ref('user-a/project-a/api-a/app-a'),modules:vue.ref({})}}
const module={exports:{}};Function('module','exports','require','context',result.outputFiles[0].text)(module,module.exports,id=>id==='vue'?{...vue,provide:(_key,value)=>{context.provided=value}}:require(id),context)
test('resource canvas key isolates scopes, mode and authorized card set but not node count',async()=>{
 const width=vue.ref(1400),scope=vue.effectScope(),state=scope.run(()=>module.exports.useResourcePage(width));const initial=state.storageKey.value
 context.provided.onGatewayCount(2);await vue.nextTick();assert.equal(state.storageKey.value,initial)
 width.value=1500;await vue.nextTick();assert.equal(state.storageKey.value,initial)
 width.value=600;await vue.nextTick();assert.notEqual(state.storageKey.value,initial)
 width.value=1400;for(const value of ['user-b/project-a/api-a/app-a','user-a/project-b/api-a/app-a','user-a/project-a/api-b/app-a','user-a/project-a/api-a/app-b']){context.capabilities.scope.value=value;await vue.nextTick();assert.notEqual(state.storageKey.value,initial)}
 context.capabilities.scope.value='user-a/project-a/api-a/app-a';context.menu.menuResultCache=[{code:'iot-user-device-list'}];await vue.nextTick();assert.notEqual(state.storageKey.value,initial)
 assert.ok(!state.dashboard.value.components.some(item=>item.id==='resource-summary-video'||item.id==='resource-panel-vision'))
 scope.stop()
})
