import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

const loadApi = () => loadLogModule('views/system/Announcement/api.ts', {
  '@jetlinks-web/core': { request: {} },
  './announcementI18n': {},
  './receivedDataSource': {},
})

test('uses the explicit current publication reference, including top-level received fields', () => {
  const { resolveSystemBulletinReference } = loadApi()
  assert.deepEqual(resolveSystemBulletinReference({
    bulletinId: 'bulletin-A', publishVersion: 3,
    detail: { bulletinId: 'stale-snapshot', publishVersion: 2 },
  }), { bulletinId: 'bulletin-A', publishVersion: 3 })
  assert.deepEqual(resolveSystemBulletinReference({
    detailJson: JSON.stringify({ bulletinId: 'bulletin-B', publishVersion: 1 }),
  }), { bulletinId: 'bulletin-B', publishVersion: 1 })
})

test('keeps legacy unversioned references but rejects a batch id without its explicit version', () => {
  const { resolveSystemBulletinReference } = loadApi()
  assert.deepEqual(resolveSystemBulletinReference({ dataId: 'legacy-bulletin' }), {
    bulletinId: 'legacy-bulletin',
  })
  assert.deepEqual(resolveSystemBulletinReference({ detail: { id: 'legacy-detail' } }), {
    bulletinId: 'legacy-detail',
  })
  assert.deepEqual(resolveSystemBulletinReference({ bulletinId: 'legacy-top-level' }), {
    bulletinId: 'legacy-top-level',
  })
  for (const input of [
    { dataId: 'bulletin-A:3' },
    { bulletinId: 'bulletin-A', publishVersion: 0 },
    { bulletinId: 'bulletin-A', publishVersion: -1 },
    { bulletinId: 'bulletin-A', publishVersion: 1.5 },
    { bulletinId: 'bulletin-A', publishVersion: 'invalid' },
  ]) assert.equal(resolveSystemBulletinReference(input), undefined)
})
