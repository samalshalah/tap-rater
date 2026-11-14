import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const repo=path.resolve(root,'../../..');
const server=await createServer({root,resolve:{alias:{'@':path.join(repo,'src'),'next/link':path.join(root,'link.tsx')}},esbuild:{jsx:'automatic'},css:{postcss:repo},server:{host:'127.0.0.1',port:4182,strictPort:true,fs:{allow:[repo]}}});
await server.listen();server.printUrls();
