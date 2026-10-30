import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require=createRequire(import.meta.url),{build}=require('esbuild'),vue=require('vue')
const root=fileURLToPath(new URL('../',import.meta.url)),core=path.resolve(root,'../../jetlinks-web-core/src/components/DashBoardCanvas/composables/useDashboardState.ts')
const result=await build({stdin:{contents:`export * from ${JSON.stringify(path.join(root,'views/project/Overview/saasOverviewLayout.ts'))}; export { useDashboardState } from ${JSON.stringify(core)}`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external'})
const module={exports:{}};Function('module','exports','require',result.outputFiles[0].text)(module,module.exports,require)
const api=module.exports,features=['SaasSummary','SaasRecent','SaasResources','SaasToday','SaasQuotas','Applications','Announcements','SaasHelp']
test('overview default geometry respects visible features without overlap across widths',()=>{
 for(const width of [360,600,1039,1040,1400,2077]) for(const subset of [features,features.filter(x=>!['SaasResources','SaasQuotas'].includes(x)),['SaasSummary','SaasRecent','Announcements','SaasHelp']]){
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
  assert.equal(items.find(x=>x.feature==='SaasToday').gridItem.h,6)
  for(const [i,a] of items.entries()) for(const b of items.slice(i+1)){const x=a.gridItem,y=b.gridItem;assert.ok(x.x+x.w<=y.x||y.x+y.w<=x.x||x.y+x.h<=y.y||y.y+y.h<=x.y,`${a.feature}/${b.feature} at ${width}`)}
 }
})

test('today default fits one, two and four metric rows',()=>{
 for(const [width,rows] of [[2334,1],[600,2],[300,4]]) {
  const grid=api.buildSaasOverviewLayout(features,width,{resources:4,today:4}).find(x=>x.feature==='SaasToday').gridItem
  const pixels=grid.h*32-16, needed=80+rows*90+(rows-1)*16
  assert.ok(pixels>=needed,`${width}: ${pixels} < ${needed}`)
  assert.ok(pixels-needed<32,`${width}: excessive empty height`)
  assert.equal(grid.minH,6)
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

test('footer preserves announcement reading height and extends only when needed to meet help bottom',()=>{
 let aligned=0, longer=0
 for(const width of [1040,1366,1660,1920,2334]) {
  const items=api.buildSaasOverviewLayout(features,width,{resources:4,today:4})
  const announcement=items.find(x=>x.feature==='Announcements').gridItem
  const help=items.find(x=>x.feature==='SaasHelp').gridItem
  const applications=items.find(x=>x.feature==='Applications').gridItem
  assert.equal(help.h,9,`help height at ${width}`);assert.equal(applications.h,9,`application height at ${width}`)
  assert.ok(announcement.h>=10,`announcement minimum at ${width}`)
  const difference=announcement.y+announcement.h-help.y-help.h
  assert.ok(difference>=0,`announcement shorter than help at ${width}`)
  if(difference===0)aligned++;else {longer++;assert.equal(announcement.h,10)}
 }
 assert.ok(aligned>0 && longer>0)
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

test('summary starts full width above all cards at each responsive width', () => {
 for (const [width,height] of [[400,5],[699,5],[700,4],[1039,4],[1400,4]]) {
  const layout=api.buildSaasOverviewLayout(features,width,{resources:4,today:4})
  const summary=layout.find(item=>item.feature==='SaasSummary').gridItem
  assert.deepEqual([summary.x,summary.y,summary.w,summary.h,summary.minH],[0,0,24,height,3])
  for(const item of layout.filter(item=>item.feature!=='SaasSummary')) assert.ok(item.gridItem.y>=height,`${item.feature} at ${width}`)
 }
})

test('summary drag persists through a fresh dashboard state', () => {
 const original=globalThis.localStorage,store=new Map(),key='summary-drag'
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
 try {
  const input=vue.ref({canvas:{gridLayout:{colNum:24}},components:api.buildSaasOverviewLayout(features,1400,{resources:4,today:4}).map(({feature,gridItem})=>({id:feature,type:feature,componentProps:{gridItem}}))})
  const options={value:()=>input.value,catalog:()=>({components:{}}),editable:()=>false,layoutEditable:()=>true,storageKey:()=>key,onChange:()=>assert.fail('layout must not change business config')}
  const scope=vue.effectScope(),state=scope.run(()=>api.useDashboardState(options))
  const layout=input.value.components.map(c=>({i:c.id,...c.componentProps.gridItem})).map(item=>item.i==='SaasSummary'?{...item,x:3,y:40,w:18,h:6}:item)
  state.updateLayout(layout); scope.stop()
  const freshScope=vue.effectScope(),fresh=freshScope.run(()=>api.useDashboardState(options))
  const item=fresh.value.value.components.find(c=>c.id==='SaasSummary').componentProps.gridItem
  assert.deepEqual([item.x,item.y,item.w,item.h],[3,40,18,6]);freshScope.stop()
 } finally {if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original}
})

test('legacy migration copies geometry once, rejects malformed data and isolates scopes', () => {
 const oldFeatures=features.filter(x=>x!=='SaasSummary'),scope='user-a/project-a/api-a/app-a'
 for (const width of [400,800,1400]) {
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}
  const oldKey=api.saasOverviewLayoutStorageKey(scope,width,oldFeatures),key=api.saasOverviewLayoutStorageKey(scope,width,features)
  const summary=api.buildSaasOverviewLayout(features,width,{resources:4,today:4}).find(x=>x.feature==='SaasSummary').gridItem
  const old=api.buildSaasOverviewLayout(oldFeatures,width,{resources:4,today:4}).map(({feature,gridItem})=>({i:`projectHome${feature}`,x:gridItem.x,y:gridItem.y,w:gridItem.w,h:gridItem.h}))
  const saved=JSON.stringify(old);map.set(oldKey,saved)
  api.migrateSaasOverviewLayout(storage,scope,width,features,summary)
  const migrated=JSON.parse(map.get(key));assert.deepEqual(migrated[0],{i:'projectHomeSaasSummary',x:0,y:0,w:24,h:summary.h})
  for(const [index,item] of old.entries()) assert.deepEqual(migrated[index+1],{...item,y:item.y+summary.h})
  assert.equal(map.get(oldKey),saved)
  map.set(key,'already saved');api.migrateSaasOverviewLayout(storage,scope,width,features,summary);assert.equal(map.get(key),'already saved')
  map.delete(key);api.migrateSaasOverviewLayout(storage,'other',width,features,summary);assert.equal(map.has(api.saasOverviewLayoutStorageKey('other',width,features)),false)
  for(const invalid of ['{broken',JSON.stringify(old.slice(1)),JSON.stringify(old.map((item,i)=>i===0?{...item,w:0}:item))]) {
   map.set(oldKey,invalid);api.migrateSaasOverviewLayout(storage,scope,width,features,summary);assert.equal(map.has(key),false)
  }
 }
})
