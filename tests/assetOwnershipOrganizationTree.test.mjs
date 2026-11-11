import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import setupNameSupport from 'vite-plugin-vue-setup-extend'

const require = createRequire(import.meta.url)
const { transformSync } = require('esbuild')
const module = { exports: {} }
const { code } = transformSync(
  readFileSync(
    resolve(import.meta.dirname, '../views/application-center/ProjectApplication/useOwnershipOrganizationTree.ts'),
    'utf8'
  ),
  { loader: 'ts', format: 'cjs' }
)
new Function('require', 'exports', 'module', code)(require, module.exports, module)
const { useOwnershipOrganizationTree } = module.exports
const overflowModule = { exports: {} }
const overflowCode = transformSync(
  readFileSync(
    resolve(import.meta.dirname, '../views/application-center/ProjectApplication/useSelectedTagOverflow.ts'),
    'utf8'
  ),
  { loader: 'ts', format: 'cjs' }
).code
new Function('require', 'exports', 'module', overflowCode)(require, overflowModule.exports, overflowModule)
const { getSelectedTagLayout } = overflowModule.exports

test('selected tags use both rows before collapsing and reserve space for the overflow count', () => {
  assert.deepEqual(getSelectedTagLayout([60, 60, 60, 60], 128, 22, 4), { count: 4, left: 0, line: 0 })
  assert.deepEqual(getSelectedTagLayout([60, 60, 60, 60, 60], 128, 22, 4), { count: 3, left: 64, line: 1 })
  assert.deepEqual(getSelectedTagLayout([], 128, 22, 4), { count: 0, left: 0, line: 0 })
})

test('long labels and changing available width change the visible prefix without exceeding two rows', () => {
  assert.deepEqual(getSelectedTagLayout([128, 128, 128], 128, 22, 4), { count: 1, left: 0, line: 1 })
  assert.deepEqual(getSelectedTagLayout([60, 60, 60, 60, 60], 80, 22, 4), { count: 1, left: 0, line: 1 })
  assert.deepEqual(getSelectedTagLayout([60, 60, 60, 60, 60], 192, 22, 4), { count: 5, left: 0, line: 0 })
})

test('organization selector compiles through the actual development setup-name plugin', async () => {
  const filename = resolve(
    import.meta.dirname,
    '../views/application-center/ProjectApplication/OwnershipOrganizationTree.vue'
  )
  const result = await setupNameSupport().transform(readFileSync(filename, 'utf8'), filename)
  assert.ok(result.code.includes('useOwnershipOrganizationTree'))
})

