import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const { effectScope, ref, nextTick } = require('vue')
const root = fileURLToPath(new URL('../', import.meta.url))
const {outputFiles} = await build({entryPoints:[path.join(root,'visDashboard/Base/Private/usePrivateQuery.ts')], bundle:true, write:false, platform:'node', format:'cjs', packages:'external'})
const module = {exports:{}}
Function('module','exports','require',outputFiles[0].text)(module,module.exports,require)
const {usePrivateQuery} = module.exports
const settle = async () => { await Promise.resolve(); await nextTick(); await Promise.resolve() }
test('identity switch discards old response and permission withdrawal clears data; disposal blocks late writes', async () => {
  const key=ref('A'), enabled=ref(true), pending=[]
  const scope=effectScope()
  const query=scope.run(()=>usePrivateQuery(()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),key,enabled))
  assert.equal(pending.length,1)
  key.value='B'; await nextTick(); assert.equal(pending.length,2)
  pending[1].resolve('B result'); await settle(); assert.equal(query.data,'B result')
  pending[0].resolve('A result'); await settle(); assert.equal(query.data,'B result')
  enabled.value=false; await nextTick(); assert.equal(query.data,undefined)
  enabled.value=true; await nextTick(); assert.equal(pending.length,3)
  scope.stop(); pending[2].resolve('late'); await settle(); assert.equal(query.data,undefined)
})
