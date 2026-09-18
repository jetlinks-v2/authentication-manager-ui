import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { channelCountOf } from '../visDashboard/Base/shared/apiResult.ts'

const moduleRoot = resolve(import.meta.dirname, '..')
const algorithmApiSource = await readFile(
  resolve(moduleRoot, 'visDashboard/Base/shared/apiAlgorithms.ts'),
  'utf8',
)

test('loads coverage from the edge-task endpoint used by the algorithm configuration matrix', () => {
  assert.match(algorithmApiSource, /request\.get\('\/ai\/edge\/task\/coverage\/scene\/_count'/)
  assert.doesNotMatch(algorithmApiSource, /\/ai\/aggregate\/task\/coverage\/_count/)
  assert.match(algorithmApiSource, /return channelCountOf\(response\)/)
})

test('reads the edge coverage response channelCount', () => {
  assert.equal(channelCountOf({ success: true, result: { channelCount: 1, gatewayCount: 1 } }), 1)
  assert.equal(channelCountOf({ channelCount: 0 }), 0)
  assert.throws(() => channelCountOf({ success: true, result: {} }), /Invalid channel count/)
})
