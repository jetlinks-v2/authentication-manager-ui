import { Observable, timeout, TimeoutError, type Subscription } from 'rxjs'
import { createDiagnosticsStream, unwrapDiagnosticRecord } from './transport'
import type { MonitorQueryClient } from './client'

export interface CurrentMBeanQuery { id: string; name: string; attributes: string[] }
export interface CurrentMBeanSample { queryId: string; collectedAt: number; status: string; beans: Record<string, unknown>[] }
export const mbeanRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

/** 资源卡片与网关监控共用批采集；base 为空时读取本机，否则读取调用方指定的网关代理。 */
export function observeMBeans(client: Pick<MonitorQueryClient, 'get'>, base: string, queries: CurrentMBeanQuery[], interval = 2): Observable<CurrentMBeanSample> {
  return new Observable<CurrentMBeanSample>(observer => {
    if (![1, 2, 5].includes(interval) || !queries.length || new Set(queries.map(query => query.id)).size !== queries.length) {
      observer.error(Object.assign(new Error('Invalid MBean collection plan'), { status: 400 })); return
    }
    let disposed = false, subscription: Subscription | undefined
    void client.get(base + '/system/monitor/members').then(value => {
      if (disposed) return
      if (!Array.isArray(value)) throw new Error('Invalid monitor nodes')
      const nodes = value.map(mbeanRecord), current = nodes.filter(node => node.current === true)
      const node = current.length === 1 ? current[0] : nodes.length === 1 ? nodes[0] : undefined
      if (typeof node?.id !== 'string' || !node.id) throw Object.assign(new Error('Monitor node unavailable'), { code: 'unsupported' })
      const sequences = new Map<string, number>(), deadlines = new Map(queries.map(query => [query.id, Date.now() + 20000]))
      let watchdog: ReturnType<typeof setTimeout>
      const arm = () => {
        clearTimeout(watchdog)
        watchdog = setTimeout(() => observer.error(new TimeoutError()), Math.max(0, Math.min(...deadlines.values()) - Date.now()))
      }
      observer.add(() => clearTimeout(watchdog)); arm()
      const path = base + '/system/monitor/mbean/_batch'
      const candidate = createDiagnosticsStream(undefined, path).post(path, {
        interval: interval + 's', queries: queries.map(query => ({ ...query, nodeIds: [node.id] })),
      }).subscribe({
        next(value) {
          try {
            const record = mbeanRecord(unwrapDiagnosticRecord(value))
            if (record.type === 'heartbeat') return
            const query = queries.find(query => query.id === record.queryId)
            if (record.type !== 'sample' || record.nodeId !== node.id || !query) throw Object.assign(new Error('MBean collection target mismatch'), { code: 'identity' })
            if (!Number.isSafeInteger(record.sequence) || Number(record.sequence) < 1) throw new Error('Invalid MBean collection sequence')
            if (Number(record.sequence) <= (sequences.get(query.id) ?? 0)) return
            sequences.set(query.id, Number(record.sequence)); deadlines.set(query.id, Date.now() + 30000); arm()
            if (record.status === 'forbidden') throw Object.assign(new Error('MBean collection forbidden'), { status: 403 })
            if (typeof record.collectedAt !== 'number' || !Number.isSafeInteger(record.collectedAt)) throw new Error('Invalid MBean collection time')
            observer.next({ queryId: query.id, collectedAt: record.collectedAt, status: String(record.status),
              beans: Array.isArray(record.beans) ? record.beans.map(mbeanRecord) : [] })
          } catch (error) { observer.error(error) }
        }, error: error => observer.error(error), complete: () => observer.complete(),
      })
      if (disposed) candidate.unsubscribe()
      else subscription = candidate
    }).catch(error => observer.error(error))
    return () => { disposed = true; subscription?.unsubscribe() }
  }).pipe(timeout({ first: 20000, each: 30000 }))
}

export function currentMBeanValues(sample: CurrentMBeanSample, type: string, name: string, attributes: string[]): Record<string, unknown> | undefined {
  const bean = sample.beans.find(bean => bean.domain === 'org.jetlinks' && bean.beanType === type && bean.name === name)
  return sample.status === 'ready' && bean && Array.isArray(bean.unavailableAttributes) && !attributes.some(attribute => (bean.unavailableAttributes as unknown[]).includes(attribute))
    ? mbeanRecord(bean.values) : undefined
}
