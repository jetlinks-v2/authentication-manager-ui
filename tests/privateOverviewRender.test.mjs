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
 b.onResolve({filter:/^(vue-i18n|@ant-design\/icons-vue)$/},a=>({path:a.path,namespace:'js'}))
 b.onLoad({filter:/.*/,namespace:'js'},a=>({contents:a.path==='vue-i18n'?`export const useI18n=()=>({t:k=>k})`:`export const CheckOutlined={render:()=>null}; export const RightOutlined={render:()=>null}`,loader:'js'}))
}}]})
const mod={exports:{}}; Function('module','exports','require',outputFiles[0].text)(mod,mod.exports,require)
async function render(component,props){const app=vue.createSSRApp({render:()=>vue.h(component,props)});app.component('a-button',{render(){return vue.h('button',this.$slots.default?.())}});return renderToString(app)}
const step=(id,state,next=false)=>({id,labelKey:id,actionKey:'action-'+id,state,next,target:{menus:[id]}})
test('fresh iot-only guide renders unknown separately and gives retry',async()=>{
 const html=await render(mod.exports.PrivateAccess,{guide:{show:true,complete:0,total:2,lanes:[{id:'iot',labelKey:'iot',steps:[step('protocol','unknown'),step('device','incomplete')]}]},actions:[],canOpen:()=>true})
 assert.match(html,/iot/);assert.match(html,/is-unknown/);assert.match(html,/privateOverview.metricUnknown/);assert.match(html,/privateOverview.retry/);assert.doesNotMatch(html,/action-device/);assert.doesNotMatch(html,/video/)
})
test('complete guide changes to real quick actions',async()=>{
 const html=await render(mod.exports.PrivateAccess,{guide:{show:false,lanes:[],complete:2,total:2},actions:[{id:'device',label:'Add device',description:'Connect',target:{menus:['device']}}],canOpen:()=>true})
 assert.match(html,/Add device/);assert.match(html,/Connect/);assert.doesNotMatch(html,/private-guide-step/)
})
test('zero and failed KPI remain distinguishable in the same row',async()=>{
 const html=await render(mod.exports.PrivateKpis,{rows:[{id:'devices',labelKey:'devices',value:0,unitKey:'units'},{id:'screen',labelKey:'screen',failed:true,unitKey:'units'}],canOpen:()=>true})
 assert.match(html,/devices[\s\S]*?0/);assert.match(html,/screen[\s\S]*?—/)
})
