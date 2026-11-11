import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({ stdin: { contents: `export * from './views/project/Overview/private/layout'; export * from './views/project/Overview/private/layoutStorage'`, resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [{ name: 'core', setup(b) { b.onResolve({ filter: /^@jetlinks-web-core\/components\/DashBoardCanvas\/utils\/layout$/ }, () => ({ path: path.resolve(root, '../../jetlinks-web-core/src/components/DashBoardCanvas/utils/layout.ts') })) } }] })
const mod = { exports: {} }; Function('module', 'exports', 'require', outputFiles[0].text)(mod, mod.exports, require)
const { buildPrivateOverviewLayout, privateOverviewLayoutStorageKey, migratePrivateOverviewHeights } = mod.exports
const access = { product:true, iot:true, video:true, screen:true, message:true, ai:true, applications:true, runtime:true, iotAlarm:true, videoAlarm:true }
const width = 1512, widgets = buildPrivateOverviewLayout(access, true, width), key = privateOverviewLayoutStorageKey('scope', width, widgets), oldKey = key.replace(':canvas:v2:', ':canvas:v1:')
const heights = { kpi:4, recent:5, access:9, applications:9, trend:9, assets:10, monitor:10, alarms:19 }
function oldLayout() { return widgets.map(({ id, panel, gridItem }) => ({ i:id, x:gridItem.x, y:gridItem.y, w:gridItem.w, h:heights[panel] })) }
function store(old) { const values = new Map([[oldKey, old]]); let writes = 0; return { values, getItem:k=>values.has(k)?values.get(k):null, setItem:(k,v)=>{writes++; values.set(k,v)}, get writes(){return writes} } }
test('migration shrinks untouched defaults, preserves custom geometry and old data, and writes once', () => {
  const original = oldLayout(); original.find(x=>x.i.endsWith('assets')).h = 12; const monitor=original.find(x=>x.i.endsWith('monitor')); monitor.x=0; monitor.y=50; monitor.w-=1
  const serialized = JSON.stringify(original), storage = store(serialized)
  migratePrivateOverviewHeights(storage,key,width,access,widgets)
  const migrated = JSON.parse(storage.getItem(key)); assert.equal(storage.getItem(oldKey),serialized); assert.equal(storage.writes,1)
  for(const item of original){const after=migrated.find(x=>x.i===item.i), widget=widgets.find(x=>x.id===item.i); assert.equal(after.x,item.x); assert.equal(after.y,item.y); assert.equal(after.w,item.w); assert.equal(after.h, item===monitor || item.i.endsWith('assets') ? item.h : Math.min(item.h,widget.gridItem.h))}
  migratePrivateOverviewHeights(storage,key,width,access,widgets); assert.equal(storage.writes,1)
})
test('malformed, incomplete, duplicate or invalid legacy data is ignored', () => {
 for(const value of ['{', 'null', JSON.stringify(oldLayout().slice(1)), JSON.stringify([...oldLayout().slice(0,-1),oldLayout()[0]]), JSON.stringify(oldLayout().map((x,i)=>i?x:{...x,w:25}))]) { const storage=store(value); migratePrivateOverviewHeights(storage,key,width,access,widgets); assert.equal(storage.getItem(key),null); assert.equal(storage.writes,0); assert.equal(storage.getItem(oldKey),value) }
})
