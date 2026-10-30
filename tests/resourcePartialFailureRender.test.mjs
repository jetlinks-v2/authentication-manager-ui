import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require=createRequire(import.meta.url),vue=require('vue'),{renderToString}=require('vue/server-renderer'),{parse,compileScript}=require('vue/compiler-sfc'),{build}=require('esbuild')
const root=fileURLToPath(new URL('../',import.meta.url)),base=path.join(root,'visDashboard/ResourceCenter/components')
const built=await build({stdin:{contents:['FlowPanel','MetricPanel'].map(n=>`export {default as ${n}} from ${JSON.stringify(path.join(base,n+'.vue'))}`).join(';'),resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['vue'],plugins:[{name:'sfc',setup(b){
 b.onResolve({filter:/\.vue$/},a=>a.path.includes('ResourceEmpty')?{path:a.path,namespace:'empty'}:{path:path.resolve(a.resolveDir,a.path),namespace:'vue'})
 b.onLoad({filter:/.*/,namespace:'vue'},a=>{const {descriptor,errors}=parse(readFileSync(a.path,'utf8'),{filename:a.path});if(errors.length)throw errors[0];return {contents:compileScript(descriptor,{id:a.path,inlineTemplate:true}).content,loader:'ts',resolveDir:path.dirname(a.path)}})
 b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:`import {h} from 'vue';export default {props:['title'],render(){return h('div',{class:'empty'},this.title)}}`,loader:'js'}))
 b.onResolve({filter:/\.png$/},a=>({path:a.path,namespace:'png'}));b.onLoad({filter:/.*/,namespace:'png'},()=>({contents:`export default ''`,loader:'js'}))
 b.onResolve({filter:/^(vue-i18n|@jetlinks-web\/components|@jetlinks-web-core\/store\/menu)$/},a=>({path:a.path,namespace:'stub'}))
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='vue-i18n'?`export const useI18n=()=>({t:k=>k})`:a.path.includes('store/menu')?`export const useMenuStore=()=>({getMenu:()=>false})`:`export const Ellipsis={render(){return this.$slots.default?.()}}`,loader:'js'}))
}}]})
const mod={exports:{}};Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require)
async function render(component,props){const app=vue.createSSRApp({render:()=>vue.h(component,props)});app.component('AIcon',{render:()=>null});app.component('a-progress',{render:()=>null});return renderToString(app)}
test('flow empty guide needs successful zero metrics and ranking',async()=>{
 const base={metrics:[{key:'month',value:0}],ranking:[]}
 assert.match(await render(mod.exports.FlowPanel,{data:base,limit:5}),/noNetworkCardsTitle/)
 for(const data of [{...base,rankingFailed:true},{...base,metrics:[{key:'month',value:0,failed:true}]}]){const html=await render(mod.exports.FlowPanel,{data,limit:5});assert.doesNotMatch(html,/noNetworkCardsTitle/);assert.match(html,/—/)}
})
test('collection partial failure shows unknown while true zero shows guide',async()=>{
 const base=[{key:'channel',value:0},{key:'collector',value:0}]
 assert.match(await render(mod.exports.MetricPanel,{kind:'Collection',metrics:base}),/noCollectionTitle/)
 const html=await render(mod.exports.MetricPanel,{kind:'Collection',metrics:[base[0],{...base[1],failed:true}]})
 assert.doesNotMatch(html,/noCollectionTitle/);assert.match(html,/—/);assert.match(html,/>0</)
})
