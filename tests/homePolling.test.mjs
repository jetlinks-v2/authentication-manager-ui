import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHomePolling } from '../visDashboard/Base/shared/homePolling.ts'

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

test('zero refresh interval loads once and permits manual refresh without scheduling a timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  let calls = 0
  const polling = createHomePolling(async () => { calls++; return [] })
  polling.subscribe('DeviceAccess', 0, () => {})
  await flush()
  t.mock.timers.tick(120000); await flush()
  assert.equal(calls, 1)
  polling.refresh(['DeviceAccess']); await flush()
  assert.equal(calls, 2)
  polling.dispose()
})

test('shared consumers use one request and the shortest refresh interval; leaving stops polling', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  let calls = 0
  const polling = createHomePolling(async () => [{ id: 'devices', value: ++calls }])
  const first = [], second = []
  const stopFirst = polling.subscribe('DeviceAccess', 60, rows => first.push(rows))
  const stopSecond = polling.subscribe('DeviceAccess', 10, rows => second.push(rows))
  await flush()
  assert.equal(calls, 1)
  assert.deepEqual(first, second)
  t.mock.timers.tick(10000); await flush()
  assert.equal(calls, 2)
  stopSecond()
  t.mock.timers.tick(10000); await flush()
  assert.equal(calls, 2)
  t.mock.timers.tick(50000); await flush()
  assert.equal(calls, 3)
  stopFirst()
  t.mock.timers.tick(120000); await flush()
  assert.equal(calls, 3)
})

test('failed requests can retry; simultaneous retries coalesce and project scopes stay isolated', async () => {
  let calls = 0
  const polling = createHomePolling(async () => {
    if (++calls === 1) throw new Error('offline')
    return [{ id: 'devices', value: calls }]
  })
  const values = []
  polling.subscribe('DeviceAccess', 60, (rows, failed) => values.push({ rows, failed }), 'project-a')
  await flush()
  assert.equal(values[0].failed, true)
  polling.refresh(['DeviceAccess'], 'project-a')
  polling.refresh(['DeviceAccess'], 'project-a')
  await flush()
  assert.equal(calls, 2)
  assert.equal(values.at(-1).failed, false)
  polling.subscribe('DeviceAccess', 60, () => {}, 'project-b')
  await flush()
  assert.equal(calls, 3)
  polling.dispose()
})

test('an old request cannot publish into a reopened subscription', async () => {
  const pending = []
  const polling = createHomePolling(() => new Promise(resolve => pending.push(resolve)))
  const old = [], current = []
  const stop = polling.subscribe('DeviceAccess', 60, rows => old.push(rows))
  await flush(); stop()
  polling.subscribe('DeviceAccess', 60, rows => current.push(rows))
  await flush()
  pending[0]([{ id: 'devices', value: 1 }]); await flush()
  assert.equal(old.length, 0)
  assert.equal(current.length, 0)
  pending[1]([{ id: 'devices', value: 2 }]); await flush()
  assert.equal(current[0][0].value, 2)
  polling.dispose()
})
