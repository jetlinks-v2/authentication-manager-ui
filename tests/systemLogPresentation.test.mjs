import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope, ref } from 'vue';
import { loadLogModule as load } from './logTestLoader.mjs';

const presentation = load('views/system/Log/System/systemLogPresentation.ts');
const i18n = { useI18n: () => ({ t: key => key }) };

test('time-series timestamp wins, legacy createTime falls back, invalid dates stay empty', () => {
    const timestamp = new Date(2026, 9, 9, 10, 51, 30, 128).getTime();
    const record = Object.freeze({ timestamp, createTime: timestamp - 1000 });
    const summary = presentation.getSystemLogSummary(record);
    assert.equal(summary.time, '10:51:30.128');
    assert.equal(summary.date, '2026-10-09');
    assert.equal(summary.fullTime, '2026-10-09 10:51:30.128');
    assert.equal(presentation.getSystemLogSummary({ createTime: timestamp }).fullTime, summary.fullTime);
    for (const invalid of [undefined, 0, -1, NaN, Infinity, 1e30, '1791514290000']) {
        assert.equal(presentation.getSystemLogSummary({ timestamp: invalid }).fullTime, '-');
        assert.equal(presentation.getSystemLogSummary({ timestamp: invalid, createTime: timestamp }).time, summary.time);
    }
});

test('log levels and exception presence are independent, original multiline text stays intact', () => {
    const message = 'first line\nsecond line <script>alert(1)</script>';
    const exceptionStack = '\r\n  java.lang.IllegalStateException: failed\r\n    at com.example.Handler.run(Handler.java:42)';
    const summary = presentation.getSystemLogSummary(Object.freeze({ level: 'INFO', message, exceptionStack }));
    assert.equal(summary.message, message);
    assert.equal(summary.exception, exceptionStack);
    assert.equal(summary.exceptionSummary, 'java.lang.IllegalStateException: failed');
    assert.equal(summary.level.label, 'INFO');
    assert.equal(presentation.getSystemLogSummary({ level: 'ERROR', exceptionStack: ' \n\t' }).exception, '');
    assert.equal(presentation.getSystemLogLevel('TRACE').label, 'TRACE');
    assert.equal(presentation.getSystemLogLevel('warn').color, 'warning');
    for (const value of [undefined, '', 'CUSTOM', 'constructor', '__proto__']) {
        assert.equal(presentation.getSystemLogLevel(value).color, 'default');
    }
});

test('source code location differs from Logger; missing context and incomplete caller data stay honest', () => {
    const record = Object.freeze({
        name: 'custom.audit', className: 'org.example.Handler', methodName: 'handle', lineNumber: 128,
        context: Object.freeze({ server: 'iot-service' }),
    });
    const summary = presentation.getSystemLogSummary(record);
    assert.equal(summary.server, 'iot-service');
    assert.equal(summary.logger, 'custom.audit');
    assert.equal(summary.location, 'Handler#handle:128');
    assert.equal(summary.fullLocation, 'org.example.Handler#handle:128');
    assert.equal(presentation.formatSystemLogLocation({ className: 'a.Handler', lineNumber: -1 }), 'Handler');
    assert.equal(presentation.formatSystemLogLocation({ methodName: 'run', lineNumber: 0 }), 'run');
    assert.equal(presentation.formatSystemLogLocation({ lineNumber: 42 }), '-');
    for (const context of [undefined, null, '', [], 'legacy']) {
        assert.equal(presentation.getSystemLogSummary({ context }).server, '-');
        assert.deepEqual(presentation.getSystemLogContext(context), []);
    }
    const entries = presentation.getSystemLogContext({ deviceId: 'dev-001', server: 'iot', username: 'admin', userId: 'u1', count: 0 });
    assert.deepEqual(presentation.getCommonSystemLogContext(entries).map(entry => entry.name), ['username', 'userId', 'server']);
    assert.equal(entries.find(entry => entry.name === 'count').value, '0');
});

