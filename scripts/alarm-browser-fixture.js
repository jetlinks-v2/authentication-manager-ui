// 仅供浏览器临时注入验收；刷新即清除，不从业务模块导入，不写入后端。
(() => {
  if (window.__overviewAlarmTest) throw new Error('Alarm fixture already installed')
  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send
  const calls = []
  const rows = Array.from({ length: 6 }, (_, index) => ({
    id: `overview-test-${index}`, alarmConfigId: 'overview-test-rule',
    alarmName: index === 0 ? '验收：温湿度传感器离线' : `验收：设备告警 ${index + 1}`,
    targetName: '验收档案室传感器', triggerDesc: '设备离线 > 5 分钟', actualDesc: '已离线 12 分钟',
    state: { value: 'warning', text: '未处理' }, alarmTime: 1788739920000 - index * 60000,
  }))
  const visualRows = rows.map((row, index) => ({ ...row, id: `overview-vision-test-${index}`,
    alarmName: index === 0 ? '验收：人员闯入禁入区域' : `验收：视觉告警 ${index + 1}`,
    actualDesc: 'AI 识别到未授权人员进入禁入区域，持续 8 秒。',
    latestHistory: { mediaChannelName: '东门摄像头', spaceName: 'E 栋 · 4F · 研发办公区',
      fileResults: [{ url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#dae4ee"/><rect x="80" y="60" width="800" height="420" rx="10" fill="#476582"/><rect x="350" y="160" width="170" height="240" fill="none" stroke="#f6cb5c" stroke-width="5"/><text x="100" y="110" fill="white" font-size="28">TEST SNAPSHOT 16:9</text></svg>') }] }
  }))
  const fixture = { calls, failNext: false, rows, visualRows, restore() {
    XMLHttpRequest.prototype.open = originalOpen
    XMLHttpRequest.prototype.send = originalSend
    delete window.__overviewAlarmTest
  } }
  window.__overviewAlarmTest = fixture
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this.__alarmTestPath = new URL(String(url), location.href).pathname
    return originalOpen.call(this, method, url, ...args)
  }
  XMLHttpRequest.prototype.send = function(body) {
    const path = this.__alarmTestPath || ''
    const query = /\/alarm\/record\/(device|aiTaskMediaTarget)\/_query$/.test(path)
    const count = /\/alarm\/record\/(device|aiTaskMediaTarget)\/_count$/.test(path)
    const handle = /\/alarm\/record\/_handle$|\/ai\/aggregate\/task\/alarm\/_handle$/.test(path)
    if (!query && !count && !handle) return originalSend.call(this, body)
    const data = JSON.parse(body || '{}')
    calls.push({ path, data })
    const sourceRows = path.includes('aiTaskMediaTarget') || path.includes('/ai/aggregate/') ? visualRows : rows
    let response
    if (fixture.failNext && handle) { fixture.failNext = false; response = { success: false, status: 403 } }
    else if (handle) {
      const row = sourceRows.find(item => item.id === data.alarmRecordId)
      if (!row) response = { success: false, status: 404 }
      else { row.state = { value: 'normal', text: '已处理' }; response = { success: true, status: 200, result: true } }
    } else {
      const id = data.terms?.find(item => item.column === 'id')?.value
      const found = sourceRows.filter(row => id ? row.id === id : row.state.value === 'warning')
      response = { success: true, status: 200, result: count ? found.length : {
        data: found.slice((data.pageIndex || 0) * (data.pageSize || 5), ((data.pageIndex || 0) + 1) * (data.pageSize || 5)), total: found.length,
      } }
    }
    setTimeout(() => {
      for (const [key, value] of Object.entries({ readyState: 4, status: 200, statusText: 'OK',
        responseText: JSON.stringify(response), response: JSON.stringify(response) })) {
        Object.defineProperty(this, key, { configurable: true, value })
      }
      this.dispatchEvent(new Event('readystatechange'))
      this.dispatchEvent(new ProgressEvent('load'))
      this.dispatchEvent(new ProgressEvent('loadend'))
    }, 60)
  }
})()
