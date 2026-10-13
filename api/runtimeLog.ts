import { request } from '@jetlinks-web/core'

export interface RuntimeLogNode {
  id: string
  alias?: string
  current?: boolean
}

export interface RuntimeLogProvider {
  id: string
  name: string
  rootId: string
}

export interface RuntimeLogResource {
  serverId: string
  providerId: string
  id: string
  parentId?: string
  name: string
  displayName?: string
  directory: boolean
  operations: string[]
  filters: string[]
  current: boolean
  compressed: boolean
  seekable: boolean
  size?: number | null
}

export interface RuntimeLogFilter {
  keyword?: string
  levels?: string[]
  regex?: string
}

export interface RuntimeLogEntry {
  timestamp?: number | null
  level?: string | null
  message?: string | null
  exceptionStack?: string | null
}

export interface RuntimeLogWindow {
  lines: string[]
  previousPosition?: number | null
  nextPosition?: number | null
  seekable: boolean
  truncated: boolean
}

type ApiResponse<T> = { status: number; success?: boolean; result: T; message?: string }

const basePath = '/system/log'
const options = { hiddenError: true }
const resultOf = <T>(response: ApiResponse<T>): T => {
  if (response.status !== 200 || response.success === false) {
    throw new Error(response.message || `HTTP ${response.status}`)
  }
  return response.result
}

const resourcePath = (nodeId: string, providerId: string, logId: string) =>
  `${basePath}/${[nodeId, providerId, logId].map(encodeURIComponent).join('/')}`

export const getRuntimeLogNodes = async () =>
  resultOf<RuntimeLogNode[]>(await request.get(`${basePath}/nodes`, {}, options))

export const getRuntimeLogProviders = async (nodeId: string): Promise<RuntimeLogProvider[]> => {
  const roots = resultOf<RuntimeLogResource[]>(await request.get(
    `${basePath}/${encodeURIComponent(nodeId)}/roots`, {}, options,
  ))
  return roots.map(root => ({ id: root.providerId, name: root.name, rootId: root.id }))
}

/** 根目录以下逐层读取，使用服务端资源 ID 导航；展示路径不参与下载或读取请求。 */
export const getRuntimeLogResources = async (
  nodeId: string,
  provider: RuntimeLogProvider,
): Promise<RuntimeLogResource[]> => {
  const files: RuntimeLogResource[] = []
  const queue = [{ id: provider.rootId, path: '' }]
  const visited = new Set<string>()
  while (queue.length) {
    const parent = queue.shift()!
    if (visited.has(parent.id)) continue
    visited.add(parent.id)
    const children = resultOf<RuntimeLogResource[]>(await request.get(
      `${resourcePath(nodeId, provider.id, parent.id)}/children`, {}, options,
    ))
    for (const child of children) {
      if (child.directory) {
        queue.push({ id: child.id, path: parent.path ? `${parent.path} / ${child.name}` : child.name })
      } else {
        files.push({
          ...child,
          displayName: provider.id === 'zlmedia' ? child.name
            : (parent.path ? `${parent.path} / ${child.name}` : child.name),
        })
      }
    }
  }
  return files
}

export const readRuntimeLog = async (
  nodeId: string,
  providerId: string,
  logId: string,
  lineCount: number,
  filter: RuntimeLogFilter,
) => resultOf<RuntimeLogWindow>(await request.post(
  `${resourcePath(nodeId, providerId, logId)}/_readWindow`,
  { lineCount, direction: 'backward', filter },
  options,
))

export const downloadRuntimeLog = async (nodeId: string, providerId: string, resource: RuntimeLogResource) => {
  const response = await request.get(`${resourcePath(nodeId, providerId, resource.id)}/download`, {}, {
    ...options,
    responseType: 'arraybuffer',
  })
  const contentType = String(response.headers['content-type'] || '')
  if (contentType.includes('json')) {
    const error = JSON.parse(new TextDecoder().decode(response.data)) as { message?: string; code?: string }
    throw new Error(error.message || error.code || `HTTP ${response.status}`)
  }
  const disposition = String(response.headers['content-disposition'] || '')
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition)
  return {
    blob: new Blob([response.data], { type: contentType || 'application/octet-stream' }),
    name: encoded ? decodeURIComponent(encoded) : (plain?.[1] || plain?.[2]?.trim() || resource.name),
  }
}

export const runtimeLogErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  const value = error as { response?: { data?: unknown }; message?: string }
  let body = value?.response?.data
  if (body instanceof ArrayBuffer) body = new TextDecoder().decode(body)
  if (body instanceof Blob) body = await body.text()
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return value?.message || fallback }
  }
  const detail = body as { message?: string; code?: string } | undefined
  return detail?.message || detail?.code || value?.message || fallback
}
