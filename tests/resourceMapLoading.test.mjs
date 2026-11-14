import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'
import * as vue from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
const require=createRequire(import.meta.url)
const root=fileURLToPath(new URL('../../../',import.meta.url))
const dir=path.join(root,'modules/authentication-manager-ui/views/resources/Dashboard/components')
const core=path.join(root,'jetlinks-web-core/src/components/DashBoardCanvas/components/WidgetRenderer.vue')
const renderer=vue.createRenderer({createElement:type=>({type,children:[],parent:null}),createText:text=>({text,parent:null}),createComment:text=>({text:'',parent:null}),setText:(n,t)=>{n.text=t},setElementText:(n,t)=>{n.text=t;n.children=[]},patchProp:(n,k,o,v)=>{(n.props??={})[k]=v},parentNode:n=>n.parent,nextSibling:n=>{const a=n.parent?.children||[];return a[a.indexOf(n)+1]||null},insert(n,p,a){if(n.parent){const i=n.parent.children.indexOf(n);if(i>=0)n.parent.children.splice(i,1)}n.parent=p;const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n)},remove(n){const i=n.parent?.children.indexOf(n)??-1;if(i>=0)n.parent.children.splice(i,1);n.parent=null}})
const text=n=>[n.text||'',...(n.children||[]).map(text)].join('')
const find=(n,p)=>p(n)?n:(n.children||[]).map(c=>find(c,p)).find(Boolean)
const tick=async()=>{await vue.nextTick();await new Promise(setImmediate);await vue.nextTick()}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
async function fixture(){
 const entry=path.join(dir,'ResourceDashboardWidget.vue')
 const bundle=await build({stdin:{contents:`export {default as Host} from ${JSON.stringify(entry)}; export {default as Renderer} from ${JSON.stringify(core)}`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'sfc',setup(b){
 b.onResolve({filter:/^@jetlinks-web-core\/components\/DashBoardCanvas$/},()=>({path:'canvas',namespace:'canvas'}))
 b.onLoad({filter:/.*/,namespace:'canvas'},()=>({contents:`export {default as DashboardWidgetRenderer} from ${JSON.stringify(core)}`,loader:'js',resolveDir:root}))
 b.onResolve({filter:/vue-i18n|resourcePageContext|ant-design-vue/},a=>({path:a.path,namespace:'stub'}))
 b.onResolve({filter:/\.vue$/},a=>{let p=path.resolve(a.resolveDir,a.path);return p===entry||p===core||p.startsWith(dir+path.sep)&&['ResourceDeviceDistribution.vue','ResourceDeviceMap.vue'].includes(path.basename(p))?{path:p}: {path:a.path,namespace:'stub'}})
 b.onLoad({filter:/\.vue$/,namespace:'file'},a=>{const d=parse(readFileSync(a.path,'utf8'),{filename:a.path}).descriptor;return {contents:compileScript(d,{id:a.path,inlineTemplate:true}).content,loader:'ts',resolveDir:path.dirname(a.path)}})
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='vue-i18n'?`export const useI18n=()=>({t:k=>k})`:a.path.includes('resourcePageContext')?`export const useResourcePageContext=()=>context.runtime`:a.path==='ant-design-vue'?`import {h} from 'vue'; export const Button={setup(p,{attrs,slots}){return()=>h('button',attrs,slots.default?.())}}; export const Skeleton={render(){return 'loading'}}`:`export default {render(){return 'other'}}`,loader:'js',resolveDir:root}))
 }}]})
 const mod={exports:{}},context={runtime:null};Function('module','exports','require','context',bundle.outputFiles[0].text)(mod,mod.exports,require,context)
 function mount({kind='map',widget,definition,loading=false}={}){context.runtime={mapWidget:vue.ref(widget),mapDefinition:vue.ref(definition),mapLoading:vue.ref(loading),summary:{cards:vue.ref([])},scope:vue.ref(''),deviceScope:vue.ref({}),reloadMap(){}};const root={children:[]};const app=renderer.createApp(mod.exports.Host,{info:{componentProps:{resourcePage:{kind}}}});app.component('ACard',{props:['title'],setup(p,{slots}){return()=>vue.h('section',{class:'card'},[p.title,vue.h('header',slots.extra?.()),slots.default?.()])}});app.component('ASpin',{render:()=>vue.h('div','loading')});app.component('AButton',{render(){return vue.h('button',this.$slots.default?.())}});app.mount(root);return {root,app,runtime:context.runtime}}
 return {mount, Renderer:mod.exports.Renderer}
}
test('map retains its card shell while the async map component is pending',async()=>{
 const {mount}=await fixture(), pending=deferred();const component=vue.defineAsyncComponent(()=>pending.promise)
 const {root,app}=mount({widget:{id:'map',type:'deviceMapCard',componentProps:{deviceMapCard:{}}},definition:{component,defaultConfig:{name:'map'}}});await tick()
 assert.match(text(root),/resourceDashboard.DeviceDistribution/)
 assert.ok(find(root,n=>n.props?.['aria-busy']==='true'))
 const header=find(root,n=>n.type==='header'), target=find(header,n=>n.props?.id?.startsWith('resource-map-legend-'))
 assert.ok(target)
 pending.resolve({props:['info'],render(){return vue.h('div',{'data-legend':this.info.componentProps.deviceMapCard.legendTarget})}});await tick()
 assert.equal(find(root,n=>n.props?.['data-legend'])?.props['data-legend'],`#${target.props.id}`)
 app.unmount()
})

