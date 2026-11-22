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
const rendererOptions = {
  // Native DOM nodes also keep their identity when passed through Vue template refs.
  createElement: type => vue.markRaw({ type, children: [], parent: null }),
  createText: text => ({ text, parent: null }),
  createComment: () => ({ text: '', parent: null }),
  setText(node, value) { node.text = value },
  setElementText(node, value) { node.text = value; node.children = [] },
  patchProp(node, key, previous, value) { (node.props ??= {})[key] = value },
  parentNode: node => node.parent,
  nextSibling(node) {
    const siblings = node.parent?.children ?? []
    return siblings[siblings.indexOf(node) + 1] ?? null
  },
  insert(node, parent, anchor) {
    if (node.parent) rendererOptions.remove(node)
    node.parent = parent
    const index = parent.children.indexOf(anchor)
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
  },
  remove(node) {
    const index = node.parent?.children.indexOf(node) ?? -1
    if (index >= 0) node.parent.children.splice(index, 1)
    node.parent = null
  },
}
const text=n=>[n.text||'',...(n.children||[]).map(text)].join('')
const find=(n,p)=>p(n)?n:(n.children||[]).map(c=>find(c,p)).find(Boolean)
const tick=async()=>{await vue.nextTick();await new Promise(setImmediate);await vue.nextTick()}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
async function fixture(){
 const entry=path.join(dir,'ResourceDashboardWidget.vue')
 const bundle=await build({stdin:{contents:`export {default as Host} from ${JSON.stringify(entry)}; export {default as Renderer} from ${JSON.stringify(core)}`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'sfc',setup(b){
 b.onResolve({filter:/^@jetlinks-web-core\/components\/DashBoardCanvas$/},()=>({path:'canvas',namespace:'canvas'}))
 b.onLoad({filter:/.*/,namespace:'canvas'},()=>({contents:`export {default as DashboardWidgetRenderer} from ${JSON.stringify(core)}`,loader:'js',resolveDir:root}))
 b.onResolve({filter:/^@jetlinks-web-core\/components\/DocumentHelp$/},()=>({path:'document-help',namespace:'stub'}))
 b.onResolve({filter:/vue-i18n|resourcePageContext|ant-design-vue/},a=>({path:a.path,namespace:'stub'}))
 b.onResolve({filter:/\.vue$/},a=>{let p=path.resolve(a.resolveDir,a.path);return p===entry||p===core||p.startsWith(dir+path.sep)&&['ResourceDeviceDistribution.vue','ResourceDeviceMap.vue'].includes(path.basename(p))?{path:p}: {path:a.path,namespace:'stub'}})
 b.onLoad({filter:/\.vue$/,namespace:'file'},a=>{const d=parse(readFileSync(a.path,'utf8'),{filename:a.path}).descriptor;return {contents:compileScript(d,{id:a.path,inlineTemplate:true}).content,loader:'ts',resolveDir:path.dirname(a.path)}})
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='document-help'?`import {h} from 'vue';export default {props:['code','helpKey'],setup:p=>()=>h('button',{'data-help-code':p.code,'data-help-key':p.helpKey})}`:a.path==='vue-i18n'?`export const useI18n=()=>({t:k=>k})`:a.path.includes('resourcePageContext')?`export const useResourcePageContext=()=>context.runtime`:a.path==='ant-design-vue'?`import {h} from 'vue'; export const Button={setup(p,{attrs,slots}){return()=>h('button',attrs,slots.default?.())}}; export const Skeleton={render(){return 'loading'}}`:`export default {render(){return 'other'}}`,loader:'js',resolveDir:root}))
 }}]})
 const mod={exports:{}},context={runtime:null};Function('module','exports','require','context',bundle.outputFiles[0].text)(mod,mod.exports,require,context)
 function mount({ kind = 'map', widget, definition, loading = false } = {}) {
   context.runtime = {
     mapWidget: vue.ref(widget), mapDefinition: vue.shallowRef(definition), mapLoading: vue.ref(loading),
     summary: { cards: vue.ref([]) }, scope: vue.ref(''), deviceScope: vue.ref({}), reloadMap() {},
   }
   const root = { children: [] }
   const renderer = vue.createRenderer({
     ...rendererOptions,
     // Like document.querySelector, only find nodes already attached to the visible tree.
     querySelector: selector => find(root, node => node.props?.id === selector.slice(1)) ?? null,
   })
   const app = renderer.createApp(mod.exports.Host, { info: { componentProps: { resourcePage: { kind } } } })
   app.component('ACard', { props: ['title'], setup(props, { slots }) {
     return () => vue.h('section', { class: 'card' }, [slots.title?.() || props.title, vue.h('header', slots.extra?.()), slots.default?.()])
   } })
   app.component('ASpin', { render: () => vue.h('div', 'loading') })
   app.component('AButton', { render() { return vue.h('button', this.$slots.default?.()) } })
   app.mount(root)
   return { root, app, runtime: context.runtime }
 }
 return {mount, Renderer:mod.exports.Renderer}
}
test('map legends mount and unmount in their own header across pending and cached visits', async () => {
  const { mount } = await fixture()
  const pending = deferred()
  const options = {
    widget: { id: 'map', type: 'deviceMapCard', componentProps: { deviceMapCard: {} } },
    definition: { component: vue.defineAsyncComponent(() => pending.promise), defaultConfig: { name: 'map' } },
  }
  const first = mount(options)
  await tick()
  assert.match(text(first.root), /resourceDashboard.DeviceDistribution/)
  assert.equal(find(first.root, node => node.props?.['data-help-key'] === 'dashboard.deviceDistribution')?.props['data-help-code'], 'resources/Dashboard')
  assert.ok(find(first.root, node => node.props?.['aria-busy'] === 'true'))
  first.app.unmount()

  const second = mount(options)
  await tick()
  pending.resolve({
    props: ['info', 'isEdit'],
    render() {
      const target = this.info.componentProps.deviceMapCard.legendTarget
      return vue.h(vue.Teleport, { to: target }, [vue.h('span', 'map-legend')])
    },
  })
  await tick()
  assert.deepEqual(first.root.children, [])

  async function checkLegendAndLeave(visit) {
    await tick()
    const header = find(visit.root, node => node.type === 'header')
    assert.match(text(header), /map-legend/)
    assert.equal(find(visit.root, node => node.props?.['data-help-key'] === 'dashboard.deviceDistribution')?.props['data-help-code'], 'resources/Dashboard')
    visit.app.unmount()
    assert.deepEqual(visit.root.children, [])
    assert.doesNotMatch(text(header), /map-legend/)
  }
  await checkLegendAndLeave(second)
  await checkLegendAndLeave(mount(options))
})

