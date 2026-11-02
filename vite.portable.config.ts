import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {onRequest} from './functions/api/[[path]]';

const tupaRuntime = () => ({
 TUPA_AI_ENABLED:process.env.TUPA_AI_ENABLED,
 TUPA_AI_PROVIDER:process.env.TUPA_AI_PROVIDER,
 TUPA_GEMINI_API_KEY:process.env.TUPA_GEMINI_API_KEY,
 TUPA_GEMINI_KEY_ROTATED:process.env.TUPA_GEMINI_KEY_ROTATED,
 TUPA_OPENAI_API_KEY:process.env.TUPA_OPENAI_API_KEY,
 TUPA_OPENAI_MODEL:process.env.TUPA_OPENAI_MODEL,
 TUPA_SUPABASE_URL:process.env.TUPA_SUPABASE_URL,
 TUPA_SUPABASE_PUBLISHABLE_KEY:process.env.TUPA_SUPABASE_PUBLISHABLE_KEY,
 TUPA_SUPABASE_SECRET_KEY:process.env.TUPA_SUPABASE_SECRET_KEY
});

export default defineConfig({
 // The ONLY credentials copied into the browser bundle are publishable data
 // belonging to a separate Tupã Supabase project. Never build with Viaja keys.
 define:{
  __VIAJA_NATIVE__:JSON.stringify(process.env.VIAJA_NATIVE==='true'),
  __VIAJA_API_BASE__:JSON.stringify(process.env.VIAJA_API_BASE||''),
  __VIAJA_SUPABASE_URL__:JSON.stringify(process.env.TUPA_SUPABASE_URL||''),
  __VIAJA_SUPABASE_PUBLIC_KEY__:JSON.stringify(process.env.TUPA_SUPABASE_PUBLISHABLE_KEY||'')
 },
 root:'portable',
 publicDir:'../public',
 plugins:[react(),{
  name:'tupa-local-api',
  configureServer(server){
   server.middlewares.use(async(req,res,next)=>{
    if(!req.url?.startsWith('/api/'))return next();
    try{
     const method=req.method||'GET';
     const headers=new Headers();
     for(const [key,value] of Object.entries(req.headers)){
      if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
     }
     const chunks:Uint8Array[]=[];
     if(method!=='GET'&&method!=='HEAD')for await(const chunk of req)chunks.push(chunk);
     const body=chunks.length?Buffer.concat(chunks).toString('utf8'):undefined;
     const request=new Request(new URL(req.url,'http://'+(req.headers.host||'localhost:5173')),{method,headers,body});
     const response=await onRequest({request,env:tupaRuntime()} as any);
     res.statusCode=response.status;
     response.headers.forEach((value,key)=>res.setHeader(key,value));
     res.end(await response.text());
    }catch{
     res.statusCode=503;
     res.setHeader('Content-Type','application/json');
     res.end(JSON.stringify({error:'El servicio de Tupã Travel no está disponible.'}));
    }
   });
  }
 }],
 resolve:{alias:{'@':path.resolve('.')}},
 build:{outDir:'../web-dist',emptyOutDir:true},
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']}
});
