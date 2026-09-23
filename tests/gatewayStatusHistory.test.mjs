import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../visDashboard/ResourceCenter/services/gatewayStatus.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'isolate-history-normalization',
    setup(context) {
      context.onResolve({ filter: /^@jetlinks-web\/core$|^\.\.\/\.\.\/\.\.\/api\/overview$/ }, args => ({ path: args.path, namespace: 'mock-api' }))
      context.onLoad({ filter: /.*/, namespace: 'mock-api' }, () => ({
        contents: 'export const request = {}; export const queryOverviewGatewayPage = () => { throw new Error("Unexpected API call") }',
      }))
    },
  }],
})
const { normalizeGatewayHistory } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const time = text => Date.parse(`${text.replace(' ', 'T')}+08:00`)
const from = time('2026-09-21 17:39:08')
const to = time('2026-09-22 17:39:08')
const normalize = rows => normalizeGatewayHistory({ status: 200, result: rows }, 'cpuUsage', from, to)

test('preserves actual offset bucket timestamps and CPU values returned in descending order', () => {
  const points = normalize([
    { timestamp: '2026-09-22 17:39:00' },
    { timestamp: '2026-09-22 17:24:00', cpuUsage: 71.82 },
    { timestamp: '2026-09-22 17:09:00', cpuUsage: 74.78 },
  ])
  assert.deepEqual(points, [
    { time: time('2026-09-22 17:09:00'), value: 74.78 },
    { time: time('2026-09-22 17:24:00'), value: 71.82 },
    { time: time('2026-09-22 17:39:00'), value: null },
  ])
})

test('preserves zero values and leaves missing snapshots as gaps', () => {
  assert.deepEqual(normalize([
    { timestamp: '2026-09-22 17:09:00', cpuUsage: 0 },
    { timestamp: '2026-09-22 17:39:00', cpuUsage: '3.5' },
  ]), [
    { time: time('2026-09-22 17:09:00'), value: 0 },
    { time: time('2026-09-22 17:24:00'), value: null },
    { time: time('2026-09-22 17:39:00'), value: 3.5 },
  ])
})

test('retains the bucket overlapping the start and excludes invalid or out-of-range timestamps', () => {
  assert.deepEqual(normalize([
    { timestamp: '2026-09-21 17:39:00', cpuUsage: 12 },
    { timestamp: '2026-09-21 17:24:00', cpuUsage: 99 },
    { timestamp: to, cpuUsage: 99 },
    { timestamp: 'invalid', cpuUsage: 99 },
  ]), [{ time: time('2026-09-21 17:39:00'), value: 12 }])
})

test('keeps no data distinct from request failure', () => {
  assert.deepEqual(normalize([]), [])
  assert.deepEqual(normalize([{ timestamp: '2026-09-22 17:24:00', cpuUsage: null }]), [
    { time: time('2026-09-22 17:24:00'), value: null },
  ])
  assert.throws(() => normalizeGatewayHistory({ status: 500, result: [] }, 'cpuUsage', from, to))
})
