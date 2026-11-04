/**
 * Viaja private document API. A document lives outside Plan/publicTripSnapshot:
 * private storage bytes + RLS-protected relational metadata, never localStorage.
 */
import {db,getCurrentSession,storageApiBase,storageRequest} from './supabase-client.ts';
import {uploadViajaPrivateFile} from './private-upload-client.ts';

export const TRIP_DOCUMENT_BUCKET='trip-documents';
export const MAX_TRIP_DOCUMENT_BYTES=10*1024*1024;
export const SIGNED_URL_TTL_SECONDS=120;
export type DocumentMime='application/pdf'|'image/jpeg'|'image/png'|'image/webp'|'text/calendar';
export type RelatedDocumentKind='trip'|'accommodation'|'transport';
export type DocumentLink={related_type:RelatedDocumentKind;related_id:string|null};
export type TripDocument={
 id:string;trip_id:string;uploaded_by:string;storage_path:string;
 filename:string;mime_type:DocumentMime;size_bytes:number;
 related_type:RelatedDocumentKind;related_id:string|null;created_at:string;
};
export type VerifiedDocument={mime:DocumentMime;extension:'pdf'|'jpg'|'png'|'webp'|'ics';filename:string};

const mimeByExt:Record<string,DocumentMime>={
 pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',
 png:'image/png',webp:'image/webp',ics:'text/calendar'
};
const canonicalExt:Record<DocumentMime,VerifiedDocument['extension']>={
 'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png',
 'image/webp':'webp','text/calendar':'ics'
};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bytesAre=(arr:Uint8Array,values:number[],start=0)=>values.every((v,i)=>arr[start+i]===v);
const ascii=(arr:Uint8Array,start:number,end:number)=>new TextDecoder().decode(arr.slice(start,end));
export const formatDocumentBytes=(bytes:number)=>bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(bytes/1024))+' KB';
export const canPreviewDocument=(mime:DocumentMime)=>mime==='application/pdf'||mime.startsWith('image/');
export function verifyDocumentName(name:string):string{
 const clean=name.replace(/[\/\\\u0000-\u001f\u007f]/g,'_').trim().slice(0,180);
 if(!clean)throw Error('El archivo debe tener un nombre.');
 return clean;
}
export async function verifyDocumentFile(file:File):Promise<VerifiedDocument>{
 if(file.size===0)throw Error('El archivo está vacío.');
 if(file.size>MAX_TRIP_DOCUMENT_BYTES)throw Error('Cada archivo debe pesar como máximo 10 MB.');
 const filename=verifyDocumentName(file.name);
 const ext=filename.split('.').at(-1)?.toLowerCase()||'';
 const mime=mimeByExt[ext];
 if(!mime)throw Error('Formatos permitidos: PDF, JPG, PNG, WEBP e ICS.');
 // Validate the actual signature, not the browser-supplied Content-Type header.
 const header=new Uint8Array(await file.slice(0,512).arrayBuffer());
 const valid=mime==='application/pdf'
   ?ascii(header,0,5)==='%PDF-'
   :mime==='image/jpeg'
   ?bytesAre(header,[0xff,0xd8,0xff])
   :mime==='image/png'
   ?bytesAre(header,[137,80,78,71,13,10,26,10])
   :mime==='image/webp'
   ?ascii(header,0,4)==='RIFF'&&ascii(header,8,12)==='WEBP'
   :ascii(header,0,512).replace(/^\uFEFF/,'').trimStart().startsWith('BEGIN:VCALENDAR');
 if(!valid)throw Error('El contenido no coincide con el formato '+ext.toUpperCase()+'. No se cargó el archivo.');
 return {mime,extension:canonicalExt[mime],filename};
}
export function documentPath(tripId:string,documentId:string,mime:DocumentMime):string{
 if(!uuidPattern.test(tripId)||!uuidPattern.test(documentId))throw Error('La referencia del documento es inválida.');
 return [tripId.toLowerCase(),documentId.toLowerCase(),'document.'+canonicalExt[mime]].join('/');
}
function ensureLinked(kind:RelatedDocumentKind,id:string|null){
 if(kind==='trip'&&id!==null)throw Error('Un archivo del viaje no debe tener reserva asociada.');
 if(kind!=='trip'&&(!id||id.length>100))throw Error('Elegí una reserva válida.');
}
export async function listTripDocuments(tripId:string):Promise<TripDocument[]>{
 if(!uuidPattern.test(tripId))throw Error('Viaje inválido.');
 const rows=await db<TripDocument[]>('trip_documents?select=id,trip_id,uploaded_by,storage_path,filename,mime_type,size_bytes,related_type,related_id,created_at&trip_id=eq.'+encodeURIComponent(tripId)+'&order=created_at.desc&limit=500');
 if(!Array.isArray(rows))throw Error('No pudimos cargar los documentos.');
 return rows;
}
export async function uploadTripDocument(tripId:string,file:File,link:DocumentLink):Promise<TripDocument>{
 const session=getCurrentSession();
 if(!session?.user.id)throw Error('Iniciá sesión antes de subir documentos.');
 if(!uuidPattern.test(tripId))throw Error('Elegí un viaje guardado en tu cuenta.');
 ensureLinked(link.related_type,link.related_id);
 const verified=await verifyDocumentFile(file);
 const id=crypto.randomUUID(),path=documentPath(tripId,id,verified.mime);
 const pending={
  id,trip_id:tripId,uploaded_by:session.user.id,storage_path:path,
  filename:verified.filename,mime_type:verified.mime,size_bytes:file.size,
  related_type:link.related_type,related_id:link.related_id
 };
 // Register first: Storage INSERT RLS accepts files only when a matching,
 // authenticated, authorized registry entry already exists.
 const created=await db<TripDocument[]>('trip_documents?select=id,trip_id,uploaded_by,storage_path,filename,mime_type,size_bytes,related_type,related_id,created_at',
  {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(pending)});
 const record=created?.[0];
 if(!record?.id)throw Error('No se pudo registrar el documento privado.');
 try{
  await uploadViajaPrivateFile('trip',record.id,file,verified.mime);
 }catch(error){
  // Do not leave dangling registry entries on failed uploads.
  try{await db('trip_documents?id=eq.'+encodeURIComponent(id),{method:'DELETE'})}catch{}
  throw error;
 }
 return record;
}
/** Signing requires a fresh JWT and Storage SELECT RLS (viewer / editor / owner). */
export async function signTripDocument(document:TripDocument,download=false):Promise<string>{
 const raw=await storageRequest<{signedURL?:string;signedUrl?:string}>(
  'object/sign/'+TRIP_DOCUMENT_BUCKET+'/'+document.storage_path,
  {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:SIGNED_URL_TTL_SECONDS})}
 );
 const urlPart=raw.signedURL||raw.signedUrl;
 if(!urlPart||!urlPart.startsWith('/object/sign/'))throw Error('No se pudo crear el enlace privado.');
 const signed=new URL(storageApiBase+urlPart);
 if(download)signed.searchParams.set('download',document.filename);
 return signed.toString();
}
export async function deleteTripDocument(document:TripDocument):Promise<void>{
 if(!uuidPattern.test(document.id)||!uuidPattern.test(document.trip_id))throw Error('Documento inválido.');
 // Delete object first, because Storage RLS requires the registry entry.
 await storageRequest('object/'+TRIP_DOCUMENT_BUCKET,{
  method:'DELETE',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({prefixes:[document.storage_path]})
 });
 const deleted=await db<{id:string}[]>(
  'trip_documents?id=eq.'+encodeURIComponent(document.id)+'&trip_id=eq.'+encodeURIComponent(document.trip_id)+'&select=id',
  {method:'DELETE',headers:{Prefer:'return=representation'}}
 );
 if(!Array.isArray(deleted)||deleted.length!==1)throw Error('El archivo se borró, pero no pudimos actualizar la lista. Reintentá la operación.');
}
/** Remove private bytes before the owner deletes a trip (and its FK metadata). */
export async function deleteAllTripDocuments(tripId:string):Promise<void>{
 for(let batch=0;batch<100;batch++){
  const documents=await listTripDocuments(tripId);
  if(!documents.length)return;
  for(const doc of documents)await deleteTripDocument(doc);
 }
 throw Error('Quedan documentos pendientes; no se eliminó el viaje.');
}
