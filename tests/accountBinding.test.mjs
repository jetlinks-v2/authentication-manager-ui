import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'
import { groupAccountBindings } from '../components/ThirdPartyAccountBindingRows/model.ts'

const wechat = { id: 'wx-main', name: 'WeChat', provider: 'wechat-official-account', bound: false }
const dingtalk = { id: 'ding-main', name: 'DingTalk', provider: 'dingtalk-ent-app', bound: false }

test('keeps two methods and groups multiple identities by application without conflating providers', () => {
  assert.deepEqual(groupAccountBindings([]).map(row => row.applications), [[], []])
  const rows = groupAccountBindings([
    wechat, { ...wechat, bound: true, applicationUserId: 'open-id' },
    { ...wechat, id: 'wx-second' }, dingtalk,
    { ...wechat, id: 'old-wechat', provider: 'wechat-webapp' },
    { ...wechat, id: 'gitee', provider: 'third-party' },
  ])
  assert.deepEqual(rows.map(row => [row.method, row.applications.length, row.boundCount]), [
    ['wechat', 2, 1], ['dingtalk', 1, 0],
  ])
  assert.equal(rows[0].applications[0].bound, true)
})

// Stub only I/O and lifecycle scheduling; exercise the actual API, grouping and binding orchestration.
const bundle = await build({
  entryPoints: [new URL('../components/ThirdPartyAccountBindingRows/useAccountBinding.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'binding-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(vue|vue-i18n|@jetlinks-web\/utils|@jetlinks-web\/core)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const ref = value => ({ value });
        export const computed = getter => ({ get value() { return getter(); } });
        export const onMounted = callback => { globalThis.bindingFixture.mount = callback; };
        export const onBeforeUnmount = callback => { globalThis.bindingFixture.unmount = callback; };
        export const useI18n = () => ({ t: key => key });
        export const onlyMessage = (...args) => globalThis.bindingFixture.messages.push(args);
        export const request = { get: url => globalThis.bindingFixture.get(url) };
        export const ndJson = { get: url => ({ subscribe: observer => globalThis.bindingFixture.subscribe(url, observer) }) };
      ` }))
    },
  }],
})
const { useAccountBinding } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

function fixture(items = [wechat, dingtalk]) {
  const state = {
    items, requests: [], streams: [], messages: [],
    get(url) {
      state.requests.push(url)
      return Promise.resolve({ result: state.items })
    },
    subscribe(url, observer) {
      const stream = { url, observer, closed: false }
      state.streams.push(stream)
      return { unsubscribe() { stream.closed = true } }
    },
  }
  globalThis.bindingFixture = state
  return { state, binding: useAccountBinding() }
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve() }

test('single application starts current-user binding with automatic account creation disabled', async () => {
  const { state, binding } = fixture()
  await state.mount()
  assert.deepEqual(state.requests, ['/application/sso/me/bindings'])
  binding.open('wechat')
  assert.equal(state.streams[0].url, '/application/sso/wx-main/login/_async?forBind=true&autoCreateUser=false')
  state.streams[0].observer.next({ type: 'init', result: 'https://wechat.example/authorize' })
  assert.equal(binding.authorizationUrl.value, 'https://wechat.example/authorize')
  assert.equal(binding.bindingState.value, 'active')
})

test('multiple applications require a choice and do not silently bind the first', async () => {
  const { state, binding } = fixture([wechat, { ...wechat, id: 'wx-other', bound: true }])
  await state.mount()
  binding.open('wechat')
  assert.equal(state.streams.length, 0)
  assert.equal(binding.choices.value.length, 2)
  binding.bind(binding.choices.value[1])
  assert.equal(state.streams.length, 0)
  binding.bind(binding.choices.value[0])
  assert.equal(state.streams.length, 1)
})

test('reports success only after current-user bindings confirm persistence, without consuming the returned token', async () => {
  const { state, binding } = fixture()
  await state.mount()
  binding.open('dingtalk')
  state.items = [wechat, { ...dingtalk, bound: true }]
  state.streams[0].observer.next({ type: 'success', result: { bound: true, token: 'must-not-be-stored' } })
  state.streams[0].observer.complete()
  assert.equal(binding.bindingState.value, 'checking')
  await flush()
  assert.equal(binding.selectedMethod.value, undefined)
  assert.equal(binding.groups.value[1].boundCount, 1)
  assert.deepEqual(state.messages, [['AccountBinding.success', 'success']])
  assert.equal(state.streams[0].closed, true)
})

test('a successful authorization that did not bind the current user stays an error', async () => {
  const { state, binding } = fixture()
  await state.mount()
  binding.open('wechat')
  state.streams[0].observer.next({ type: 'success', result: { bound: true } })
  await flush()
  assert.equal(binding.bindingState.value, 'failed')
  assert.equal(binding.selectedMethod.value, 'wechat')
  assert.deepEqual(state.messages, [])
})

test('failure and stream timeout are retryable; closing and unmounting cancel pending streams', async () => {
  const { state, binding } = fixture()
  await state.mount()
  binding.open('wechat')
  state.streams[0].observer.next({ type: 'failed', message: 'Already bound to another account' })
  assert.equal(binding.bindingError.value, 'Already bound to another account')
  binding.bind(wechat)
  assert.equal(state.streams[0].closed, true)
  state.streams[1].observer.complete()
  assert.equal(binding.bindingState.value, 'expired')
  binding.bind(wechat)
  binding.close()
  assert.equal(state.streams[2].closed, true)
  binding.open('dingtalk')
  // Late events from a canceled authorization cannot affect the new selection.
  state.streams[2].observer.next({ type: 'failed', message: 'late' })
  assert.equal(binding.bindingState.value, 'loading')
  state.unmount()
  assert.equal(state.streams[3].closed, true)
})

test('list errors remain distinct from an unconfigured provider and can be retried', async () => {
  const { state, binding } = fixture()
  state.get = async () => { throw new Error('offline') }
  await state.mount()
  assert.equal(binding.loadFailed.value, true)
  state.get = async () => ({ result: [wechat] })
  await binding.load()
  assert.equal(binding.loadFailed.value, false)
  assert.equal(binding.groups.value[0].applications.length, 1)
})

test('canceling while persistence is being checked cannot close a newly opened binding', async () => {
  const { state, binding } = fixture()
  await state.mount()
  binding.open('wechat')
  let resolve
  state.get = () => new Promise(done => { resolve = done })
  state.streams[0].observer.next({ type: 'success', result: { bound: true } })
  binding.close()
  binding.open('dingtalk')
  resolve({ result: [{ ...wechat, bound: true }, dingtalk] })
  await flush()
  assert.equal(binding.selectedMethod.value, 'dingtalk')
  assert.deepEqual(state.messages, [])
})
