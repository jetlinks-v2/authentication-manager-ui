import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({ entryPoints: [path.join(root, 'visDashboard/ResourceCenter/services/gatewayStatus.ts')],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'boundaries', setup(api) {
    api.onResolve({ filter: /^@jetlinks-web\/core$/ }, () => ({ path: 'request', namespace: 'fixture' }))
    api.onResolve({ filter: /api\/overview$/ }, () => ({ path: 'overview', namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: args.path === 'request' ? 'export const request=context.request' : 'export const queryOverviewGatewayPage=(...args)=>context.page(...args)' }))
  } }],
})
function fixture() {
  const c = { calls: [], page: async () => ({ data: [], total: 0 }), request: { post: async (url, body) => {
    c.calls.push({ url, body })
    if (url.includes('_runtime-query')) return { result: [{ id: 'offline', lastReportTime: 1793330000000 }] }
    if (body.pointType === 'edge-ai-gateway') return { success: false }
    return { result: [{ thingId: 'online', cpuUsage: 0, memoryUsage: 55 }] }
  } } }
  const module = { exports: {} }; Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(module, module.exports, require, c)
  return { ...c, api: module.exports }
}
const directory = [{ id: 'online', name: 'Online', online: true, connectionStatus: 'online' }, { id: 'offline', name: 'Offline', online: false, connectionStatus: 'offline' }, { id: 'disabled', name: 'Disabled', online: false, connectionStatus: 'disabled' }]

test('small-node grouped queries preserve zero, missing and independent failures, and real offline timestamp', async () => {
  const c = fixture()
  const result = await c.api.loadGatewayNodeStatuses(directory, ['cpu', 'memory', 'disk', 'queue'], 1793330010000)
  const online = result.gateways[0], offline = result.gateways[1]
  assert.equal(online.metrics.cpu.value, 0)
  assert.equal(online.metrics.memory.value, 55)
  assert.equal(online.metrics.disk, undefined)
  assert.deepEqual(online.failedMetrics, ['queue'])
  assert.equal(offline.lastReportTime, 1793330000000)
  assert.equal(offline.metrics.cpu, undefined)
  assert.equal(result.partialError, true)
  const system = c.calls.find(call => call.body.pointType === 'device-health')
  const queue = c.calls.find(call => call.body.pointType === 'edge-ai-gateway')
  assert.deepEqual(system.body.thingIds, ['online'])
  assert.equal(system.body.metrics.length, 3)
  assert.equal(system.body.limit, 1)
  assert.deepEqual(queue.body.thingIds, ['online'])
})

test('without vision no queue query is sent and cancelled generation is rejected', async () => {
  const c = fixture()
  await c.api.loadGatewayNodeStatuses(directory, ['cpu', 'memory', 'disk'])
  assert.ok(c.calls.every(call => call.body.pointType !== 'edge-ai-gateway'))
  await assert.rejects(c.api.loadGatewayNodeStatuses(directory, ['cpu'], Date.now(), () => false))
})

test('large-node query retains full directory and excludes offline IDs from aggregation', async () => {
  const c = fixture()
  const nodes = [...directory, { id: 'third', name: 'Third', online: true }, { id: 'fourth', name: 'Fourth', online: true }]
  const result = await c.api.loadGatewayStatuses('cpu', Date.now(), nodes)
  assert.equal(result.gateways.length, 5)
  assert.deepEqual(c.calls[0].body.thingIds, ['online', 'third', 'fourth'])
  assert.equal(c.calls[0].body.limit, 10)
  assert.equal(result.gateways[0].metrics.cpu.value, 0)
  assert.equal(result.gateways[1].metrics.cpu, undefined)
})
