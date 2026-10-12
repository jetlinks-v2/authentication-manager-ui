import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope, ref } from 'vue';
import { loadLogModule as load } from './logTestLoader.mjs';

const presentation = load('views/system/Log/Access/accessLogPresentation.ts');
const { appendLogFilter } = load('views/system/Log/logFilter.ts');

test('header preview is case-insensitive, bounded, ordered and preserves all captured values', () => {
    const source = Object.freeze({
        authorization: '[redacted]', 'X-Forwarded-For': '10.0.0.2', ACCEPT: 'application/json',
        'Content-Length': '128', HOST: 'example.com', 'content-TYPE': 'application/json',
        Traceparent: '00-trace-span-01', 'X-Request-ID': '[truncated]', Cookie: '[redacted]',
    });
    const headers = presentation.getHeaders(source);
    assert.deepEqual(presentation.getCommonHeaders(headers).map(item => item.name),
        ['HOST', 'content-TYPE', 'Content-Length', 'ACCEPT', 'Traceparent']);
    assert.equal(headers.length, 9);
    assert.equal(headers.find(item => item.name === 'authorization').value, '[redacted]');
    assert.equal(headers.find(item => item.name === 'X-Request-ID').value, '[truncated]');
    assert.deepEqual(presentation.getCommonHeaders(presentation.getHeaders({ Cookie: 'x' })), []);
    for (const missing of [null, undefined, '', []]) assert.deepEqual(presentation.getHeaders(missing), []);
});

test('decodes serialized objects and arrays generically without changing raw values or scalar strings', () => {
    const source = Object.freeze({
        rows: '[1,false,null]', invalid: '{broken [truncated]', marker: '[redacted]',
        numberString: '123', booleanString: 'false', value: false, count: 0,
    });
    const parameters = { ...source, payload: JSON.stringify({ items: JSON.stringify([{ nested: true }]) }) };
    const raw = presentation.formatRawValue(parameters);
    assert.deepEqual(presentation.decodeParameters(parameters), {
        payload: { items: [{ nested: true }] }, rows: [1, false, null],
        invalid: '{broken [truncated]', marker: '[redacted]',
        numberString: '123', booleanString: 'false', value: false, count: 0,
    });
    assert.equal(presentation.formatRawValue(parameters), raw);
    assert.equal(presentation.decodeParameters('"plain"'), '"plain"');
    assert.equal(presentation.hasParameters(0), true);
    assert.equal(presentation.hasParameters(false), true);
    assert.equal(presentation.hasParameters({}), false);
    assert.equal(presentation.hasParameters(undefined), false);
    const special = presentation.decodeParameters('{"__proto__":{"safe":true}}');
    assert.equal(Object.getPrototypeOf(special), Object.prototype);
    assert.equal(Object.prototype.safe, undefined);
});