test('three-column list keeps bounded time and supported filters, excluding service context search', () => {
    let escape;
    let outsideClick;
    const { useSystemLog } = load('views/system/Log/System/useSystemLog.ts', {
        'vue-i18n': i18n,
        '@vueuse/core': {
            onKeyStroke: (_key, callback) => { escape = callback; },
            useEventListener: (_event, callback) => { outsideClick = callback; },
        },
    });
    const scope = effectScope();
    try {
        scope.run(() => {
            const list = useSystemLog();
            assert.deepEqual(list.columns.value.filter(column => !column.hideInTable).map(column => column.key), ['time', 'log', 'source']);
            const filters = list.columns.value.filter(column => column.search);
            assert.deepEqual(filters.map(column => column.dataIndex), ['timestamp', 'level', 'message', 'traceId', 'name', 'className', 'methodName', 'threadName', 'exceptionStack']);
            assert(!filters.some(column => /server|context/.test(column.dataIndex)));
            assert(filters.find(column => column.key === 'level').search.options.some(option => option.value === 'TRACE'));
            const time = filters.find(column => column.key === 'timestamp').search;
            assert.equal(time.rename, 'timestamp');
            assert.equal(time.defaultTermType, 'btw');
            assert.deepEqual(list.params.value.terms[0].value, time.defaultValue);
            assert.equal(filters.find(column => column.key === 'traceId').search.defaultTermType, 'eq');
            assert.deepEqual(list.defaultParams.sorts, [{ name: 'timestamp', order: 'desc' }]);
            list.selectRecord({ id: 'first' });
            list.customRow({ id: 'next' }).onClick({ detail: 1, view: { getSelection: () => ({ isCollapsed: true }) } });
            assert.equal(list.selected.value.id, 'next');
            assert.match(list.rowClassName({ id: 'next' }), /ant-table-row-selected/);
            escape();
            assert.equal(list.open.value, false);
            const drag = { detail: 1, view: { getSelection: () => ({ isCollapsed: false, toString: () => 'copied text' }) } };
            list.handleRecordClick({ id: 'ignored' }, drag);
            assert.equal(list.open.value, false);
            assert.equal(list.selected.value.id, 'next');
            list.handleRecordClick({ id: 'keyboard' }, { ...drag, detail: 0 });
            assert.equal(list.open.value, true);
            const previous = globalThis.Element;
            class ElementStub {
                constructor(inside) { this.inside = inside; }
                closest(selector) { assert.equal(selector, '.system-log-row, .system-log-detail'); return this.inside ? this : null; }
            }
            globalThis.Element = ElementStub;
            try {
                outsideClick({ target: new ElementStub(true) });
                assert.equal(list.open.value, true);
                outsideClick({ target: new ElementStub(false) });
                assert.equal(list.open.value, false);
            } finally {
                if (previous) globalThis.Element = previous;
                else delete globalThis.Element;
            }
            list.handleSearch({ filter: { terms: [{ column: 'traceId', termType: 'eq', value: 'trace' }] } });
            assert.equal(list.params.value.terms[0].column, 'traceId');
        });
    } finally { scope.stop(); }
});

test('record changes and reopen reset context, location and scroll while preserving original data', () => {
    const width = ref(1114);
    const { useSystemLogDetail } = load('views/system/Log/System/useSystemLogDetail.ts', {
        'vue-i18n': i18n, '@vueuse/core': { useWindowSize: () => ({ width }) },
    });
    const scope = effectScope();
    try {
        scope.run(() => {
            const record = ref({ id: 'first', context: { server: 'iot', deviceId: 'dev', constructor: 'custom-value' } });
            const open = ref(true);
            const detail = useSystemLogDetail(record, open);
            assert.equal(detail.drawerWidth.value, 557);
            assert.equal(detail.visibleContext.value.length, 1);
            detail.allContext.value = true;
            detail.sectionKeys.value = ['location'];
            assert.equal(detail.visibleContext.value.length, 3);
            assert.equal(detail.visibleContext.value.find(entry => entry.name === 'constructor').label, 'constructor');
            const version = detail.contentVersion.value;
            record.value = { id: 'second', context: { server: 'auth' }, exceptionStack: 'error' };
            assert.equal(detail.summary.value.exception, 'error');
            assert.equal(detail.allContext.value, false);
            assert.deepEqual(detail.sectionKeys.value, ['message', 'exception', 'context']);
            assert.ok(detail.contentVersion.value > version);
            detail.allContext.value = true;
            open.value = false;
            open.value = true;
            assert.equal(detail.allContext.value, false);
            width.value = 500;
            assert.equal(detail.drawerWidth.value, 468);
        });
    } finally { scope.stop(); }
});
