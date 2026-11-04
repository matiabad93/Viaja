/** Authenticated same-origin P1.2 backend upload; no direct browser Storage INSERT. */
import {accessToken} from './supabase-client.ts';
import {requestAPI} from './api-client.ts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type UploadKind='reservation'|'trip';
const MAX_BYTES=10485760;

export async function uploadViajaPrivateFile(
 kind:UploadKind,id:string,file:File,mime:string
):Promise<void>{
 if(!UUID.test(id))throw Error('Identificador de documento inválido.');
 if(file.size<1||file.size>MAX_BYTES)throw Error('El archivo debe pesar entre 1 byte y 10 MB.');
 const token=await accessToken();
 if(!token)throw Error('Iniciá sesión para guardar documentos privados.');
 const params=new URLSearchParams({kind,id});
 const result=await requestAPI('/api/private-documents/upload?'+params,{
  method:'POST',
  headers:{'Content-Type':mime,Authorization:'Bearer '+token},
  body:file,cache:'no-store'
 });
 if(!result.ok){
  const error=await result.json().catch(()=>({})) as {error?:string};
  throw Error(error.error||'No pudimos subir el archivo. Volvé a intentarlo.');
 }
 const response=await result.json().catch(()=>({})) as {uploaded?:boolean};
 if(response.uploaded!==true)throw Error('No se confirmó el almacenamiento del documento.');
}
