import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { createHomePolling } from '../visDashboard/Base/shared/homePolling.ts'

async function load(path, mocks) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(path, import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'fixtures', setup(b) {
      b.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: 'fixture' } : undefined)
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path] }))
    } }] })
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)
}
const service = await load('../visDashboard/Base/shared/apiAnnouncements.ts', {
  './navigation': 'export const HOME_TARGETS={messages:{}}',
  '../../../views/system/Announcement/announcementI18n': 'export const resolveAnnouncementText=(d,k)=>d?.[k] || ""; export const resolveAnnouncementTypeLabel=(value,fallback)=>({maintenance:"系统维护",release:"系统升级"}[value] || fallback || value)',
  '@jetlinks-web-core/layout/components/noticeUtils': 'export const BADGE_OVERFLOW_COUNT=99; export const toBadgeCount=({count,overflow})=>overflow?100:count',
  '../../../views/system/Announcement/api': `export const SYSTEM_BULLETIN_PROVIDER='SystemBulletin'; export const normalizeBulletinType=(value,fallback='')=>String(value?.value ?? value ?? '').trim() || fallback; export const parseSystemBulletinDetail=r=>{try{return r.detail || JSON.parse(r.detailJson)}catch{return undefined}}`,
  '../../../views/system/Announcement/bulletinTypeIcon': 'export const resolveBulletinTypeColor=x=>x',
  '../../../views/system/Announcement/receivedDataSource': 'export const queryAnnouncementInbox=(q)=>globalThis.ann.query(q);export const countAnnouncementUnread=(q)=>globalThis.ann.count(q)',
})
const flush = async () => { for (let i=0;i<20;i++) await Promise.resolve() }
const row = (id,state,type) => ({id, bulletinId:id.split(':')[0], publishVersion:1, state, type, topicName:'标题 '+id, message:'摘要', notifyTime:1793263900506, detailJson:JSON.stringify({type})})
test('公告类型及实体内容呈现，本地状态保留且自定义类型不丢失', async () => {
  globalThis.ann={query:async q=>{assert.deepEqual(q.sorts,[{name:'deployTime',order:'desc'}]);return {result:{data:[row('a:1',{value:'read'},'release'),row('b:1',{value:'unread'},'maintenance'),row('c:1','unread','custom')]}}}}
  const rows=await service.loadAnnouncements()
  assert.deepEqual(rows.map(x=>x.readState),['read','unread','unread'])
  assert.deepEqual(rows.map(x=>x.announcementType?.text),['系统升级','系统维护','custom'])
  assert.equal(rows[0].label,'标题 a:1');assert.equal(rows[0].description,'摘要');assert.ok(rows[0].date)
})
test('自定义标签保留，未读数来自独立计数并支持99+', async () => {
  globalThis.ann={query:async()=>({result:{data:[row('a:1','unread','custom')]}}),count:async q=>{assert.equal(q.pageSize,99);return {result:{count:99,overflow:true}}}}
  assert.equal((await service.loadAnnouncements())[0].announcementType.text,'custom')
  assert.equal((await service.loadAnnouncementUnread())[0].value,100)
  ann.query=async()=>{throw Error('404')};await assert.rejects(service.loadAnnouncements(),/404/)
})
test('在途请求期间刷新会补发一次，且已卸载项目不再请求', async () => {
  let resolve; let calls=0; const snapshots=[]
  const polling=createHomePolling(async()=>{calls++; if(calls===1)return new Promise(r=>{resolve=r});return [{id:'a',value:'new'}]})
  const stop=polling.subscribe('Announcements',0,rows=>snapshots.push(rows),'a'); await flush()
  polling.refresh(['Announcements'],'a'); polling.refresh(['Announcements'],'a'); resolve([{id:'a',value:'old'}]); await flush()
  assert.equal(calls,2); assert.equal(snapshots.at(-1)[0].value,'new')
  stop(); polling.dispose()
  let resolveOld; calls=0
  const p=createHomePolling(()=>{calls++;return new Promise(r=>{resolveOld=r})});const off=p.subscribe('Announcements',0,()=>{},'a');await flush();p.refresh(['Announcements'],'a');off();resolveOld([]);await flush();assert.equal(calls,1);p.dispose()
})

