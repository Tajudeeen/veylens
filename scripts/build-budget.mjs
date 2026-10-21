import {build} from 'esbuild';
await build({entryPoints:['src/server/budgetWorker.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/budget/worker.js',minify:true});
