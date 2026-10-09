import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { transformSync } from 'esbuild';

const root = resolve(import.meta.dirname, '..');

/** Load real local TS dependencies while injecting only browser or i18n boundaries. */
export const loadLogModule = (path, dependencies = {}) => {
    const filename = resolve(root, path);
    const require = createRequire(filename);
    const { code } = transformSync(readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs' });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        const localFile = resolve(dirname(filename), `${name}.ts`);
        if (name.startsWith('.') && existsSync(localFile)) return loadLogModule(relative(root, localFile), dependencies);
        return require(name);
    }, module, module.exports);
    return module.exports;
};
