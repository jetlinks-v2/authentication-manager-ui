import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

const createEnvironment = () => {
  const user = { userInfo: { id: 'user-A' } }
  let service = '/api'
  const data = new Map(), events = new Map(), calls = []
  globalThis.localStorage = {
    get length() { return data.size }, key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value),
  }
  globalThis.window = { location: { origin: 'http://runtime.test' },
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) }
  const createTab = () => loadLogModule('views/system/Announcement/localReadStore.ts', {
    '@jetlinks-web-core/store/user': { useUserStore: () => user },
    '@jetlinks-web-core/utils/request-context': { getRequestBaseApi: () => service },
  })
  const store = createTab()
  let respond = () => ({ success: true, status: 200, result: [] })
  const source = loadLogModule('views/system/Announcement/receivedDataSource.ts', {
    './localReadStore': store,
    '@jetlinks-web/core': { request: { post: async (url, query) => { calls.push({ url, query }); return respond(url, query) } } },
    '@jetlinks-web-core/locales': { __esModule: true, default: { global: { t: key => key } } },
  })
  return { store, source, user, data, events, calls, createTab, service: value => { service = value }, respond: fn => { respond = fn } }
}

// Evaluate QueryParam boolean groups independently from the transform implementation.
const matches = (record, terms = []) => terms.reduce((result, term, index) => {
  let value
  if (term.column) {
    const field = record[term.column]
    if (term.termType === 'isnull') value = field == null
    else if (term.termType === 'notnull') value = field != null
    else if (term.termType === 'in') value = term.value.includes(field)
    else if (term.termType === 'nin') value = !term.value.includes(field)
    else if (term.termType === 'not') value = field !== term.value
    else value = field === term.value
  } else value = matches(record, term.terms)
  return index === 0 ? value : term.type === 'or' ? result || value : result && value
}, true)

test('nested AND/OR and empty sets keep true/false semantics without sending state', () => {
  const { source } = createEnvironment()
  for (const readIds of [[], ['v1']]) {
    for (const operator of ['eq', 'not', 'neq', 'in', 'nin']) {
      for (const value of ['read', 'unread', ['read', 'unread'], ['unknown'], []]) {
        const input = [{ terms: [{ column: 'state', termType: operator, value },
          { column: 'topicName', value: 'forced', type: 'or' }] }, { column: 'tenant', value: 'A' }]
        const original = JSON.stringify(input)
        const transformed = source.transformAnnouncementStateTerms(input, readIds)
        assert.equal(JSON.stringify(input), original)
        assert.equal(JSON.stringify(transformed).includes('"state"'), false)
        const values = Array.isArray(value) ? value : [value]
        for (const record of [{ id: 'v1', tenant: 'A' }, { id: 'v2', tenant: 'A' },
          { id: 'v2', tenant: 'A', topicName: 'forced' }, { id: 'v1', tenant: 'B', topicName: 'forced' }]) {
          const state = readIds.includes(record.id) ? 'read' : 'unread'
          const stateMatches = values.includes(state) !== ['not', 'neq', 'nin'].includes(operator)
          assert.equal(matches(record, transformed), (stateMatches || record.topicName === 'forced') && record.tenant === 'A')
        }
      }
    }
  }
})

test('205 rows paginate/count on visible qualification before state injection, including invisible local IDs', async () => {
  const { store, source, respond, calls } = createEnvironment()
  const rows = Array.from({ length: 205 }, (_, i) => ({ id: `bulletin-${i}:1`, bulletinId: `bulletin-${i}`, publishVersion: 1, tenant: i < 180 ? 'A' : 'B' }))
  const readIds = rows.filter((_, i) => i % 3 === 0).map(row => row.id).concat('invisible-old-batch')
  store.changeAnnouncementLocalState('_read', readIds)
  respond((url, query) => {
    const eligible = rows.filter(row => row.tenant === 'A' && matches({ ...row, id: row.bulletinId }, query.terms))
    return { success: true, status: 200, result: url.endsWith('_count') ? eligible.length : {
      data: eligible.slice(query.pageIndex * query.pageSize, (query.pageIndex + 1) * query.pageSize), total: eligible.length } }
  })
  const query = { terms: [{ column: 'state', value: 'unread' }], pageSize: 17 }
  const all = []
  for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
    const response = await source.queryAnnouncementInbox({ ...query, pageIndex })
    assert.equal(response.result.total, 120)
    assert.ok(response.result.data.every(row => row.state.value === 'unread'))
    all.push(...response.result.data.map(row => row.id))
  }
  assert.equal(all.length, 120)
  assert.equal(new Set(all).size, 120)
  assert.deepEqual((await source.countAnnouncementUnread({ pageSize: 200 })).result, { count: 120, overflow: false })
  assert.deepEqual((await source.countAnnouncementUnread({ pageSize: 99 })).result, { count: 99, overflow: true })
  assert.ok(calls.every(({ query }) => !JSON.stringify(query).includes('"state"')))
})

