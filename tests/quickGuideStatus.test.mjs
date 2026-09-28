import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveGuideStatuses, shouldShowGuide } from '../visDashboard/Base/QuickGuide/quickGuideStatus.ts'

const ready = rows => ({ rows, loading: false })

test('the guide stays hidden while initial status requests are pending', () => {
  const pending = { rows: [], loading: true }
  const statuses = resolveGuideStatuses(pending, pending, pending)
  assert.deepEqual(Object.values(statuses), ['loading', 'loading', 'loading', 'loading'])
  assert.equal(shouldShowGuide(statuses), false)
})

test('all configured steps hide the guide', () => {
  const statuses = resolveGuideStatuses(
    ready([{ id: 'gateway', value: 1 }, { id: 'devices', value: 0 }, { id: 'video', value: 1 }]),
    ready([{ id: 'coverage', value: 2 }]),
    ready([{ id: 'space', value: 1 }]),
  )
  assert.deepEqual(Object.values(statuses), ['complete', 'complete', 'complete', 'complete'])
  assert.equal(shouldShowGuide(statuses), false)
})

test('an incomplete or unavailable step shows the guide without treating failures as zero', () => {
  const incomplete = resolveGuideStatuses(
    ready([{ id: 'gateway', value: 0 }, { id: 'devices', value: 0 }, { id: 'video', value: 0 }]),
    ready([{ id: 'coverage', value: 1 }]),
    ready([{ id: 'space', value: 1 }]),
  )
  assert.equal(incomplete.gateway, 'incomplete')
  assert.equal(shouldShowGuide(incomplete), true)

  const unavailable = resolveGuideStatuses(
    ready([{ id: 'gateway', failed: true }, { id: 'devices', value: 0 }, { id: 'video', failed: true }]),
    ready([{ id: 'coverage', value: 1 }]),
    ready([{ id: 'space', value: 1 }]),
  )
  assert.equal(unavailable.gateway, 'unknown')
  assert.equal(unavailable.device, 'unknown')
  assert.equal(shouldShowGuide(unavailable), true)
})
