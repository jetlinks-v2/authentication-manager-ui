import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const runtimeRoot = path.resolve(here, '../../..')
const require = createRequire(import.meta.url)
const esbuild = require(path.join(runtimeRoot, 'node_modules/esbuild'))
const navigationSource = await readFile(new URL('../visDashboard/Base/shared/navigation.ts', import.meta.url), 'utf8')

async function loadNavigation(privateDeployment) {
  const source = navigationSource.replace(
    "import { isPrivateDeployment } from '@jetlinks-web-core/utils/deployment'",
    `const isPrivateDeployment = () => ${privateDeployment}`,
  )
  const result = await esbuild.transform(source, { loader: 'ts', format: 'cjs', target: 'es2022' })
  const module = { exports: {} }
  Function('module', 'exports', result.code)(module, module.exports)
  return module.exports
}

test('private deployment opens the unified device-list video tab', async () => {
  const { HOME_TARGETS } = await loadNavigation(true)
  assert.deepEqual(HOME_TARGETS.addVideo, {
    menus: ['iot-user-device-list'],
    query: { type: 'video' },
  })
})

test('SaaS keeps the edge-gateway video access flow', async () => {
  const { HOME_TARGETS } = await loadNavigation(false)
  assert.deepEqual(HOME_TARGETS.addVideo, {
    menus: ['video/resources'],
    query: { perspective: 'edge-node', action: 'access' },
  })
})
