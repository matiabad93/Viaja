/** Account-scoped PDF reservation library. No PDF bytes or private URLs enter Plan/localStorage. */
import {db,getCurrentSession,storageApiBase,storageRequest,accessToken} from './supabase-client.ts';
import {requestAPI} from './api-client.ts';
import {uploadViajaPrivateFile} from './private-upload-client.ts';
import {MAX_TRIP_DOCUMENT_BYTES} from './trip-documents.ts';

export const RESERVATION_PDF_BUCKET='reservation-pdfs';
export const RESERVATION_MAX_PDF_BYTES=MAX_TRIP_DOCUMENT_BYTES;
export const RESERVATION_URL_TTL_SECONDS=120;
export type ReservationKind='unclassified'|'flight'|'accommodation'|'mixed'|'other';
export type ExtractedFlight={
 company:string;serviceNumber:string;origin:string;destination:string;
 departureAt:string;arrivalAt:string;departureTimezone:string;arrivalTimezone:string;
};
export type ExtractedLodging={
 name:string;address:string;city:string;checkIn:string;checkOut:string;provider:string;
};
export type ReservationDetails={
 provider:string;bookingReference:string;flights:ExtractedFlight[];
 lodging:ExtractedLodging|null;warnings:string[];
};
export const emptyReservationDetails=():ReservationDetails=>({
 provider:'',bookingReference:'',flights:[],lodging:null,warnings:[]
});
export type ReservationFile={
 id:string;owner_id:string;filename:string;storage_path:string;size_bytes:number;
 mime_type:'application/pdf';kind:ReservationKind;title:string;
 details:ReservationDetails;linked_trip_id:string|null;reviewed_at:string|null;
 created_at:string;updated_at:string;
};
export type ReservationChanges={kind:ReservationKind;title:string;details:ReservationDetails;linked_trip_id:string|null;reviewed_at:string|null};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const strip=(input:unknown,max=120)=>typeof input==='string'?input.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
export function sanitizeReservationDetails(value:unknown):ReservationDetails{
 const data=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const flights=Array.isArray(data.flights)?data.flights.slice(0,8).map(row=>{
  const d=row&&typeof row==='object'&&!Array.isArray(row)?row as Record<string,unknown>:{};
  return {
   company:strip(d.company),serviceNumber:strip(d.serviceNumber,70),origin:strip(d.origin,180),destination:strip(d.destination,180),
   departureAt:strip(d.departureAt,36),arrivalAt:strip(d.arrivalAt,36),
   departureTimezone:strip(d.departureTimezone,80),arrivalTimezone:strip(d.arrivalTimezone,80)
  };
 }):[];
 const l=data.lodging&&typeof data.lodging==='object'&&!Array.isArray(data.lodging)?data.lodging as Record<string,unknown>:null;
 const lodging=l?{name:strip(l.name,160),address:strip(l.address,240),city:strip(l.city,100),
  checkIn:strip(l.checkIn,20),checkOut:strip(l.checkOut,20),provider:strip(l.provider,120)}:null;
 return {provider:strip(data.provider,120),bookingReference:strip(data.bookingReference,110),
  flights,lodging,warnings:Array.isArray(data.warnings)?data.warnings.slice(0,6).map(x=>strip(x,190)).filter(Boolean):[]};
}
export function validPdfName(name:string){
 const n=name.replace(/[\/\\\u0000-\u001f\u007f]/g,'_').trim().slice(0,180);
 if(!n||!n.toLowerCase().endsWith('.pdf'))throw Error('Solo se permiten archivos PDF (.pdf).');
 return n;
}
export async function validateReservationPdf(file:File):Promise<string>{
 const name=validPdfName(file.name);
 if(file.size===0)throw Error('El PDF está vacío.');
 if(file.size>RESERVATION_MAX_PDF_BYTES)throw Error('El PDF supera el máximo permitido de 10 MB.');
 const header=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
 if(header!=='%PDF-')throw Error('El archivo no es un PDF válido. Elegí otro comprobante.');
 return name;
}
export const reservationObjectPath=(owner:string,id:string)=>{
 if(!uuid.test(owner)||!uuid.test(id))throw Error('Identificador de reserva inválido.');
 return owner.toLowerCase()+'/'+id.toLowerCase()+'/source.pdf';
};
export async function listReservations():Promise<ReservationFile[]>{
 const rows=await db<ReservationFile[]>('reservation_files?select=id,owner_id,filename,storage_path,size_bytes,mime_type,kind,title,details,linked_trip_id,reviewed_at,created_at,updated_at&order=created_at.desc&limit=300');
 return Array.isArray(rows)?rows.map(r=>({...r,details:sanitizeReservationDetails(r.details)})):[];
}
export async function uploadReservationPdf(file:File):Promise<ReservationFile>{
 const name=await validateReservationPdf(file);
 const session=getCurrentSession();
 if(!session?.user.id)throw Error('Iniciá sesión para guardar PDFs privados.');
 const id=crypto.randomUUID(),storage_path=reservationObjectPath(session.user.id,id);
 const draft={id,owner_id:session.user.id,filename:name,storage_path,size_bytes:file.size,
  mime_type:'application/pdf',kind:'unclassified',title:name.replace(/\.pdf$/i,''),
  details:emptyReservationDetails(),linked_trip_id:null};
 const created=await db<ReservationFile[]>('reservation_files?select=id,owner_id,filename,storage_path,size_bytes,mime_type,kind,title,details,linked_trip_id,reviewed_at,created_at,updated_at',
  {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(draft)});
 const record=created?.[0];
 if(!record?.id)throw Error('No se pudo registrar el archivo.');
 try{
  await uploadViajaPrivateFile('reservation',record.id,file,'application/pdf');
 }catch(e){
  try{await db('reservation_files?id=eq.'+encodeURIComponent(id),{method:'DELETE'})}catch{}
  throw e;
 }
 return {...record,details:sanitizeReservationDetails(record.details)};
}
export async function updateReservation(id:string,changes:ReservationChanges):Promise<ReservationFile>{
 if(!uuid.test(id))throw Error('Identificador de reserva inválido.');
 const body:ReservationChanges={
  kind:changes.kind,title:strip(changes.title,180)||'Reserva sin título',
  details:sanitizeReservationDetails(changes.details),
  linked_trip_id:changes.linked_trip_id||null,
  reviewed_at:changes.reviewed_at
 };
 const res=await db<ReservationFile[]>('reservation_files?id=eq.'+encodeURIComponent(id)+'&select=id,owner_id,filename,storage_path,size_bytes,mime_type,kind,title,details,linked_trip_id,reviewed_at,created_at,updated_at',
  {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
 if(!res?.[0])throw Error('No se pudo actualizar la reserva. Verificá el acceso al viaje.');
 return {...res[0],details:sanitizeReservationDetails(res[0].details)};
}
export async function signReservationPdf(record:ReservationFile,download=false):Promise<string>{
 const response=await storageRequest<{signedURL?:string;signedUrl?:string}>(
  'object/sign/'+RESERVATION_PDF_BUCKET+'/'+record.storage_path,
  {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:RESERVATION_URL_TTL_SECONDS})}
 );
 const raw=response.signedURL||response.signedUrl;
 if(!raw?.startsWith('/object/sign/'))throw Error('No se pudo autorizar el PDF.');
 const result=new URL(storageApiBase+raw);
 if(download)result.searchParams.set('download',record.filename);
 return result.toString();
}
export async function deleteReservationPdf(record:ReservationFile):Promise<void>{
 if(!uuid.test(record.id))throw Error('Reserva inválida.');
 await storageRequest('object/'+RESERVATION_PDF_BUCKET,{
  method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[record.storage_path]})
 });
 const rows=await db<Array<{id:string}>>(
  'reservation_files?id=eq.'+encodeURIComponent(record.id)+'&select=id',
  {method:'DELETE',headers:{Prefer:'return=representation'}}
 );
 if(rows?.length!==1)throw Error('PDF eliminado, pero falló el registro. Actualizá la lista para reconciliar el estado.');
}
export async function extractReservationPdf(record:ReservationFile):Promise<{kind:ReservationKind;details:ReservationDetails;title:string}>{
 const token=await accessToken();
 if(!token)throw Error('Iniciá sesión antes de analizar un documento.');
 const response=await requestAPI('/api/reservations/extract',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
  body:JSON.stringify({reservationId:record.id,consent:true})
 });
 const data=await response.json().catch(()=>({})) as {error?:string;kind?:ReservationKind;details?:ReservationDetails;title?:string};
 if(!response.ok)throw Error(data.error||'No pudimos extraer los datos del PDF.');
 return {kind:['flight','accommodation','mixed','other'].includes(data.kind||'')?data.kind!:'unclassified',
  details:sanitizeReservationDetails(data.details),title:strip(data.title,180)||record.title};
}
