import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { coreI18nPlugin } from '../../../jetlinks-web-core/tests/helpers/coreI18nPlugin.mjs'

const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../views/application-center/ProjectApplication/applicationModel.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [coreI18nPlugin(), {
    name: 'application-template-menu-preview-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(dayjs|@jetlinks-web-core\/layout\/runtime\/layoutVariant)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /^dayjs$/, namespace: 'fixture' }, () => ({ contents: `export default () => ({ format: () => '' })` }))
      plugin.onLoad({ filter: /layoutVariant$/, namespace: 'fixture' }, () => ({ contents: `export const normalizeBasicLayoutVariant = value => value` }))
    },
  }],
})
const { templateMenuNames } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

test('extracts nested menu names from the template menu grant response', () => {
  const names = templateMenuNames({
    result: {
      menus: [{ name: '设备管理', children: [{ i18nName: '设备详情' }] }],
      assetAccesses: [],
    },
  })

  assert.deepEqual(names, ['设备管理', '设备详情'])
})