test('metadata loading and failed chunk retry retain the card and loading state',async()=>{
 const {mount}=await fixture(), first=deferred(), second=deferred();let attempts=0
 const component=vue.defineAsyncComponent(()=>++attempts===1?first.promise:second.promise)
 const old=console.error;console.error=()=>{}
 try {
  const {root,app,runtime}=mount({loading:true}); assert.match(text(root),/resourceDashboard.DeviceDistribution/); assert.ok(find(root,n=>n.props?.['aria-busy']==='true'))
  runtime.mapDefinition.value={component,defaultConfig:{name:'map'}};runtime.mapWidget.value={id:'map',type:'deviceMapCard',componentProps:{deviceMapCard:{}}};runtime.mapLoading.value=false;await tick()
  assert.ok(find(root,n=>n.props?.['aria-busy']==='true')); first.reject(Error('chunk failed'));await tick()
  assert.match(text(root),/resourceDashboard.DeviceDistribution/);assert.match(text(root),/dashboardCanvas.componentFailed/)
  const button=find(root,n=>n.type==='button');assert.ok(button?.props?.onClick);button.props.onClick();await tick()
  assert.equal(attempts,2);assert.ok(find(root,n=>n.props?.['aria-busy']==='true'));second.resolve({render:()=>vue.h('div','map-ready')});await tick();assert.match(text(root),/map-ready/);app.unmount()
 } finally {console.error=old}
})

test('independent core renderer suspense keeps the fast widget visible',async()=>{
 const {Renderer}=await fixture(), pending=deferred(), slow=vue.defineAsyncComponent(()=>pending.promise)
 const fast={render:()=>vue.h('div','fast-ready')}, root={children:[]}
 const item=(id,component)=>vue.h(Renderer,{widget:{id,type:id},definition:{component,defaultConfig:{name:id}},previewMode:false},{loading:()=>vue.h('div',{'aria-busy':'true'},'card-loading')})
 const app=renderer.createApp({render:()=>vue.h(vue.Suspense,null,{default:()=>vue.h('section',[item('slow',slow),item('fast',fast)]),fallback:()=>vue.h('div','whole-page-loading')})})
 app.mount(root);await tick();assert.match(text(root),/card-loading/);assert.match(text(root),/fast-ready/);assert.doesNotMatch(text(root),/whole-page-loading/);app.unmount()
})

test('combined distribution retains one outer card while map metadata loads',async()=>{
 const {mount}=await fixture();const {root,app}=mount({kind:'distribution',loading:true});await tick()
 assert.match(text(root),/resourceDashboard.DeviceDistribution/);assert.ok(find(root,n=>n.props?.['aria-busy']==='true'));app.unmount()
})