const hook = await load('../visDashboard/Base/Announcements/useHomeAnnouncements.ts', {
  'vue': `export const computed=fn=>({get value(){return fn()}});export const getCurrentInstance=()=>({appContext:{}});export const watch=(fn,cb,opts)=>{if(Array.isArray(fn)){globalThis.hooks.activeWatch=cb;if(opts?.immediate)cb([true,false])}else globalThis.hooks.watch=cb};export const ref=value=>({value});export const onActivated=cb=>{globalThis.hooks.activate=cb};export const onDeactivated=cb=>{globalThis.hooks.deactivate=cb};export const onUnmounted=cb=>{globalThis.hooks.unmount=cb}`,
  'vue-router': 'export const useRoute=()=>globalThis.hooks.route;export const useRouter=()=>globalThis.hooks.router',
  'vue-i18n': 'export const useI18n=()=>({t:k=>k})',
  '@jetlinks-web/utils': 'export const onlyMessage=(...args)=>globalThis.hooks.errors.push(args)',
  '@jetlinks-web-core/store/user': 'export const useUserStore=()=>globalThis.hooks.user',
  '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation=()=>globalThis.hooks.project;export const getApplicationRuntimeEntry=()=>({applicationId:globalThis.hooks.app})',
  '../../../views/system/Announcement/receivedDataSource': 'export const changeAnnouncementReadState=(...args)=>globalThis.hooks.change(...args)',
  '../../../views/system/Announcement/localReadStore': 'export const getAnnouncementReadScope=()=>globalThis.hooks.scope;export const subscribeAnnouncementReadChanges=cb=>{globalThis.hooks.readChanged=cb;return ()=>{globalThis.hooks.stopped=true}}',
  '../../../views/system/Announcement/realtimeNotification': 'export const openAnnouncementDetail=opts=>{globalThis.hooks.opened=opts}',
  '../shared/config': 'export const getHomeConfig=()=>globalThis.hooks.config',
  '../shared/useHomeRuntime': 'export const useHomeRuntime=()=>({error:{value:false},rows:{value:[{value:2}]}})',
})
const setup = () => {
  globalThis.hooks={route:{params:{},query:{}},router:{push:location=>hooks.navigation.push(location)},navigation:[],project:'a',app:'app',scope:'service/user',errors:[],config:{chart:{displayStyle:'saas',navigation:true},refreshTime:60}, user:{userInfo:{id:'user'},alarmUpdateCount:0,updateAlarm(){this.alarmUpdateCount++}},change:async()=>({status:200,success:true})}
  let edit=false; const instance=hook.useHomeAnnouncements({isEdit:()=>edit,info:()=>undefined})
  return {instance,setEdit:x=>{edit=x},row:{id:'id',notification:{id:'id'},readState:'unread'}}
}
test('仅确认触发本地已读，失败提示且已读不重复写', async()=>{
  const f=setup();let calls=[];hooks.change=async(...args)=>{calls.push(args);return {status:200,success:true}}
  f.instance.select(f.row);await hooks.opened.markRead();assert.deepEqual(calls,[['_read',['id']]]);assert.equal(hooks.user.alarmUpdateCount,0)
  hooks.change=async()=>({status:500,success:false});f.instance.select(f.row);await assert.rejects(hooks.opened.markRead());assert.equal(hooks.user.alarmUpdateCount,0);assert.equal(hooks.errors.length,1);assert.equal(f.row.readState,'unread')
  hooks.change=async()=>{throw Error('should not write')};f.instance.select({...f.row,readState:'read'});await hooks.opened.markRead();assert.equal(hooks.user.alarmUpdateCount,0)
})
test('编辑和禁导航不打开，切换上下文及卸载阻止旧弹窗写入', async()=>{
  const f=setup();f.setEdit(true);f.instance.select(f.row);assert.equal(hooks.opened,undefined)
  f.setEdit(false);hooks.config.chart.navigation=false;f.instance.select(f.row);assert.equal(hooks.opened,undefined)
  hooks.config.chart.navigation=true;let calls=0;hooks.change=async()=>{calls++;return {status:200}}
  f.instance.select(f.row);hooks.watch();await hooks.opened.markRead();assert.equal(calls,0)
  f.instance.select(f.row);hooks.unmount();await hooks.opened.markRead();assert.equal(calls,0)
})

test('全部公告通过基础路由打开站内消息，编辑或禁导航时不跳转', () => {
  const f = setup()
  f.instance.openAll()
  assert.deepEqual(hooks.navigation, [{ path: '/account/center', query: { tab: 'StationMessage' } }])
  assert.equal(hooks.user.tabKey, 'StationMessage')
  f.setEdit(true); f.instance.openAll()
  f.setEdit(false); hooks.config.chart.navigation = false; f.instance.openAll()
  assert.equal(hooks.navigation.length, 1)
})

test('失效的在途成功或失败均不发布，只发布后续刷新结果', async()=>{
  for (const fails of [false,true]) {
    let resolve,reject,calls=0; const received=[]
    const p=createHomePolling(()=>{calls++;return calls===1?new Promise((res,rej)=>{resolve=res;reject=rej}):Promise.resolve([{id:'fresh'}])})
    p.subscribe('Announcements',0,(rows,failed)=>received.push({rows,failed}),'account/project-a');await flush()
    p.refresh(['Announcements'],'account/project-a');p.refresh(['Announcements'],'account/project-a')
    if(fails)reject(Error('old failure'));else resolve([{id:'old'}]);await flush()
    assert.equal(calls,2);assert.deepEqual(received,[{rows:[{id:'fresh'}],failed:false}]);p.dispose()
  }
})


test('停用后旧确认失效并释放监听，只有显式确认才调用本地写入', async () => {
  const f = setup()
  let calls = 0
  hooks.change = async () => { calls++; return { status: 200 } }
  f.instance.select(f.row)
  assert.equal(calls, 0)
  hooks.deactivate()
  assert.equal(hooks.stopped, true)
  await hooks.opened.markRead()
  assert.equal(calls, 0)
})