test('embedded organization selection delegates its summary to the host and keeps single/multiple tree behavior', async (t) => {
  const filename = resolve(
    import.meta.dirname,
    '../views/application-center/ProjectApplication/OwnershipOrganizationTree.vue'
  )
  const descriptor = parse(readFileSync(filename, 'utf8'), { filename }).descriptor
  const script = compileScript(descriptor, { id: 'organization-tree', inlineTemplate: true })
  const componentModule = { exports: {} }
  const imports = (id) =>
    id === 'vue-i18n'
      ? { useI18n: () => ({ t: (key) => key }) }
      : id === './useOwnershipOrganizationTree'
        ? module.exports
        : id === './useSelectedTagOverflow'
          ? overflowModule.exports
          : require(id)
  new Function('require', 'exports', 'module', transformSync(script.content, { loader: 'ts', format: 'cjs' }).code)(
    imports,
    componentModule.exports,
    componentModule
  )
  for (const config of [
    { embedded: false, multiple: true },
    { embedded: true, multiple: true },
    { embedded: true, multiple: false }
  ]) {
    await t.test(JSON.stringify(config), async () => {
      const popovers = [],
        trees = []
      const renderer = vue.createRenderer({
        createElement: (tag) => ({ tag, children: [], attrs: {} }),
        createText: (text) => ({ text }),
        createComment: (text) => ({ text }),
        insert: (child, parent) => {
          child.parent = parent
          parent.children.push(child)
        },
        remove: () => {},
        setText: () => {},
        setElementText: () => {},
        patchProp: (element, name, _, value) => {
          element.attrs[name] = value
        },
        parentNode: (element) => element.parent,
        nextSibling: () => null
      })
      const previousObserver = globalThis.ResizeObserver
      globalThis.ResizeObserver = class {
        observe() {}
        disconnect() {}
      }
      const app = renderer.createApp(componentModule.exports.default, {
        value: ['east', 'dev'],
        options: tree,
        ...config
      })
      const passthrough = {
        setup:
          (_, { slots }) =>
          () =>
            vue.h('div', slots.default?.())
      }
      for (const name of ['a-input', 'a-tag', 'a-spin', 'a-empty', 'a-button', 'a-alert'])
        app.component(name, passthrough)
      app.component('a-popover', {
        props: ['getPopupContainer'],
        setup: (props, { slots }) => {
          popovers.push(props)
          return () => vue.h('span', slots.default?.())
        }
      })
      app.component('a-tree', {
        props: { virtual: Boolean, height: Number, checkable: Boolean, selectable: Boolean },
        setup: (props) => {
          trees.push(props)
          return () => null
        }
      })
      const host = { children: [] }
      try {
        app.mount(host)
        await settle()
        assert.equal(popovers.length, config.embedded ? 0 : 1)
        if (!config.embedded) {
          const container = popovers[0].getPopupContainer({ ownerDocument: { body: {} } })
          assert.equal(vue.toRaw(container), host.children[0])
          assert.equal(container.attrs.class, 'ownership-organization-tree')
        }
        assert.equal(trees[0].virtual, true)
        assert.equal(trees[0].height, config.embedded ? 176 : 240)
        assert.equal(trees[0].checkable, config.multiple)
        assert.equal(trees[0].selectable, !config.multiple)
      } finally {
        app.unmount()
        globalThis.ResizeObserver = previousObserver
      }
    })
  }
})
const tree = [
  {
    value: 'east',
    label: '华东',
    children: [
      { value: 'dev', label: '研发', children: [{ value: 'api', label: 'API 组' }] },
      { value: 'ops', label: '运维' }
    ]
  },
  { value: 'south', label: '华南' }
]
const fixture = (value = [], config = { loadOptions: async () => tree }, inline = false) => {
  const scope = vue.effectScope()
  const props = vue.reactive({ value, config, selectedOnly: false })
  const api = scope.run(() =>
    useOwnershipOrganizationTree(
      props,
      (ids) => {
        props.value = ids
      },
      () => inline
    )
  )
  return { props, api, stop: () => scope.stop() }
}
const settle = async () => {
  await Promise.resolve()
  await vue.nextTick()
}
test('relation target ancestors open initially and binding-status updates preserve manual expansion', async () => {
  const h = fixture([], {}, true)
  try {
    h.props.focusValue = 'api'
    h.props.options = tree
    await settle()
    assert.ok(h.api.expandedKeys.value.includes('dev'), 'the edited target is not hidden under a closed ancestor')
    h.api.onExpand(['south'])
    h.props.options = tree.map((row) => ({ ...row, disabled: true }))
    await settle()
    assert.deepEqual(h.api.expandedKeys.value, ['south'], 'permission refresh cannot reopen collapsed branches')
  } finally {
    h.stop()
  }
})
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('inline search shows only direct matches with paths, prioritizes checked items and freezes order within a query', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const items = [
    {
      value: 'region',
      label: 'Region',
      children: [
        { value: 'a', label: 'Team A' },
        { value: 'b', label: 'Team B' },
        { value: 'c', label: 'Team C' }
      ]
    }
  ]
  let calls = 0
  const h = fixture(
    ['b'],
    {
      loadOptions: async () => {
        calls++
        return items
      }
    },
    true
  )
  try {
    await settle()
    h.api.keyword.value = 'team'
    t.mock.timers.tick(180)
    assert.equal(h.api.listMode.value, true)
    assert.deepEqual(
      h.api.treeData.value.map((n) => n.key),
      ['b', 'a', 'c']
    )
    assert.ok(h.api.treeData.value.every((n) => n.path === 'Region' && !n.children))
    h.api.onCheck([], { checked: true, node: { key: 'a' } })
    h.api.onCheck([], { checked: false, node: { key: 'b' } })
    assert.deepEqual(
      h.api.treeData.value.map((n) => n.key),
      ['b', 'a', 'c']
    )
    h.api.keyword.value = ' team '
    t.mock.timers.tick(180)
    assert.deepEqual(
      h.api.treeData.value.map((n) => n.key),
      ['b', 'a', 'c'],
      'equivalent input does not reorder'
    )
    h.api.keyword.value = 'other'
    t.mock.timers.tick(180)
    assert.deepEqual(h.api.treeData.value, [])
    h.api.keyword.value = 'team'
    t.mock.timers.tick(180)
    assert.deepEqual(
      h.api.treeData.value.map((n) => n.key),
      ['a', 'b', 'c']
    )
    h.api.keyword.value = ''
    assert.equal(h.api.listMode.value, false)
    assert.deepEqual(
      h.api.treeData.value[0].children.map((n) => n.key),
      ['a', 'b', 'c']
    )
    assert.equal(calls, 1)
  } finally {
    h.stop()
  }
})

