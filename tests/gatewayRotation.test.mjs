import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope, ref } from 'vue'
import { useGatewayRotation } from '../visDashboard/ResourceCenter/hooks/useGatewayRotation.ts'

function setup(t, initialIds = ['a', 'b', 'c']) {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const ids = ref(initialIds), selectedId = ref(initialIds[0] || ''), enabled = ref(true)
  const scope = effectScope()
  const rotation = scope.run(() => useGatewayRotation({ ids, selectedId, enabled }))
  t.after(() => scope.stop())
  return { ids, selectedId, enabled, scope, rotation, tick: ms => t.mock.timers.tick(ms) }
}

test('cycles through gateways every five seconds and wraps to the first', t => {
  const { selectedId, tick } = setup(t)
  tick(4999); assert.equal(selectedId.value, 'a')
  tick(1); assert.equal(selectedId.value, 'b')
  tick(5000); assert.equal(selectedId.value, 'c')
  tick(5000); assert.equal(selectedId.value, 'a')
})

test('hover pauses rotation; leaving resumes after a full interval from the manual selection', t => {
  const { selectedId, rotation, tick } = setup(t)
  tick(3000)
  rotation.onPointerEnter()
  selectedId.value = 'b'
  tick(20000); assert.equal(selectedId.value, 'b')
  rotation.onPointerLeave()
  tick(4999); assert.equal(selectedId.value, 'b')
  tick(1); assert.equal(selectedId.value, 'c')
})

test('keyboard focus pauses, but mouse click focus does not prevent resuming after pointer leave', t => {
  const { selectedId, rotation, tick } = setup(t)
  rotation.onFocusIn({ target: { matches: () => true } })
  tick(10000); assert.equal(selectedId.value, 'a')
  rotation.onFocusOut({ currentTarget: { contains: () => false }, relatedTarget: null })
  rotation.onFocusIn({ target: { matches: () => false } })
  tick(5000); assert.equal(selectedId.value, 'b')
})

test('loading, hidden or inactive states pause rotation; disposal clears the timer', t => {
  const { selectedId, enabled, scope, tick } = setup(t)
  enabled.value = false
  tick(10000); assert.equal(selectedId.value, 'a')
  enabled.value = true
  tick(5000); assert.equal(selectedId.value, 'b')
  scope.stop()
  tick(10000); assert.equal(selectedId.value, 'b')
})

test('empty and single-gateway lists do not rotate; updated lists use their current order', t => {
  const { ids, selectedId, tick } = setup(t, [])
  tick(5000); assert.equal(selectedId.value, '')
  ids.value = ['a']; selectedId.value = 'a'
  tick(5000); assert.equal(selectedId.value, 'a')
  ids.value = ['a', 'c']
  tick(5000); assert.equal(selectedId.value, 'c')
  ids.value = ['d', 'e']
  tick(5000); assert.equal(selectedId.value, 'd')
})
