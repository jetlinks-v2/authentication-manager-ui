import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require=createRequire(import.meta.url),{build}=require('esbuild'),vue=require('vue')
const root=fileURLToPath(new URL('../',import.meta.url)),core=path.resolve(root,'../../jetlinks-web-core/src/components/DashBoardCanvas/composables/useDashboardState.ts')
const result=await build({stdin:{contents:`export * from ${JSON.stringify(path.join(root,'views/project/Overview/saasOverviewLayout.ts'))}; export { useDashboardState } from ${JSON.stringify(core)}`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external'})
const module={exports:{}};Function('module','exports','require',result.outputFiles[0].text)(module,module.exports,require)
const api=module.exports,features=['SaasRecent','SaasResources','SaasToday','SaasQuotas','Applications','Announcements','SaasHelp']
test('overview default geometry respects visible features without overlap across widths',()=>{
 for(const width of [360,600,1039,1040,1400,2077]) for(const subset of [features,features.filter(x=>!['SaasResources','SaasQuotas'].includes(x)),['SaasRecent','Announcements','SaasHelp']]){
  const items=api.buildSaasOverviewLayout(subset,width,{resources:4,today:4})
  assert.deepEqual(new Set(items.map(x=>x.feature)),new Set(subset))
  for(const [i,a] of items.entries()) for(const b of items.slice(i+1)){const x=a.gridItem,y=b.gridItem;assert.ok(x.x+x.w<=y.x||y.x+y.w<=x.x||x.y+x.h<=y.y||y.y+y.h<=x.y,`${a.feature}/${b.feature} at ${width}`)}
 }
})
test('overview key isolates account/project scope, capability set and width mode',()=>{
 const key=api.saasOverviewLayoutStorageKey('user-a/project-a/api-a/app-a',1400,features)
 for(const alt of [api.saasOverviewLayoutStorageKey('user-b/project-a/api-a/app-a',1400,features),api.saasOverviewLayoutStorageKey('user-a/project-b/api-a/app-a',1400,features),api.saasOverviewLayoutStorageKey('user-a/project-a/api-b/app-a',1400,features),api.saasOverviewLayoutStorageKey('user-a/project-a/api-a/app-b',1400,features),api.saasOverviewLayoutStorageKey('user-a/project-a/api-a/app-a',600,features),api.saasOverviewLayoutStorageKey('user-a/project-a/api-a/app-a',1400,features.slice(0,-1))]) assert.notEqual(key,alt)
 assert.equal(key,api.saasOverviewLayoutStorageKey('user-a/project-a/api-a/app-a',1500,features))
})
test('personal geometry wins when few-node default height changes',async()=>{
 const saved=globalThis.localStorage,store=new Map(),key='fixture';globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
 try{
  const input=vue.ref({canvas:{gridLayout:{colNum:24}},components:[{id:'gateway',type:'x',componentProps:{gridItem:{x:0,y:0,w:12,h:20,minH:12}}}]})
  const scope=vue.effectScope(),state=scope.run(()=>api.useDashboardState({value:()=>input.value,catalog:()=>({components:{}}),editable:()=>false,layoutEditable:()=>true,storageKey:()=>key,onChange:()=>assert.fail('business config must not change')}))
  state.updateLayout([{i:'gateway',x:4,y:3,w:12,h:18}]); input.value={...input.value,components:[{...input.value.components[0],componentProps:{gridItem:{x:0,y:0,w:12,h:13,minH:12}}}]};await vue.nextTick()
  assert.deepEqual([state.value.value.components[0].componentProps.gridItem.x,state.value.value.components[0].componentProps.gridItem.y,state.value.value.components[0].componentProps.gridItem.h],[4,3,18]);scope.stop()
 }finally{if(saved===undefined)delete globalThis.localStorage;else globalThis.localStorage=saved}
})