test('HTTP categories retain unfamiliar codes and never fabricate status or duration', () => {
    assert.equal(presentation.getHttpStatus(200).label, '200 OK');
    assert.equal(presentation.getHttpStatus(299).label, '299');
    assert.equal(presentation.getHttpStatus(429).color, 'warning');
    assert.equal(presentation.getHttpStatus(503).color, 'error');
    for (const value of [undefined, null, 0, 99, 600, 200.5, NaN, Infinity, '200']) {
        assert.equal(presentation.getHttpStatus(value).label, '-');
    }
    assert.equal(presentation.formatDuration({ requestTime: 1000, responseTime: 1050 }), '50 ms');
    assert.equal(presentation.formatDuration({ requestTime: 1000, responseTime: 1000 }), '0 ms');
    for (const record of [{}, { requestTime: 0, responseTime: 50 },
        { requestTime: 1000, responseTime: 900 }, { requestTime: 1000, responseTime: Infinity }]) {
        assert.equal(presentation.formatDuration(record), '-');
    }
    for (const value of [undefined, 0, -1, NaN, Infinity]) assert.equal(presentation.formatRequestTime(value), '-');
    assert.match(presentation.formatRequestTime(1791514290000), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('IP fallback distinguishes loopback and private ranges, including IPv6 and mapped addresses', () => {
    for (const ip of ['127.0.0.1', '127.8.0.1', '::1', '0:0:0:0:0:0:0:1', '::ffff:127.0.0.1']) {
        assert.equal(presentation.getSourceKind(ip), 'loopback', ip);
    }
    for (const ip of ['10.0.0.1', '172.16.0.1', '172.31.0.1', '192.168.0.1', '169.254.2.1', 'fd00::1', 'fe80::1', '::ffff:192.168.0.1']) {
        assert.equal(presentation.getSourceKind(ip), 'private', ip);
    }
    for (const ip of ['172.15.0.1', '172.32.0.1', '8.8.8.8', '2001:4860::8888', '127.999.0.1', 'fd-not-ip', '', undefined]) {
        assert.equal(presentation.getSourceKind(ip), 'unknown', String(ip));
    }
    const summary = presentation.getAccessLogSummary({ target: 'com.example.Controller', method: 'query', ipRegion: '中国|四川' });
    assert.equal(summary.handler, 'Controller#query');
    assert.equal(summary.fullHandler, 'com.example.Controller#query');
    assert.equal(summary.region, '中国|四川');
});

test('multi-address source displays the first IP and preserves the full chain for hover and details', () => {
    const raw = ' 192.168.1.10, 10.0.0.2, 2001:db8::1 ';
    const summary = presentation.getAccessLogSummary({ ip: raw });
    assert.equal(summary.primaryIp, '192.168.1.10');
    assert.equal(summary.ip, raw);
    assert.equal(summary.sourceKind, 'private');
    assert.equal(presentation.getPrimaryIp('::1, ::ffff:127.0.0.1'), '::1');
    assert.equal(presentation.getPrimaryIp(', , 127.0.0.1,'), '127.0.0.1');
    assert.equal(presentation.getPrimaryIp('8.8.8.8'), '8.8.8.8');
    for (const value of [undefined, null, '', ' , ']) assert.equal(presentation.getPrimaryIp(value), '-');
});

test('switching or reopening a record resets expansion and remounts scrollable content', () => {
    const width = ref(1114);
    const { useAccessLogDetail } = load('views/system/Log/Access/useAccessLogDetail.ts', {
        './accessLogPresentation': presentation, '@vueuse/core': { useWindowSize: () => ({ width }) },
        'vue-i18n': { useI18n: () => ({ t: key => key }) },
    });
    const scope = effectScope();
    try {
        scope.run(() => {
            const record = ref({ id: 'first', exception: '', httpHeaders: { Host: 'localhost', 'X-Custom': 'custom-value' }, parameters: { count: 0 } });
            const open = ref(true);
            const detail = useAccessLogDetail(record, open);
            assert.equal(detail.drawerWidth.value, 557);
            detail.allHeaders.value = detail.rawParameters.value = detail.expandedParameters.value = true;
            detail.sectionKeys.value = ['location'];
            assert.deepEqual(detail.headerFields.value.map(entry => entry.label), ['Host', 'X-Custom']);
            assert.equal(detail.parameterText.value, '{\n  "count": 0\n}');
            record.value = { id: 'second', exception: 'error' };
            assert.equal(detail.allHeaders.value, false);
            assert.equal(detail.rawParameters.value, false);
            assert.equal(detail.expandedParameters.value, false);
            assert.deepEqual(detail.sectionKeys.value, ['headers', 'parameters', 'exception']);
            assert.equal(detail.exception.value, 'error');
            const version = detail.contentVersion.value;
            detail.allHeaders.value = true;
            open.value = false;
            open.value = true;
            assert.equal(detail.allHeaders.value, false);
            assert.ok(detail.contentVersion.value > version);
            width.value = 500;
            assert.equal(detail.drawerWidth.value, 468);
        });
    } finally { scope.stop(); }
});

test('three-column list preserves time, trace and username filter contracts while selecting records', () => {
    const query = load('views/system/Log/useLogQuery.ts');
    let escape;
    let outsideClick;
    const { useAccessLog } = load('views/system/Log/Access/useAccessLog.ts', {
        '../useLogQuery': query,
        'vue-i18n': { useI18n: () => ({ t: key => key }) },
        '@vueuse/core': {
            onKeyStroke: (_key, callback) => { escape = callback; },
            useEventListener: (_event, callback) => { outsideClick = callback; },
        },
    });
    const scope = effectScope();
    try {
        scope.run(() => {
            const list = useAccessLog();
            assert.equal(list.columns.value.filter(column => !column.hideInTable).length, 3);
            const field = name => list.columns.value.find(column => column.dataIndex === name);
            assert.equal(field('requestTime').search.rename, 'timestamp');
            assert.equal(field('traceId').search.defaultTermType, 'eq');
            assert.deepEqual(field('username').search.handleTerms({ termType: 'like', value: '%admin%' }), {
                column: 'context', termType: 'json_value', value: { path: 'username', termType: 'like', value: '%admin%' },
            });
            assert.equal(list.params.value.terms[0].column, 'timestamp');
            assert.deepEqual(list.defaultParams.sorts, [{ name: 'timestamp', order: 'desc' }]);
            list.selectRecord({ id: 'one' });
            list.customRow({ id: 'two' }).onClick({ detail: 1, view: { getSelection: () => ({ isCollapsed: true }) } });
            assert.equal(list.selected.value.id, 'two');
            assert.equal(list.open.value, true);
            assert.match(list.rowClassName({ id: 'two' }), /selected/);
            escape();
            assert.equal(list.open.value, false);
            const selectionEvent = { detail: 1, view: { getSelection: () => ({ isCollapsed: false, toString: () => 'selected log text' }) } };
            list.customRow({ id: 'three' }).onClick(selectionEvent);
            assert.equal(list.open.value, false);
            list.handleRecordClick({ id: 'three' }, selectionEvent);
            assert.equal(list.open.value, false);
            assert.equal(list.selected.value.id, 'two');
            list.handleRecordClick({ id: 'three' }, { ...selectionEvent, detail: 0 });
            assert.equal(list.open.value, true);
            const previousElement = globalThis.Element;
            class ElementStub {
                constructor(inside) { this.inside = inside; }
                closest(selector) { assert.equal(selector, '.access-log-row, .access-log-detail'); return this.inside ? this : null; }
            }
            globalThis.Element = ElementStub;
            try {
                outsideClick({ target: new ElementStub(true) });
                assert.equal(list.open.value, true);
                outsideClick({ target: new ElementStub(false) });
                assert.equal(list.open.value, false);
            } finally {
                if (previousElement) globalThis.Element = previousElement;
                else delete globalThis.Element;
            }
        });
    } finally { scope.stop(); }
});

test('quick filters append without overwriting same-field conditions or mutating nested groups', () => {
    const group = Object.freeze({ terms: Object.freeze([{ column: 'httpMethod', termType: 'eq', value: 'GET' }]) });
    const current = Object.freeze([
        Object.freeze({ column: 'requestTime', termType: 'btw', value: [1000, 2000] }),
        Object.freeze({ column: 'url', termType: 'like', value: '%/logger/%', type: 'and' }),
        group,
    ]);
    const next = appendLogFilter(current, { column: 'url', termType: 'eq', value: '/logger/access/_query' });
    assert.deepEqual(next.slice(0, 3), current);
    assert.equal(next[1].termType, 'like');
    assert.equal(next[3].termType, 'eq');
    assert.equal(next[3].type, 'and');
    const other = appendLogFilter(next, { column: 'url', termType: 'eq', value: '/logger/system/_query' });
    assert.equal(other.length, 5);
    assert.equal(appendLogFilter(other, { column: 'url', termType: 'eq', value: '/logger/access/_query' }), other);
});

test('quick filters preserve an OR expression as a group and constrain the whole expression', () => {
    const original = [
        { column: 'responseStatus', termType: 'eq', value: 500 },
        { column: 'username', termType: 'eq', value: 'admin', type: 'or' },
    ];
    const clause = { column: 'url', termType: 'eq', value: '/query' };
    const next = appendLogFilter(original, clause);
    assert.deepEqual(next, [{ terms: original }, { ...clause, type: 'and' }]);
    assert.equal(appendLogFilter(next, clause), next);
});

test('quick filter editing terms flow through real ConditionFilter mapping and keep the selected time range', () => {
    const { buildQueryFilter } = load('../../jetlinks-web-core/src/components/ConditionFilter/utils.ts', {
        '@jetlinks-web/utils': { randomString: () => 'test-key' },
        '@jetlinks-web-core/locales': { default: { global: { t: key => key } } },
    });
    const { useAccessLog } = load('views/system/Log/Access/useAccessLog.ts', {
        'vue-i18n': { useI18n: () => ({ t: key => key }) },
        '@vueuse/core': { onKeyStroke: () => {}, useEventListener: () => {} },
    });
    const scope = effectScope();
    try {
        scope.run(() => {
            const list = useAccessLog();
            list.filterTerms.value = [{ column: 'requestTime', termType: 'btw', value: [1000, 2000] }];
            const url = '/a_%/中文?query=value';
            for (const term of [{ column: 'url', value: url }, { column: 'username', value: 'admin' }, { column: 'traceId', value: 'trace-1' }]) {
                list.searchSameValue(term);
            }
            list.searchSameValue({ column: 'url', value: url });
            list.searchSameValue({ column: 'username', value: '   ' });
            assert.equal(list.filterTerms.value.length, 4);
            assert.equal(list.open.value, false);
            const filter = buildQueryFilter(list.filterTerms.value, list.columns.value);
            assert.deepEqual(filter.terms[0], { column: 'timestamp', termType: 'btw', value: [1000, 2000] });
            assert.equal(filter.terms[1].value, url);
            assert.equal(filter.terms[1].termType, 'eq');
            assert.deepEqual(filter.terms[2], { column: 'context', termType: 'json_value', value: { path: 'username', termType: 'eq', value: 'admin' }, type: 'and' });
            assert.equal(filter.terms[3].column, 'traceId');
            list.handleSearch({ filter });
            assert.deepEqual(list.params.value, filter);
        });
    } finally { scope.stop(); }
});
