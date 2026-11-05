import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require=createRequire(import.meta.url), vue=require('vue'), {renderToString}=require('vue/server-renderer'), {parse,compileScript}=require('vue/compiler-sfc'), {build}=require('esbuild')
const root=fileURLToPath(new URL('../',import.meta.url)), base=path.join(root,'visDashboard/Base/Private/components')
const {outputFiles}=await build({stdin:{contents:['PrivateAccess','PrivateKpis','PrivateAssets'].map(name=>`export {default as ${name}} from ${JSON.stringify(path.join(base,name+'.vue'))}`).join(';'),resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'sfc',setup(b){
 b.onResolve({filter:/\.vue$/},a=> /HomeIcon|PrivatePanel/.test(a.path)?{path:a.path,namespace:'stub'}:{path:path.resolve(a.resolveDir,a.path),namespace:'vue'})
 b.onLoad({filter:/.*/,namespace:'vue'},a=>{const {descriptor,errors}=parse(readFileSync(a.path,'utf8'),{filename:a.path});if(errors.length)throw errors[0];return {contents:compileScript(descriptor,{id:a.path,inlineTemplate:true}).content,loader:'ts',resolveDir:path.dirname(a.path)}})
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path.includes('PrivatePanel')?`import {h} from 'vue'; export default {setup(_,{slots}){return ()=>h('section',[slots.title?.(),slots.actions?.(),slots.default?.()])}}`:`export default {render:()=>null}`,loader:'js'}))
 b.onResolve({filter:/^(vue-i18n|@ant-design\/icons-vue|@jetlinks-web\/components)$/},a=>({path:a.path,namespace:'js'}))
 b.onLoad({filter:/.*/,namespace:'js'},a=>({contents:a.path==='vue-i18n'?`import {ref} from 'vue'; export const useI18n=()=>({t:k=>k,locale:ref('zh-CN')})`:a.path==='@jetlinks-web/components'?`import {h} from 'vue'; export const AIcon={props:['type'],render(){return h('i',{'data-icon':this.type})}}`:`export const CheckOutlined={render:()=>null}; export const RightOutlined={render:()=>null}`,loader:'js'}))
}}]})
const mod={exports:{}}; Function('module','exports','require',outputFiles[0].text)(mod,mod.exports,require)
async function render(component,props){const app=vue.createSSRApp({render:()=>vue.h(component,props)});app.component('a-button',{props:['disabled'],render(){return vue.h('button',{disabled:this.disabled},this.$slots.default?.())}});app.component('a-config-provider',{render(){return vue.h('div',this.$slots.default?.())}});app.component('a-steps',{render(){return vue.h('div',this.$slots.default?.())}});app.component('a-step',{props:['disabled'],render(){return vue.h('div',{role:'button',tabindex:this.disabled?-1:0,'aria-disabled':String(!!this.disabled)},[this.$slots.icon?.(),this.$slots.title?.()])}});return renderToString(app)}
const step=(id,state,next=false)=>({id,labelKey:id,actionKey:'action-'+id,state,next,target:{menus:[id]}})
test('fresh iot-only guide distinguishes unknown without a partial-failure message',async()=>{
 const html=await render(mod.exports.PrivateAccess,{guide:{show:true,complete:0,total:2,lanes:[{id:'iot',labelKey:'iot',steps:[step('protocol','unknown'),step('device','incomplete')]}]},actions:[],canOpen:()=>true})
 assert.match(html,/iot/);assert.match(html,/is-neutral/);assert.match(html,/privateOverview.guideUnknown/);assert.match(html,/privateOverview.retry/);assert.doesNotMatch(html,/privateOverview.metricUnknown/);assert.doesNotMatch(html,/action-device/);assert.doesNotMatch(html,/video/)
})
test('complete guide changes to real quick actions',async()=>{
 const html=await render(mod.exports.PrivateAccess,{guide:{show:false,lanes:[],complete:2,total:2},actions:[{id:'device',label:'Add device',description:'Connect',icon:'icon-shebei',target:{menus:['device']}}],canOpen:()=>true})
 assert.match(html,/data-icon="icon-shebei"/);assert.match(html,/Add device/);assert.match(html,/Connect/);assert.doesNotMatch(html,/private-guide-step/)
})
test('zero and failed KPI remain distinguishable in the same row',async()=>{
 const html=await render(mod.exports.PrivateKpis,{rows:[{id:'devices',labelKey:'devices',value:0,unitKey:'units'},{id:'screen',labelKey:'screen',failed:true,unitKey:'units'}],canOpen:()=>true})
 assert.match(html,/devices[\s\S]*?0/);assert.match(html,/screen[\s\S]*?—/)
})
test('device health supports both private card and embedded overview without changing values',async()=>{
 const groups=[{id:'iot',labelKey:'devices',unitKey:'units',total:10,online:8,offline:2,breakdown:[{id:'device',labelKey:'direct',value:10,offline:2}],target:{menus:['device']}}]
 const standalone=await render(mod.exports.PrivateAssets,{groups,canOpen:()=>true})
 const embedded=await render(mod.exports.PrivateAssets,{groups,canOpen:()=>true,embedded:true})
 assert.match(standalone,/privateOverview.total/);assert.match(standalone,/direct/);assert.match(standalone,/10/)
 assert.match(embedded,/devices/);assert.match(embedded,/direct/);assert.match(embedded,/10/);assert.doesNotMatch(embedded,/privateOverview.total/)
})
