import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderer, nextTick, ref } from 'vue'
import { useVisibleApplications } from '../visDashboard/Base/Applications/useVisibleApplications.ts'

test('application count follows measured height, including a taller disabled row', async () => {
  const saved = Object.fromEntries(['window', 'HTMLElement', 'ResizeObserver', 'getComputedStyle'].map(key => [key, globalThis[key]]))
  const observers = []
  class Element {
    constructor(bottom) { this.bottom = bottom; this.classList = { contains: name => name === 'home-app-trigger' } }
    getBoundingClientRect() { return { bottom: this.bottom } }
  }
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe() {}
    disconnect() {}
  }
  globalThis.HTMLElement = Element
  globalThis.ResizeObserver = Observer
  globalThis.getComputedStyle = () => ({ paddingBottom: '4px' })
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText() {}, setElementText() {}, patchProp() {}, insert() {}, remove() {},
    parentNode: () => null, nextSibling: () => null,
  })
  let state
  const rows = ref([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }])
  const app = renderer.createApp({ setup() { state = useVisibleApplications(rows, ref(true)); return () => null } })
  const host = new Element(217)
  host.clientHeight = 217
  // 58px, 58px, 76px and 58px rows with 6px gaps and 4px top padding.
  host.children = [62, 126, 208, 272].map(bottom => new Element(bottom))
  try {
    app.mount({})
    state.host.value = host
    await nextTick(); await nextTick()
    assert.equal(state.visibleCount.value, 3)
    host.clientHeight = host.bottom = 280
    observers.at(-1).callback()
    assert.equal(state.visibleCount.value, 4)
    host.clientHeight = host.bottom = 128
    observers.at(-1).callback()
    assert.equal(state.visibleCount.value, 1)
    host.clientHeight = host.bottom = 30
    observers.at(-1).callback()
    assert.equal(state.visibleCount.value, 0)
  } finally {
    app.unmount()
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