test('inline selected review ignores the query and preserves hidden targets, without binding descendants', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = fixture(['api', 'south', 'missing'], { loadOptions: async () => tree }, true)
  try {
    await settle()
    h.api.onExpand(['east'])
    h.api.keyword.value = 'API'
    t.mock.timers.tick(180)
    assert.deepEqual(
      h.api.treeData.value.map((n) => n.key),
      ['api']
    )
    h.props.selectedOnly = true
    assert.deepEqual(
      h.api.treeData.value.map((n) => n.key),
      ['api', 'south', 'missing']
    )
    assert.equal(h.api.treeData.value[0].path, '华东 / 研发')
    assert.ok(h.api.treeData.value.every((n) => !n.children))
    h.api.onCheck([], { checked: false, node: { key: 'south' } })
    assert.deepEqual(h.props.value, ['api', 'missing'])
    h.api.keyword.value = ''
    h.props.selectedOnly = false
    assert.deepEqual(h.api.expandedKeys.value, ['east'])
    assert.equal(h.api.treeData.value[0].children[0].children[0].key, 'api')
  } finally {
    h.stop()
  }
})

test('checked parents are independent and hidden or missing selections survive search and checking', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = fixture(['south', 'missing'])
  try {
    await settle()
    h.api.keyword.value = 'API'
    t.mock.timers.tick(180)
    await vue.nextTick()
    assert.deepEqual(
      h.api.treeData.value.map((node) => node.key),
      ['east']
    )
    assert.deepEqual(
      h.api.treeData.value[0].children.map((node) => node.key),
      ['dev']
    )
    assert.deepEqual(h.api.expandedKeys.value, ['dev', 'east'])
    h.api.onCheck([], { checked: true, node: { key: 'east' } })
    assert.deepEqual(h.props.value, ['south', 'missing', 'east'])
    assert.equal(h.props.value.includes('dev'), false)
    assert.equal(h.props.value.includes('api'), false)
    h.api.onCheck([], { checked: false, node: { key: 'east' } })
    assert.deepEqual(h.props.value, ['south', 'missing'])
    h.api.remove('missing')
    assert.deepEqual(h.props.value, ['south'])
  } finally {
    h.stop()
  }
})

test('reopening expands selected ancestors, shows paths and restores expansion after search clears', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = fixture(['api'])
  try {
    await settle()
    assert.deepEqual(h.api.expandedKeys.value, ['east', 'dev'])
    assert.deepEqual(h.api.selected.value, [{ value: 'api', label: '华东 / 研发 / API 组' }])
    h.api.onExpand(['east'])
    h.api.keyword.value = '运维'
    t.mock.timers.tick(180)
    await vue.nextTick()
    assert.deepEqual(h.api.expandedKeys.value, ['east'])
    h.api.keyword.value = '华东'
    t.mock.timers.tick(180)
    await vue.nextTick()
    h.api.onExpand(['east', 'dev'])
    assert.deepEqual(h.api.expandedKeys.value, ['east', 'dev'])
    h.api.keyword.value = ''
    await vue.nextTick()
    assert.deepEqual(h.api.expandedKeys.value, ['east'])
    assert.deepEqual(h.props.value, ['api'])
  } finally {
    h.stop()
  }
})

