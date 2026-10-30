import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require=createRequire(import.meta.url), {build}=require('esbuild'), {effectScope}=require('vue')
const root=fileURLToPath(new URL('../',import.meta.url))
const {outputFiles}=await build({entryPoints:[path.join(root,'visDashboard/Base/Private/usePrivateOverview.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'fixture',setup(b){
 const stub=(filter,contents)=>{const ns=`s${Math.random()}`;b.onResolve({filter},()=>({path:'stub',namespace:ns}));b.onLoad({filter:/.*/,namespace:ns},()=>({contents,loader:'js'}))}
 stub(/^vue-i18n$/,`import {ref} from 'vue';export const useI18n=()=>({locale:ref('zh')})`)
 stub(/store\/auth$/,`export const useAuthStore=()=>({hasPermission:()=>false})`)
 stub(/useResourceCapabilities$/,`import {ref} from 'vue';export const useResourceCapabilities=()=>({modules:ref({}),loading:ref(false),errors:ref([]),scope:ref('a')})`)
 stub(/useHomeNavigation$/,`export const useHomeNavigation=()=>({canOpen:()=>true})`)
 stub(/shared\/config$/,`export const createDefaults=()=>({chart:{}})`)
 stub(/shared\/navigation$/,`export const HOME_TARGETS={addDevice:{menus:['device']}}`)
 stub(/services\/access$/,`export const getPrivateOverviewAccess=()=>({iot:true});export const PRIVATE_TARGETS=new Proxy({}, {get:()=>({menus:['test']})})`)
 stub(/services\/(resources|guide|alarms|trends)$/,`export const loadPrivateResources=()=>{};export const loadPrivateGuide=()=>{};export const loadPrivateAlarms=()=>{};export const loadPrivateTrend=()=>{}`)
 stub(/usePrivateQuery$/,`export const usePrivateQuery=(load)=>({data:load.name==='loadPrivateGuide'?context.guide:undefined,error:false})`)
 stub(/usePrivateMonitor$/,`export const usePrivateMonitor=()=>({})`)
 stub(/usePrivateCharts$/,`export const usePrivateCharts=()=>({})`)
}}]})
function fixture(guide){const mod={exports:{}};Function('module','exports','require','context',outputFiles[0].text)(mod,mod.exports,require,{guide});const scope=effectScope();return scope.run(()=>mod.exports.usePrivateOverview())}
test('completed guide with no creation rights does not expose empty access card',()=>{const view=fixture({show:false});assert.equal(view.actions.value.length,0);assert.equal(view.showAccess.value,false)})
test('incomplete or loading guide remains visible without creation rights',()=>{assert.equal(fixture({show:true}).showAccess.value,true);assert.equal(fixture(undefined).showAccess.value,true)})
