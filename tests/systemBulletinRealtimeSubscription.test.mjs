import assert from 'node:assert/strict'
import test from 'node:test'
import * as vue from 'vue'
import { loadLogModule } from './logTestLoader.mjs'

test('shared realtime subscription rechecks current qualification and releases stale identities', async () => {
  const events = new Map()
  globalThis.window = {
    addEventListener: (type, callback) => events.set(type, callback),
    removeEventListener: type => events.delete(type),
  }
  const state = vue.reactive({ scope: 'service:user1', project: 'one', verify: '' })
  const sockets = [], queries = []
  let refreshes = 0, disposals = 0
  const { subscribeAnnouncementRealtime } = loadLogModule('views/system/Announcement/realtimeSubscription.ts', {
    vue,
    '@jetlinks-web/core': { wsClient: { getWebSocket(id, topic, parameter) {
      const socket = { id, topic, parameter, releases: 0 }
      sockets.push(socket)
      return { subscribe(callback) {
        socket.receive = callback
        return { unsubscribe: () => socket.releases++ }
      } }
    } } },
    '@jetlinks-web-core/utils/request-context': { getRequestHeaders: () => ({ 'X-Tenant-Domain': state.project, 'x-verify-token': state.verify }) },
    './localReadStore': { getAnnouncementReadScope: () => state.scope, notifyAnnouncementChanges: () => refreshes++ },
    './realtimeNotification': { disposeAnnouncementRealtimeDialogs: () => disposals++ },
    './receivedDataSource': { queryAnnouncementInboxNoPaging: query => new Promise(resolve => queries.push({ query, resolve })) },
  })
  const first = [], second = []
  const owner = vue.effectScope()
  let releaseFirst
  owner.run(() => { releaseFirst = subscribeAnnouncementRealtime(payload => first.push(payload)) })
  const releaseSecond = subscribeAnnouncementRealtime(payload => second.push(payload))
  assert.equal(sockets.length, 1)
  assert.equal(sockets[0].topic, '/system/bulletin/received')
  assert.deepEqual(sockets[0].parameter, {})
  state.verify = 'new-verification'
  assert.equal(sockets.length, 1, 'verification cache is not a connection identity')
  const receive = sockets[0].receive({ payload: { id: 'batch1', message: 'untrusted' } })
  assert.deepEqual(queries[0].query.terms, [{ column: 'id', termType: 'eq', value: 'batch1' }])
  queries[0].resolve({ success: true, result: [{ id: 'batch1', message: 'current' }] })
  await receive
  assert.equal(refreshes, 1)
  assert.equal(first[0].message, 'current')
  assert.equal(second.length, 1)
  owner.stop()
  releaseFirst()
  state.project = 'two'
  assert.equal(sockets[0].releases, 1)
  assert.equal(sockets.length, 2, 'remaining consumer retains reactive context watcher')
  await sockets[0].receive({ payload: { id: 'late' } })
  assert.equal(queries.length, 1)
  const invisible = sockets[1].receive({ payload: { id: 'private' } })
  queries[1].resolve({ success: true, result: [] })
  await invisible
  assert.equal(second.length, 1, 'old handshake content cannot bypass HTTP qualification')
  const pending = sockets[1].receive({ payload: { id: 'pending' } })
  state.scope = ''
  queries[2].resolve({ success: true, result: [{ id: 'pending' }] })
  await pending
  assert.equal(second.length, 1)
  assert.equal(sockets[1].releases, 1)
  assert.equal(sockets.length, 2, 'logged out users must not subscribe')
  state.scope = 'service:user2'
  assert.equal(sockets.length, 3)
  const beforeOnline = disposals
  events.get('online')()
  assert.equal(disposals, beforeOnline, 'online rebuild retains session deduplication')
  assert.equal(sockets[2].releases, 1)
  assert.equal(sockets.length, 4)
  releaseSecond()
  assert.equal(sockets[3].releases, 1)
  assert.equal(events.size, 0)
  delete globalThis.window
})
