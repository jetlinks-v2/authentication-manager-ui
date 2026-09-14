import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'

const moduleRoot = resolve(import.meta.dirname, '..')
const pageSource = await readFile(resolve(moduleRoot, 'views/system/Department/user/index.vue'), 'utf8')
const positionsSource = await readFile(resolve(moduleRoot, 'views/system/Department/positions/index.vue'), 'utf8')

test('maps department-user Position empty states to UserDimensionTerm existence predicates', () => {
  assert.match(pageSource, /isnull: '\$not\$any'/)
  assert.match(pageSource, /notnull: '\$any'/)
  assert.match(pageSource, /not: '\$not'/)
  assert.match(pageSource, /nin: '\$not'/)
  assert.match(pageSource, /column: `id\$in-dimension\$position\$\{relationSuffix\}`/)
})

test('filters Department Position-role empty states in runtime UI without changing the API contract', () => {
  assert.match(positionsSource, /transformConditionTerms\(serverTerms, \(term\) =>/)
  assert.match(positionsSource, /filterConditionTerms\(params\.terms, \(term\) =>/)
  assert.match(positionsSource, /roleEmptyTermTypes\.push\(term\.termType\)/)
  assert.match(positionsSource, /queryPositionDetailNoPage\(\{\.\.\._params, paging: false\}\)/)
  assert.match(positionsSource, /termType === 'notnull' \? hasRoles : !hasRoles/)
  assert.match(positionsSource, /column: `id\$position-role\$position\$\{relationSuffix\}`/)
  assert.match(positionsSource, /value: Array\.isArray\(value\) \? value : value \? \[value\] : \[\]/)
})
