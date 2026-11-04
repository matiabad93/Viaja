'use client';
import {useRef,useState} from 'react';
import {FileUp,FileCheck2,LockKeyhole,UploadCloud,X} from 'lucide-react';
import type {Accommodation,TransportSegment} from '../../lib/travel';
import {formatDocumentBytes,uploadTripDocument,verifyDocumentFile,
 type DocumentLink,type VerifiedDocument} from '../../lib/trip-documents';
type Props={
 tripId:string;accommodations:Accommodation[];transports:TransportSegment[];
 enabled:boolean;authenticated:boolean;readOnly:boolean;
 onUploaded:()=>void;onError:(message:string)=>void;
};
export function DocumentUploader({tripId,accommodations,transports,enabled,authenticated,readOnly,onUploaded,onError}:Props){
 const input=useRef<HTMLInputElement>(null);
 const [file,setFile]=useState<File|null>(null),[verified,setVerified]=useState<VerifiedDocument|null>(null);
 const [link,setLink]=useState('trip'),[busy,setBusy]=useState(false),[hover,setHover]=useState(false),[error,setError]=useState('');
 const selectFile=async(candidate:File|undefined)=>{
  setError('');setVerified(null);setFile(null);
  if(!candidate)return;
  try{const checked=await verifyDocumentFile(candidate);setVerified(checked);setFile(candidate);}
  catch(e){setError((e as Error).message);if(input.current)input.current.value='';}
 };
 const clear=()=>{setFile(null);setVerified(null);setError('');if(input.current)input.current.value=''};
 const upload=async()=>{
  if(!enabled||busy||!file||!verified)return;
  setBusy(true);setError('');
  const [type,id]=link.split(':',2);
  const relation:DocumentLink=type==='trip'?{related_type:'trip',related_id:null}:
   {related_type:type as 'accommodation'|'transport',related_id:id};
  try{await uploadTripDocument(tripId,file,relation);clear();onUploaded();}
  catch(e){const detail=(e as Error).message;setError(detail);onError('No se pudo subir el archivo: '+detail);}
  finally{setBusy(false)}
 };
 if(readOnly)return null;
 if(!authenticated)return <div className="documents-auth-notice"><LockKeyhole size={21}/><div><strong>Iniciá sesión para guardar documentos en la nube.</strong><p>Los datos de alojamiento y transporte siguen pudiendo editarse sin iniciar sesión. Los comprobantes, por seguridad, solo se guardan en viajes asociados a una cuenta.</p></div></div>;
 if(!enabled)return <div className="documents-auth-notice"><LockKeyhole size={21}/><div><strong>Guardá el viaje en tu cuenta antes de adjuntar archivos.</strong><p>Esperá a que termine la sincronización y volvé a esta sección.</p></div></div>;
 return <section className="document-uploader" aria-label="Adjuntar documento privado">
  <div className={'document-dropzone'+(hover?' is-hovered':'')} onDragOver={e=>{e.preventDefault();setHover(true)}} onDragLeave={e=>{e.preventDefault();setHover(false)}} onDrop={e=>{e.preventDefault();setHover(false);if(!busy)void selectFile(e.dataTransfer.files[0])}}>
   <UploadCloud size={30} aria-hidden="true"/>
   <strong>Arrastrá un comprobante o seleccioná un archivo</strong>
   <p>PDF, JPG, PNG, WEBP o ICS · Máximo 10 MB por archivo.</p>
   <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.ics,application/pdf,image/jpeg,image/png,image/webp,text/calendar" disabled={busy} onChange={e=>void selectFile(e.currentTarget.files?.[0])} className="document-file-input" aria-label="Seleccionar comprobante" tabIndex={-1}/>
   <button type="button" className="secondary" onClick={()=>input.current?.click()} disabled={busy}><FileUp size={17}/>Elegir archivo</button>
  </div>
  {file&&verified&&<div className="document-selection" role="region" aria-label="Archivo seleccionado">
   <div className="document-selected-name"><FileCheck2 size={20}/><div><strong>{verified.filename}</strong><small>{formatDocumentBytes(file.size)} · {verified.mime}</small></div><button type="button" className="iconbtn" aria-label="Quitar archivo seleccionado" disabled={busy} onClick={clear}><X size={18}/></button></div>
   <label>Vincular comprobante
    <select value={link} disabled={busy} onChange={e=>setLink(e.target.value)}>
     <option value="trip">Al viaje en general</option>
     {accommodations.map(a=><option key={a.id} value={'accommodation:'+a.id}>Alojamiento · {a.name}</option>)}
     {transports.map(t=><option key={t.id} value={'transport:'+t.id}>Transporte · {t.origin} → {t.destination}</option>)}
    </select>
   </label>
   <p className="subtle">El archivo es privado y solo lo verán los miembros autorizados de este viaje. No se enviará a servicios de IA.</p>
   <button type="button" className="primary" disabled={busy} onClick={()=>void upload()}><UploadCloud size={17}/>{busy?'Subiendo documento…':'Guardar archivo privado'}</button>
  </div>}
  {error&&<p className="documents-error" role="alert">{error}</p>}
 </section>;
}
