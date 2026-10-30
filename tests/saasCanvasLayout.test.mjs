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

test('wide layouts restore personal geometry across container widths without collisions', async () => {
 const original=globalThis.localStorage, store=new Map()
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
 const make=width=>({canvas:{gridLayout:{colNum:24}},components:api.buildSaasOverviewLayout(features,width,{resources:4,today:4}).map(({feature,gridItem})=>({id:feature,type:feature,componentProps:{gridItem}}))})
 const geometry=value=>value.components.map(c=>({i:c.id,...Object.fromEntries(['x','y','w','h'].map(k=>[k,c.componentProps.gridItem[k]]))}))
 try {
  for(const from of [2334,2473]) for(const width of [1660,1920,1366,2473]) {
   store.clear()
   const key=api.saasOverviewLayoutStorageKey('fixture',from,features), input=vue.ref(make(from)),scope=vue.effectScope()
   const state=scope.run(()=>api.useDashboardState({value:()=>input.value,catalog:()=>({components:{}}),editable:()=>false,layoutEditable:()=>true,storageKey:()=>key,onChange:()=>assert.fail('business config must not change')}))
   const saved=geometry(input.value)
   state.updateLayout(saved)
   const serialized=store.get(key)
   input.value=make(width);await vue.nextTick()
   assert.equal(api.saasOverviewLayoutStorageKey('fixture',width,features),key)
   assert.deepEqual(geometry(state.value.value),saved,`${from} to ${width} preserved`)
   assert.equal(store.get(key),serialized)
   for(const [i,a] of saved.entries()) for(const b of saved.slice(i+1)) assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${a.i}/${b.i} at ${width}`)
   scope.stop()
  }
  const input=vue.ref(make(2334)), key='personal',scope=vue.effectScope()
  const state=scope.run(()=>api.useDashboardState({value:()=>input.value,catalog:()=>({components:{}}),editable:()=>false,layoutEditable:()=>true,storageKey:()=>key,onChange:()=>assert.fail('business config must not change')}))
  const saved=geometry(input.value).map(item=>item.i==='SaasToday'?{...item,x:2,y:32,w:16,h:12}:item)
  state.updateLayout(saved);input.value=make(1366);await vue.nextTick()
  assert.deepEqual(geometry(state.value.value).find(x=>x.i==='SaasToday'),saved.find(x=>x.i==='SaasToday'))
  scope.stop()
 } finally {if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original}
})

test('default today height and footer geometry do not depend on side column height',()=>{
 const key=width=>api.saasOverviewLayoutStorageKey('fixture',width,features)
 assert.equal(new Set([key(1400),key(800),key(400)]).size,3)
 for(const width of [1366,1660,2334]) for(const subset of [features,features.filter(x=>!['SaasQuotas','Applications'].includes(x)),features.filter(x=>x!=='SaasHelp'),features.filter(x=>x!=='Announcements')]) {
  const items=api.buildSaasOverviewLayout(subset,width,{resources:4,today:4})
  assert.equal(items.find(x=>x.feature==='SaasToday').gridItem.h,7)
  for(const [i,a] of items.entries()) for(const b of items.slice(i+1)){const x=a.gridItem,y=b.gridItem;assert.ok(x.x+x.w<=y.x||y.x+y.w<=x.x||x.y+x.h<=y.y||y.y+y.h<=x.y,`${a.feature}/${b.feature} at ${width}`)}
 }
})

test('resource overview default fits one, two and four rows without excess grid height',()=>{
 for(const [width,rows] of [[2334,1],[800,2],[400,4]]) {
  const resource=api.buildSaasOverviewLayout(features,width,{resources:4,today:4}).find(item=>item.feature==='SaasResources').gridItem
  const pixels=resource.h*16+(resource.h-1)*16
  const needed=56+32+rows*114+(rows-1)*12
  assert.ok(pixels>=needed,`${width}: ${pixels} < ${needed}`)
  assert.ok(pixels-needed<32,`${width}: excessive empty height`)
 }
})

test('resource overview retains a personal height when defaults change',async()=>{
 const original=globalThis.localStorage,store=new Map(),key='resource-height'
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
 try {
  const make=width=>({canvas:{gridLayout:{colNum:24}},components:api.buildSaasOverviewLayout(features,width,{resources:4,today:4}).map(({feature,gridItem})=>({id:feature,type:feature,componentProps:{gridItem}}))})
  const input=vue.ref(make(2334)),scope=vue.effectScope()
  const state=scope.run(()=>api.useDashboardState({value:()=>input.value,catalog:()=>({components:{}}),editable:()=>false,layoutEditable:()=>true,storageKey:()=>key,onChange:()=>assert.fail('business config must not change')}))
  const layout=input.value.components.map(c=>({i:c.id,...c.componentProps.gridItem,h:c.id==='SaasResources'?10:c.componentProps.gridItem.h}))
  state.updateLayout(layout);input.value=make(1660);await vue.nextTick()
  assert.equal(state.value.value.components.find(c=>c.id==='SaasResources').componentProps.gridItem.h,10)
  scope.stop()
 } finally {if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original}
})

test('compact resource height fits one, two or four authorized metrics',()=>{
 for(const count of [1,2,4]) {
  const grid=api.buildSaasOverviewLayout(['SaasResources'],400,{resources:count,today:0})[0].gridItem
  const pixels=grid.h*32-16, required=88+count*114+(count-1)*12
  assert.ok(pixels>=required);assert.ok(pixels-required<32)
  if(count===1)assert.equal(grid.h,7)
 }
})

test('desktop footer aligns bottoms by extending announcements and keeps help at four-row height',()=>{
 for(const width of [1366,1660,2334]) {
  const items=api.buildSaasOverviewLayout(features,width,{resources:4,today:4})
  const announcement=items.find(x=>x.feature==='Announcements').gridItem
  const help=items.find(x=>x.feature==='SaasHelp').gridItem
  assert.equal(help.h,9,`help height at ${width}`)
  assert.equal(announcement.y+announcement.h,help.y+help.h,`footer bottom at ${width}`)
  assert.ok(announcement.h>=10,`announcement minimum at ${width}`)
 }
})

test('footer personal heights survive default geometry updates',async()=>{
 const original=globalThis.localStorage,store=new Map(),key='footer-height'
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
 try {
  const make=width=>({canvas:{gridLayout:{colNum:24}},components:api.buildSaasOverviewLayout(features,width,{resources:4,today:4}).map(({feature,gridItem})=>({id:feature,type:feature,componentProps:{gridItem}}))})
  const input=vue.ref(make(2334)),scope=vue.effectScope()
  const state=scope.run(()=>api.useDashboardState({value:()=>input.value,catalog:()=>({components:{}}),editable:()=>false,layoutEditable:()=>true,storageKey:()=>key,onChange:()=>assert.fail('business config must not change')}))
  const layout=input.value.components.map(c=>({i:c.id,...c.componentProps.gridItem,h:c.id==='SaasHelp'?12:c.id==='Announcements'?15:c.componentProps.gridItem.h}))
  state.updateLayout(layout);input.value=make(1366);await vue.nextTick()
  for(const id of ['SaasHelp','Announcements']) assert.equal(state.value.value.components.find(c=>c.id===id).componentProps.gridItem.h,layout.find(c=>c.i===id).h)
  scope.stop()
 } finally {if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original}
})
