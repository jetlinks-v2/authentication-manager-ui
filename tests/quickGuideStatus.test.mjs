import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveGuideStatuses, shouldShowGuide } from '../visDashboard/Base/QuickGuide/quickGuideStatus.ts'

const ready = (rows, error = false) => ({ rows, loading: false, error })
const health = ready([{ id: 'gateway', value: 1 }, { id: 'devices', value: 0 }, { id: 'video', value: 1 }])
const algorithms = ready([{ id: 'coverage', value: 2 }])
const configuration = ready([{ id: 'space', value: 1 }, { id: 'alarm', value: 1 }])
const applications = ready([{ id: 'app' }])

test('the guide stays hidden while all six initial status requests are pending', () => {
  const pending = { rows: [], loading: true }
  const statuses = resolveGuideStatuses(pending, pending, pending, pending)
  assert.deepEqual(Object.values(statuses), Array(6).fill('loading'))
  assert.equal(shouldShowGuide(statuses), false)
})

test('all six configured steps hide the guide', () => {
  const statuses = resolveGuideStatuses(health, algorithms, configuration, applications)
  assert.deepEqual(Object.values(statuses), Array(6).fill('complete'))
  assert.equal(shouldShowGuide(statuses), false)
})

test('completing the first four steps does not hide unconfigured alarms or applications', () => {
  const statuses = resolveGuideStatuses(
    health, algorithms, ready([{ id: 'space', value: 1 }, { id: 'alarm', value: 0 }]), ready([]),
  )
  assert.equal(statuses.alarm, 'incomplete')
  assert.equal(statuses.application, 'incomplete')
  assert.equal(shouldShowGuide(statuses), true)
  assert.equal(shouldShowGuide({ ...statuses, alarm: 'complete' }), true)
  assert.equal(shouldShowGuide({ ...statuses, application: 'complete' }), true)
})

test('a failed alarm query does not clear a configured space; an application failure is not an empty list', () => {
  const statuses = resolveGuideStatuses(
    health, algorithms, ready([{ id: 'space', value: 1 }, { id: 'alarm', failed: true }]), ready([], true),
  )
  assert.equal(statuses.space, 'complete')
  assert.equal(statuses.alarm, 'unknown')
  assert.equal(statuses.application, 'unknown')
  assert.equal(shouldShowGuide(statuses), true)
})

test('an incomplete or unavailable device step shows the guide without treating failures as zero', () => {
  const incomplete = resolveGuideStatuses(
    ready([{ id: 'gateway', value: 0 }, { id: 'devices', value: 0 }, { id: 'video', value: 0 }]),
    algorithms, configuration, applications,
  )
  assert.equal(incomplete.gateway, 'incomplete')
  assert.equal(incomplete.device, 'incomplete')
  assert.equal(shouldShowGuide(incomplete), true)

  const unavailable = resolveGuideStatuses(
    ready([{ id: 'gateway', failed: true }, { id: 'devices', value: 0 }, { id: 'video', failed: true }]),
    algorithms, configuration, applications,
  )
  assert.equal(unavailable.gateway, 'unknown')
  assert.equal(unavailable.device, 'unknown')
  assert.equal(shouldShowGuide(unavailable), true)
})

test('editor previews retain all six steps without using runtime completion state', () => {
  const statuses = resolveGuideStatuses(health, algorithms, configuration, applications, true)
  assert.deepEqual(Object.values(statuses), Array(6).fill('incomplete'))
})
