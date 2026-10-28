import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {onRequest} from './functions/api/[[path]]';
export default defineConfig({
 define:{__VIAJA_NATIVE__:JSON.stringify(process.env.VIAJA_NATIVE==='true'),__VIAJA_API_BASE__:JSON.stringify(process.env.VIAJA_API_BASE||'')},
 root:'portable',publicDir:'../public',
 plugins:[react(),{name:'viaja-demo-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  if(!req.url?.startsWith('/api/'))return next();
  try{const response=await onRequest({request:new Request('https://local.invalid'+req.url,{method:req.method||'GET'})} as any);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await response.text())}catch{res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'No se pudo contactar con el proveedor.'}))}
 })}}],
 resolve:{alias:{'@':path.resolve('.')}},build:{outDir:'../web-dist',emptyOutDir:true},server:{host:'0.0.0.0',allowedHosts:['terminal.local']}
});
