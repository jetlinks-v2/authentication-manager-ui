export type DocObject = Record<string, unknown>
export interface DocField {
  key: string; name: string; location?: string; type: string; required?: boolean; description: string;
  example?: string; defaultValue?: string; enumValues?: string; children?: DocField[];
}
export interface DocExample { name: string; value: string }
export interface DocContent { type: string; fields: DocField[]; schema: string; examples: DocExample[] }

export const docObject = (value: unknown): DocObject => value && typeof value === 'object' && !Array.isArray(value) ? value as DocObject : {}
const text = (value: unknown): string => typeof value === 'string' ? value : ''
const format = (value: unknown): string | undefined => value === undefined ? undefined : JSON.stringify(value, null, 2)

/** specification 是平台采集的单个 Swagger Operation；components 由同服务、同分组的扩展资源提供。 */
export const buildDebugApiDocument = (operation: DocObject, components: DocObject) => {
  const unresolved = new Set<string>()
  const resolve = (value: unknown, seen = new Set<string>()): DocObject => {
    const node = docObject(value)
    const ref = text(node.$ref)
    if (!ref || seen.has(ref)) return node
    if (!ref.startsWith('#/components/')) { unresolved.add(ref); return node }
    let target: unknown = { components }
    for (const part of ref.slice(2).split('/').map(value => value.replace(/~1/g, '/').replace(/~0/g, '~'))) {
      const parent = docObject(target)
      target = Object.hasOwn(parent, part) ? parent[part] : undefined
    }
    if (!target) { unresolved.add(ref); return node }
    const { $ref: _ref, ...siblings } = node
    return { ...resolve(target, new Set([...seen, ref])), ...siblings }
  }
  const schemaType = (schema: DocObject): string => {
    if (schema.type === 'array') {
      const item = docObject(schema.items)
      const itemType = text(item.type) || text(item.$ref).split('/').pop()
      return itemType ? `${itemType}[]` : 'array'
    }
    return text(schema.type) || text(schema.$ref).split('/').pop() || (schema.properties ? 'object' : '')
  }
  const expandSchema = (value: unknown, seen = new Set<string>()): unknown => {
    if (Array.isArray(value)) return value.map(item => expandSchema(item, seen))
    if (!value || typeof value !== 'object') return value
    const raw = docObject(value)
    const ref = text(raw.$ref)
    // 递归模型保留引用，不无限展开；不会请求外部引用。
    if (ref && seen.has(ref)) return raw
    const next = ref ? new Set([...seen, ref]) : seen
    return Object.fromEntries(Object.entries(resolve(raw)).map(([key, child]) => [key, expandSchema(child, next)]))
  }
  const field = (name: string, value: unknown, required: boolean, key: string, seen: Set<string>): DocField => {
    const raw = docObject(value)
    const schema = resolve(raw)
    const ref = text(raw.$ref)
    const next = ref ? new Set([...seen, ref]) : seen
    const children = ref && seen.has(ref) ? [] : schemaFields(schema.type === 'array' ? schema.items : schema, key, next)
    return { key, name, type: schemaType(schema), required, description: text(schema.description),
      example: format(schema.example), defaultValue: format(schema.default), enumValues: format(schema.enum),
      ...(children.length ? { children } : {}),
    }
  }
  const schemaFields = (value: unknown, prefix = 'body', seen = new Set<string>()): DocField[] => {
    const ref = text(docObject(value).$ref)
    if (ref && seen.has(ref)) return []
    const next = ref ? new Set([...seen, ref]) : seen
    const schema = resolve(value)
    if (schema.type === 'array') return schemaFields(schema.items, prefix, next)
    const required = Array.isArray(schema.required) ? schema.required : []
    return Object.entries(docObject(schema.properties)).map(([name, child]) => field(name, child, required.includes(name), `${prefix}.${name}`, next))
  }
  const examples = (value: DocObject): DocExample[] => {
    const result: DocExample[] = []
    if (value.example !== undefined) result.push({ name: '', value: format(value.example)! })
    for (const [name, entry] of Object.entries(docObject(value.examples))) {
      const example = resolve(entry)
      if (example.value !== undefined) result.push({ name: text(example.summary) || name, value: format(example.value)! })
    }
    return result
  }
  const contents = (value: unknown): DocContent[] => Object.entries(docObject(value)).map(([type, entry]) => {
    const media = docObject(entry)
    const schema = docObject(expandSchema(media.schema))
    const values = examples(media)
    if (!values.length && schema.example !== undefined) values.push({ name: '', value: format(schema.example)! })
    return { type, fields: schemaFields(media.schema), schema: Object.keys(schema).length ? format(schema)! : '',
      examples: values,
    }
  })
  const parameters = (Array.isArray(operation.parameters) ? operation.parameters : []).map((value, index) => {
    const parameter = resolve(value)
    const schema = resolve(parameter.schema)
    return { ...field(text(parameter.name) || text(parameter.$ref), schema, parameter.required === true, `parameter.${index}`, new Set()),
      location: text(parameter.in), description: text(parameter.description) || text(schema.description),
      required: parameter.$ref ? undefined : parameter.required === true,
      example: format(parameter.example === undefined ? schema.example : parameter.example),
    }
  })
  const request = resolve(operation.requestBody)
  const requestContents = contents(request.content)
  const responses = Object.entries(docObject(operation.responses)).map(([status, entry]) => {
    const response = resolve(entry)
    return { status, description: text(response.description), contents: contents(response.content) }
  })
  return { description: text(operation.description), parameters, requestDescription: text(request.description),
    requestRequired: request.required === true, requestContents, responses, unresolved: [...unresolved],
  }
}