test('organizations initially expand one level and a large tree is searched locally after typing settles', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let calls = 0
  const largeTree = Array.from({ length: 100 }, (_, root) => ({
    value: `root-${root}`,
    label: `Region ${root}`,
    children: Array.from({ length: 200 }, (_, child) => ({
      value: `${root}-${child}`,
      label: `Team ${root}-${child}`,
      children: child === 199 ? [{ value: `leaf-${root}`, label: `Leaf ${root}` }] : undefined
    }))
  }))
  const h = fixture(['missing'], {
    loadOptions: async () => {
      calls++
      return largeTree
    }
  })
  try {
    await settle()
    const fullTree = h.api.treeData.value
    assert.deepEqual(
      h.api.expandedKeys.value,
      largeTree.map((node) => node.value)
    )
    h.api.onExpand(['root-1'])
    h.api.keyword.value = 'does not exist'
    t.mock.timers.tick(100)
    h.api.keyword.value = 'LEAF 99'
    t.mock.timers.tick(179)
    assert.equal(h.api.treeData.value, fullTree, 'typing does not rebuild the visible tree')
    t.mock.timers.tick(1)
    assert.deepEqual(
      h.api.treeData.value.map((node) => node.key),
      ['root-99']
    )
    assert.deepEqual(h.api.expandedKeys.value, ['99-199', 'root-99'])
    assert.deepEqual(
      h.api.treeData.value[0].children[0].children.map((node) => node.key),
      ['leaf-99']
    )
    assert.deepEqual(h.props.value, ['missing'])

    h.api.keyword.value = 'Region 99'
    t.mock.timers.tick(180)
    assert.equal(h.api.treeData.value[0], fullTree[99], 'matching parents reuse their complete cached subtree')
    assert.deepEqual(h.api.expandedKeys.value, ['root-99'])
    h.api.keyword.value = ''
    assert.equal(h.api.treeData.value, fullTree)
    assert.deepEqual(h.api.expandedKeys.value, ['root-1'])
    h.api.keyword.value = 'missing'
    t.mock.timers.tick(180)
    assert.deepEqual(h.api.treeData.value, [])
    h.api.keyword.value = ''
    assert.equal(h.api.treeData.value, fullTree)
    assert.equal(calls, 1)
    h.api.keyword.value = 'Leaf 1'
    h.stop()
    t.mock.timers.tick(180)
    assert.equal(h.api.treeData.value, fullTree, 'unmount cancels pending local searches')
  } finally {
    h.stop()
  }
})

test('failed loading prevents applying and an explicit retry ignores stale and disposed responses', async () => {
  const old = deferred(),
    retry = deferred()
  const h = fixture(['api'], { loadOptions: () => old.promise })
  try {
    assert.equal(h.api.loading.value, true)
    h.props.config = { loadOptions: () => retry.promise }
    await vue.nextTick()
    old.resolve([{ value: 'old', label: 'Old' }])
    await settle()
    assert.equal(h.api.loading.value, true)
    retry.reject(new Error('failed'))
    await settle()
    assert.equal(h.api.failed.value, true)
    assert.deepEqual(h.props.value, ['api'])
    h.props.config = { loadOptions: async () => tree }
    await settle()
    assert.equal(h.api.failed.value, false)
    assert.equal(h.api.selected.value[0].label, '华东 / 研发 / API 组')
    const disposed = deferred()
    h.props.config = { loadOptions: () => disposed.promise }
    await vue.nextTick()
    h.stop()
    disposed.resolve([{ value: 'api', label: 'Disposed name' }])
    await settle()
    assert.equal(h.api.selected.value[0].label, '华东 / 研发 / API 组')
  } finally {
    h.stop()
  }
})

test('explicit retry uses the same loader and preserves checked organizations', async () => {
  let calls = 0
  const h = fixture(['api'], {
    loadOptions: async () => {
      if (++calls === 1) throw new Error('temporarily unavailable')
      return tree
    }
  })
  try {
    await settle()
    assert.equal(h.api.failed.value, true)
    assert.deepEqual(h.props.value, ['api'])
    await h.api.retry()
    assert.equal(h.api.failed.value, false)
    assert.equal(calls, 2)
    assert.deepEqual(h.props.value, ['api'])
    assert.equal(h.api.treeData.value.length, tree.length)
  } finally {
    h.stop()
  }
})
