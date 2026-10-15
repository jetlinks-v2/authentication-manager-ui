import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

let getResponse
let postResponse
const calls = []
globalThis.__runtimeLogRequest = {
  get: async (...args) => {
    calls.push({ method: 'GET', args })
    return getResponse(...args)
  },
  post: async (...args) => {
    calls.push({ method: 'POST', args })
    return postResponse(...args)
  },
}

const output = await build({
  entryPoints: [fileURLToPath(new URL('./runtimeLog.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'request-contract',
    setup(bundler) {
      bundler.onResolve({ filter: /^@jetlinks-web\/core$/ }, () => ({ path: 'request', namespace: 'mock' }))
      bundler.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: 'export const request = globalThis.__runtimeLogRequest',
        loader: 'js',
      }))
    },
  }],
})
const api = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`)

test('node → roots → nested log file → window → download uses the local file contract', async () => {
  calls.length = 0
  const response = result => ({ status: 200, result })
  const log = {
    serverId: 'edge-1', providerId: 'zlmedia', id: 'file-1', parentId: 'dir-1',
    name: 'today.log', directory: false, operations: ['readWindow', 'download'],
    filters: ['keyword', 'levels', 'regex'], current: true, compressed: false, seekable: true,
  }
  getResponse = url => {
    if (url === '/system/log/nodes') return response([{ id: 'edge-1', current: true }])
    if (url === '/system/log/edge-1/roots') return response([{
      serverId: 'edge-1', providerId: 'zlmedia', id: 'root', name: 'ZLMediaKit日志',
      directory: true, operations: ['children'], type: 'log',
    }])
    if (url === '/system/log/edge-1/zlmedia/root/children') return response([{
      serverId: 'edge-1', providerId: 'zlmedia', id: 'dir-1', parentId: 'root',
      name: 'Camera one', directory: true, operations: ['children'],
    }])
    if (url === '/system/log/edge-1/zlmedia/dir-1/children') return response([log])
    if (url === '/system/log/edge-1/zlmedia/file-1/download') {
      return {
        status: 200,
        headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="today.log"' },
        data: new TextEncoder().encode('original bytes').buffer,
      }
    }
    throw new Error(`Unexpected GET ${url}`)
  }
  postResponse = (url, body) => {
    assert.equal(url, '/system/log/edge-1/zlmedia/file-1/_readWindow')
    assert.deepEqual(body, { lineCount: 100, direction: 'backward', filter: { levels: ['WARN'] } })
    return response({ lines: ['2026-09-29 W warning'], previousPosition: 12, seekable: true, truncated: false })
  }

  assert.equal((await api.getRuntimeLogNodes())[0].id, 'edge-1')
  const [provider] = await api.getRuntimeLogProviders('edge-1')
  assert.deepEqual(provider, { id: 'zlmedia', name: 'ZLMediaKit日志', rootId: 'root' })
  const [file] = await api.getRuntimeLogResources('edge-1', provider)
  assert.equal(file.id, 'file-1')
  assert.equal(file.displayName, 'today.log')
  assert.deepEqual((await api.readRuntimeLog('edge-1', provider.id, file.id, 100, { levels: ['WARN'] })).lines,
    ['2026-09-29 W warning'])
  const downloaded = await api.downloadRuntimeLog('edge-1', provider.id, file)
  assert.equal(downloaded.name, 'today.log')
  assert.equal(await downloaded.blob.text(), 'original bytes')
  assert.deepEqual(calls.map(call => call.args[0]), [
    '/system/log/nodes',
    '/system/log/edge-1/roots',
    '/system/log/edge-1/zlmedia/root/children',
    '/system/log/edge-1/zlmedia/dir-1/children',
    '/system/log/edge-1/zlmedia/file-1/_readWindow',
    '/system/log/edge-1/zlmedia/file-1/download',
  ])
})
