/** 已安装的 2.3.0 包缺失声明文件；按其实际 props 和导出补齐类型。 */
declare module 'vue3-json-viewer' {
    import type { DefineComponent, Plugin } from 'vue';
    type JsonViewerProps = {
        value: unknown;
        expanded?: boolean;
        expandDepth?: number;
        copyable?: boolean | { copyText?: string; copiedText?: string; timeout?: number; align?: 'left' | 'right' };
        sort?: boolean;
        boxed?: boolean;
        theme?: 'light' | 'dark';
        timeformat?: (value: Date) => string;
    };
    export const JsonViewer: DefineComponent<JsonViewerProps>;
    const plugin: Plugin;
    export default plugin;
}
