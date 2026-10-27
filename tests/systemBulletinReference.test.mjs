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

test('does not infer publication identity from dataId or accept an unversioned reference', () => {
  const { resolveSystemBulletinReference } = loadApi()
  for (const input of [
    { dataId: 'bulletin-A:3' },
    { detail: { id: 'bulletin-A', publishVersion: 3 } },
    { bulletinId: 'bulletin-A' },
    { bulletinId: 'bulletin-A', publishVersion: 0 },
    { bulletinId: 'bulletin-A', publishVersion: -1 },
    { bulletinId: 'bulletin-A', publishVersion: 1.5 },
    { bulletinId: 'bulletin-A', publishVersion: 'invalid' },
  ]) assert.equal(resolveSystemBulletinReference(input), undefined)
})
