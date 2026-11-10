import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import * as vue from 'vue'
import { loadLogModule } from './logTestLoader.mjs'

const fixture = (probeResult = async () => false) => {
  const state = vue.reactive({ scope: 'api:user-A' })
  const probes = [], requests = [], sockets = [], events = new Map()
  globalThis.window = {
    addEventListener: (type, callback) => events.set(type, callback),
    removeEventListener: type => events.delete(type),
  }
  const store = {
    getAnnouncementReadScope: () => state.scope,
    getAnnouncementReadIds: () => [],
    changeAnnouncementLocalState: () => {},
    notifyAnnouncementChanges: () => {},
  }
  const commandApi = loadLogModule('../../jetlinks-web-core/src/api/commandSupports.ts', {
    '@jetlinks-web/core': { request: { get: async (url, params, options) => {
      probes.push({ url, params, options })
      const result = await probeResult(url)
      if (typeof result === 'object') return result
      return { success: true, result: url === '/command-supports/services'
        ? (result ? [{ id: 'notifyService:bulletin' }] : []) : false }
    } } },
  })
  const capability = loadLogModule('views/system/Announcement/bulletinCapability.ts', {
    './localReadStore': store,
    '@jetlinks-web-core/api/commandSupports': commandApi,
  })
  const dependencies = {
    vue,
    './bulletinCapability': capability,
    './managementContext': { isSaasAnnouncementManagement: () => false },
    './localReadStore': store,
    '@jetlinks-web-core/utils/request-context': { getRequestHeaders: () => ({}) },
    './realtimeNotification': { disposeAnnouncementRealtimeDialogs: () => {} },
    '@jetlinks-web-core/locales': { __esModule: true, default: { global: { t: key => key } } },
    '@jetlinks-web/core': {
      request: { post: async (url, query) => {
        requests.push({ url, query })
        return { success: true, status: 200, result: url.endsWith('_count') ? 0 : [] }
      } },
      wsClient: { getWebSocket: (...args) => {
        const socket = { args, released: false }
        sockets.push(socket)
        return { subscribe: () => ({ unsubscribe: () => { socket.released = true } }) }
      } },
    },
  }
  const source = loadLogModule('views/system/Announcement/receivedDataSource.ts', dependencies)
  const realtime = loadLogModule('views/system/Announcement/realtimeSubscription.ts', {
    ...dependencies, './receivedDataSource': source,
  })
  const api = loadLogModule('views/system/Announcement/api.ts', {
    ...dependencies, './receivedDataSource': source, './announcementI18n': {},
  })
  return { state, probes, requests, sockets, events, source, realtime, api, ...capability }
}

test('disabled capability blocks HTTP list/count/management/read-all and websocket subscriptions', async () => {
  const f = fixture()
  const stop = f.realtime.subscribeAnnouncementRealtime(() => assert.fail('disabled event'))
  const [page, rows, count, unread, management] = await Promise.all([
    f.source.queryAnnouncementInbox(),
    f.source.queryAnnouncementInboxNoPaging(),
    f.source.countAnnouncementInbox(),
    f.source.countAnnouncementUnread(),
    f.api.queryAnnouncements({ pageIndex: 0, pageSize: 10 }),
    f.source.markAllAnnouncementsRead(),
  ])
  assert.deepEqual(page.result.data, [])
  assert.deepEqual(rows.result, [])
  assert.equal(count.result, 0)
  assert.equal(unread.result.count, 0)
  assert.equal(management.result.total, 0)
  assert.deepEqual(f.probes.map(probe => probe.url), ['/command-supports/services'], 'concurrent entry points share one probe')
  assert.deepEqual(f.requests, [])
  assert.deepEqual(f.sockets, [])
  stop()
  assert.equal(f.events.size, 0)
})

test('enabled capability waits for the shared probe before allowing HTTP and WS', async () => {
  let finish
  const f = fixture(() => new Promise(resolve => { finish = resolve }))
  const pending = f.source.queryAnnouncementInboxNoPaging()
  const stop = f.realtime.subscribeAnnouncementRealtime(() => {})
  assert.equal(f.requests.length, 0)
  assert.equal(f.sockets.length, 0)
  finish(true)
  await pending
  await setImmediate()
  assert.equal(f.requests.length, 1)
  assert.equal(f.sockets.length, 1)
  assert.deepEqual(f.probes.map(probe => probe.url), ['/command-supports/services'])
  stop()
  assert.equal(f.sockets[0].released, true)
})

test('network failure does not persist a disabled result and a later check can enable the capability', async () => {
  let attempt = 0
  const f = fixture(async () => {
    if (++attempt === 1) throw Error('network unavailable')
    return true
  })
  assert.equal(await f.isAnnouncementSupported(), false)
  assert.equal(await f.isAnnouncementSupported(), true)
  assert.equal(attempt, 2)
  await f.source.queryAnnouncementInboxNoPaging()
  assert.equal(attempt, 2, 'successful result is shared in the current context')
  assert.equal(f.requests.length, 1)
})

test('a stale probe cannot subscribe or issue a query after switching users or services', async () => {
  const finishes = []
  const f = fixture(() => new Promise(resolve => finishes.push(resolve)))
  const pending = f.source.queryAnnouncementInboxNoPaging()
  f.state.scope = 'other-api:user-B'
  const current = f.isAnnouncementSupported()
  finishes[0](true)
  await pending
  assert.deepEqual(f.requests, [])
  finishes[1](true)
  assert.equal(await current, true)
  assert.equal(f.probes.length, 2)
  f.state.scope = ''
  assert.equal(await f.isAnnouncementSupported(), false)
  assert.equal(f.probes.length, 2, 'logged out users do not probe')
})

test('unmounting while a capability probe is pending cannot leave a ghost websocket subscription', async () => {
  let finish
  const f = fixture(() => new Promise(resolve => { finish = resolve }))
  const stop = f.realtime.subscribeAnnouncementRealtime(() => {})
  stop()
  finish(true)
  await setImmediate()
  assert.deepEqual(f.sockets, [])
  assert.equal(f.events.size, 0)
})

// /exists reads permission-filtered command metadata; receiving announcements must not require bulletin:save.
test('a receiver with no publish commands still sees registered bulletin capability', async () => {
  const f = fixture(async url => ({ success: true, result: url === '/command-supports/services'
    ? [{ id: 'notifyService:bulletin' }] : false }))
  assert.equal(await f.isAnnouncementSupported(), true)
  await f.source.queryAnnouncementInboxNoPaging()
  assert.equal(f.requests.length, 1)
  assert.deepEqual(f.probes, [{ url: '/command-supports/services', params: undefined,
    options: { applicationScope: false, hiddenError: true } }])
})

test('other notify modules cannot stand in for a disabled bulletin module', async () => {
  const f = fixture(async () => ({ success: true, result: [
    { id: 'notifyService' }, { id: 'notifyService:notifier' }, { id: 'notifyService:bulletinExtra' },
  ] }))
  assert.equal(await f.isAnnouncementSupported(), false)
  await f.source.queryAnnouncementInboxNoPaging()
  assert.deepEqual(f.requests, [])
})
