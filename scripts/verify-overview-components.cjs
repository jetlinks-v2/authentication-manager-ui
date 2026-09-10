const fs=require('fs'),path=require('path');
const {parse,compileScript,compileTemplate}=require('vue/compiler-sfc');
const root=path.resolve(__dirname, '..');
const files=[];function walk(p){for(const n of fs.readdirSync(p)){const f=path.join(p,n);if(fs.statSync(f).isDirectory())walk(f);else files.push(f)}}walk(path.join(root,'visDashboard'));walk(path.join(root,'views/project/Overview'));
let count=0,errors=[];
for(const f of files.filter(f=>f.endsWith('.vue'))){const {descriptor:d,errors:e}=parse(fs.readFileSync(f,'utf8'),{filename:f});errors.push(...e.map(String));try{const script=d.script||d.scriptSetup?compileScript(d,{id:f}):null;if(d.template){const r=compileTemplate({source:d.template.content,filename:f,id:f,compilerOptions:{bindingMetadata:script?.bindings}});errors.push(...r.errors.map(x=>`${f}: ${x}`))}count++}catch(e){errors.push(`${f}: ${e.message}`)}}
let missing=[];for(const f of files.filter(f=>/\.(vue|ts)$/.test(f))){const src=fs.readFileSync(f,'utf8');for(const m of src.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)){const b=path.resolve(path.dirname(f),m[1]);if(!['','.ts','.vue','.json','/index.ts','/index.vue'].some(s=>fs.existsSync(b+s)))missing.push(`${f}: ${m[1]}`)}}
console.log(JSON.stringify({vueFiles:count,sfcErrors:errors,missingRelativeImports:missing},null,2));process.exitCode=errors.length||missing.length?1:0;