test('same user shares projects; account, runtime UID, service and new publication batches stay isolated', async () => {
  const { store, source, user, service, calls } = createEnvironment()
  await source.changeAnnouncementReadState('_read', ['bulletin-v1'])
  assert.deepEqual(store.getAnnouncementReadIds(), ['bulletin-v1'])
  user.userInfo.projectId = 'B'
  assert.deepEqual(store.getAnnouncementReadIds(), ['bulletin-v1'])
  user.userInfo.id = 'user-B'
  assert.deepEqual(store.getAnnouncementReadIds(), [])
  user.userInfo.id = 'runtime-uid-A'
  assert.deepEqual(store.getAnnouncementReadIds(), [])
  user.userInfo.id = 'user-A'
  service('http://other-service/api')
  assert.deepEqual(store.getAnnouncementReadIds(), [])
  service('/api')
  assert.equal(store.getAnnouncementReadIds().includes('bulletin-v2'), false)
  await source.changeAnnouncementReadState('_unread', ['bulletin-v1'])
  assert.deepEqual(store.getAnnouncementReadIds(), [])
  assert.equal(calls.length, 0)
})

test('all-read projects IDs only and records the captured account without hiding later-visible history', async () => {
  const { store, source, user, respond, calls } = createEnvironment()
  let finish
  respond(() => new Promise(resolve => { finish = resolve }))
  const pending = source.markAllAnnouncementsRead()
  user.userInfo.id = 'user-B'
  finish({ success: true, status: 200, result: [{ id: 'visible-v1' }] })
  await pending
  assert.deepEqual(store.getAnnouncementReadIds(), [])
  user.userInfo.id = 'user-A'
  assert.deepEqual(store.getAnnouncementReadIds(), ['visible-v1'])
  assert.equal(store.getAnnouncementReadIds().includes('later-visible-old-publication'), false)
  assert.deepEqual(calls[0].query, { paging: false, includes: ['id', 'publishVersion'] })
})

test('same-page, storage writes and clear refresh listeners; other identities do not; cleanup removes listener', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { store, events, data } = createEnvironment()
  let refreshed = 0
  const stop = store.subscribeAnnouncementReadChanges(() => { refreshed++ })
  store.changeAnnouncementLocalState('_read', ['v1'])
  assert.equal(refreshed, 1)
  events.get('storage')({ key: 'another-account', storageArea: localStorage })
  assert.equal(refreshed, 1)
  events.get('storage')({ key: store.getAnnouncementReadScope(), storageArea: localStorage })
  t.mock.timers.tick(30)
  assert.equal(refreshed, 2)
  data.clear()
  events.get('storage')({ key: null, storageArea: localStorage })
  t.mock.timers.tick(30)
  assert.equal(refreshed, 3)
  assert.deepEqual(store.getAnnouncementReadIds(), [])
  stop()
  assert.equal(events.size, 0)
})


test('an all-read request started without an identity cannot write a later signed-in account', async () => {
  const { store, source, user, respond } = createEnvironment()
  user.userInfo.id = ''
  let finish
  respond(() => new Promise(resolve => { finish = resolve }))
  const pending = source.markAllAnnouncementsRead()
  user.userInfo.id = 'user-B'
  finish({ success: true, status: 200, result: [{ id: 'visible-v1' }] })
  await pending
  assert.deepEqual(store.getAnnouncementReadIds(), [])
})

test('unread count caps at 99 without server read endpoints', async () => {
  const { source, respond, calls } = createEnvironment()
  respond(() => ({ success: true, status: 200, result: 205 }))
  const response = await source.countAnnouncementUnread({ pageSize: 99 })
  assert.deepEqual(response.result, { count: 99, overflow: true })
  assert.equal(calls[0].url, '/system/bulletin/received/_count')
})

test('interleaved confirmations in independent tabs preserve both publication IDs', () => {
  const {store, createTab} = createEnvironment()
  const otherTab = createTab()
  const scope = store.getAnnouncementReadScope()
  const read = localStorage.getItem, write = localStorage.setItem
  let interleaved = false
  const confirmInOtherTab = () => {
    if (interleaved) return
    interleaved = true
    otherTab.changeAnnouncementLocalState('_read', ['publication-B'])
  }
  // Reproduce the second tab writing after the first captured the old shared value.
  // The setItem hook also exercises independent-key writes at the same interleaving.
  localStorage.getItem = key => {
    const snapshot = read(key)
    if (key === scope) confirmInOtherTab()
    return snapshot
  }
  localStorage.setItem = (key, value) => { confirmInOtherTab(); write(key, value) }
  store.changeAnnouncementLocalState('_read', ['publication-A'])
  localStorage.getItem = read
  localStorage.setItem = write
  assert.equal(interleaved, true)
  assert.deepEqual(store.getAnnouncementReadIds().sort(), ['publication-A', 'publication-B'])
  assert.deepEqual(otherTab.getAnnouncementReadIds().sort(), ['publication-A', 'publication-B'])
})