test('metadata loading and failed chunk retry retain the card and loading state',async()=>{
 const {mount}=await fixture(), first=deferred(), second=deferred();let attempts=0
 const component=vue.defineAsyncComponent(()=>++attempts===1?first.promise:second.promise)
 const old=console.error;console.error=()=>{}
 try {
  const {root,app,runtime}=mount({loading:true}); await vue.nextTick(); assert.match(text(root),/resourceDashboard.DeviceDistribution/); assert.ok(find(root,n=>n.props?.['aria-busy']==='true'))
  runtime.mapDefinition.value={component,defaultConfig:{name:'map'}};runtime.mapWidget.value={id:'map',type:'deviceMapCard',componentProps:{deviceMapCard:{}}};runtime.mapLoading.value=false;await tick()
  assert.ok(find(root,n=>n.props?.['aria-busy']==='true')); first.reject(Error('chunk failed'));await tick()
  assert.match(text(root),/resourceDashboard.DeviceDistribution/);assert.match(text(root),/dashboardCanvas.componentFailed/)
  const button=find(root,n=>n.type==='button'&&n.props?.onClick);assert.ok(button);button.props.onClick();await tick()
  assert.equal(attempts,2);assert.ok(find(root,n=>n.props?.['aria-busy']==='true'));second.resolve({render:()=>vue.h('div','map-ready')});await tick();assert.match(text(root),/map-ready/);app.unmount()
 } finally {console.error=old}
})

test('independent core renderer suspense keeps the fast widget visible',async()=>{
 const {Renderer}=await fixture(), pending=deferred(), slow=vue.defineAsyncComponent(()=>pending.promise)
 const fast={render:()=>vue.h('div','fast-ready')}, root={children:[]}
 const item=(id,component)=>vue.h(Renderer,{widget:{id,type:id},definition:{component,defaultConfig:{name:id}},previewMode:false},{loading:()=>vue.h('div',{'aria-busy':'true'},'card-loading')})
 const app=vue.createRenderer(rendererOptions).createApp({render:()=>vue.h(vue.Suspense,null,{default:()=>vue.h('section',[item('slow',slow),item('fast',fast)]),fallback:()=>vue.h('div','whole-page-loading')})})
 app.mount(root);await tick();assert.match(text(root),/card-loading/);assert.match(text(root),/fast-ready/);assert.doesNotMatch(text(root),/whole-page-loading/);app.unmount()
})

test('combined distribution retains one outer card while map metadata loads',async()=>{
 const {mount}=await fixture();const {root,app}=mount({kind:'distribution',loading:true});await tick()
 assert.match(text(root),/resourceDashboard.DeviceDistribution/);assert.ok(find(root,n=>n.props?.['aria-busy']==='true'));
 const help=find(root,n=>n.props?.['data-help-key']==='dashboard.deviceDistribution');assert.equal(help?.props['data-help-code'],'resources/Dashboard');app.unmount()
})