test('per-publication read and unread override the previous local set without importing backend state', () => {
  const {store, data} = createEnvironment()
  const scope = store.getAnnouncementReadScope()
  data.set(scope, JSON.stringify(['legacy-v1', 'legacy-v2']))
  store.changeAnnouncementLocalState('_unread', ['legacy-v1'])
  store.changeAnnouncementLocalState('_read', ['new-v1'])
  assert.deepEqual(store.getAnnouncementReadIds().sort(), ['legacy-v2', 'new-v1'])
  store.changeAnnouncementLocalState('_read', ['legacy-v1'])
  assert.deepEqual(store.getAnnouncementReadIds().sort(), ['legacy-v1', 'legacy-v2', 'new-v1'])
  data.set(scope, '{invalid local set')
  assert.deepEqual(store.getAnnouncementReadIds().sort(), ['legacy-v1', 'new-v1'])
})

test('205 publication storage events coalesce to one refresh and unsubscribe cancels pending work', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const {store, events, data} = createEnvironment()
  let refreshed = 0
  const stop = store.subscribeAnnouncementReadChanges(() => { refreshed++ })
  const ids = Array.from({length: 205}, (_, index) => `batch-${index}`)
  store.changeAnnouncementLocalState('_read', ids)
  assert.equal(refreshed, 1, 'one same-page callback for the batch')
  const storageKeys = [...data.keys()]
  assert.equal(storageKeys.length, 205)
  storageKeys.forEach(key => events.get('storage')({key, storageArea: localStorage}))
  assert.equal(refreshed, 1)
  t.mock.timers.tick(30)
  assert.equal(refreshed, 2, 'one cross-tab refresh for all 205 events')
  assert.equal(store.getAnnouncementReadIds().length, 205)
  events.get('storage')({key: storageKeys[0], storageArea: localStorage})
  stop()
  t.mock.timers.tick(30)
  assert.equal(refreshed, 2, 'destroyed subscriptions do not refresh later')
})


test('notification fields and provider groups map to ordinary bulletin queries', async () => {
  const { source, calls } = createEnvironment()
  await source.queryAnnouncementInbox({
    sorts: [{ name: 'notifyTime', order: 'desc' }],
    terms: [{ terms: [{ column: 'topicProvider', termType: 'in', value: ['SystemBulletin'] },
      { column: 'topicProvider', termType: 'eq', value: 'Other', type: 'or' }] },
      { column: 'topicName', termType: 'like', value: 'title%' },
      { column: 'message', termType: 'like', value: 'summary%' },
      { column: 'notifyTime', termType: 'gte', value: 10 }],
  })
  const query = calls[0].query
  assert.deepEqual(query.sorts, [{ name: 'deployTime', order: 'desc' }])
  assert.equal(matches({ id: 'bulletin' }, query.terms[0].terms), true)
  assert.deepEqual(query.terms.slice(1).map(term => term.column), ['title', 'summary', 'deployTime'])
})

test('mixed publication versions preserve nested read predicates and realtime lookup', async () => {
  const { source, store, calls } = createEnvironment()
  store.changeAnnouncementLocalState('_read', ['a:1', 'b:2', 'foreign:1', 'removed-batch'])
  const rows = [{ id: 'a', publishVersion: 1 }, { id: 'a', publishVersion: 2 },
    { id: 'b', publishVersion: 1 }, { id: 'b', publishVersion: 2 }, { id: 'c', publishVersion: 3 }]
  for (const state of ['read', 'unread']) {
    await source.queryAnnouncementInbox({ terms: [{ terms: [{ column: 'state', value: state },
      { column: 'topicName', value: 'forced', type: 'or' }] }] })
    const terms = calls.at(-1).query.terms
    rows.forEach(row => {
      const read = ['a:1', 'b:2'].includes(`${row.id}:${row.publishVersion}`)
      assert.equal(matches(row, terms), state === 'read' ? read : !read)
      assert.equal(matches({ ...row, title: 'forced' }, terms), true)
    })
  }
  await source.queryAnnouncementInboxNoPaging({ terms: [{ column: 'id', termType: 'eq', value: 'a:2' }] })
  assert.deepEqual(rows.filter(row => matches(row, calls.at(-1).query.terms)), [rows[1]])
})

test('404 and malformed responses do not fall back to notifications or fabricate counts', async () => {
  const { source, respond, calls } = createEnvironment()
  respond(() => ({ success: false, status: 404 }))
  assert.equal((await source.queryAnnouncementInbox()).status, 404)
  assert.equal((await source.countAnnouncementUnread()).status, 404)
  assert.ok(calls.every(call => call.url.startsWith('/system/bulletin/received/')))
  respond(() => ({ success: true, status: 200, result: null }))
  await assert.rejects(source.queryAnnouncementInbox(), /collection/)
  await assert.rejects(source.countAnnouncementUnread(), /count/)
})
