'use client';
import {useEffect,useState} from 'react';
import {Download,Eye,File,FileImage,FileText,FolderOpen,LockKeyhole,RefreshCw,Trash2} from 'lucide-react';
import type {Accommodation,TransportSegment} from '../../lib/travel';
import {deleteTripDocument,formatDocumentBytes,listTripDocuments,signTripDocument,
 type TripDocument} from '../../lib/trip-documents';
import {DocumentUploader} from './document-uploader';
import {DocumentPreview} from './document-preview';
import {ConfirmDialog} from '../confirm-dialog';

type Props={
 tripId:string;accommodations:Accommodation[];transports:TransportSegment[];
 authenticated:boolean;readOnly:boolean;cloudSaved:boolean;
 onCountChange:(count:number)=>void;onError:(message:string)=>void;
};
export function DocumentList({tripId,accommodations,transports,authenticated,readOnly,cloudSaved,onCountChange,onError}:Props){
 const [documents,setDocuments]=useState<TripDocument[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [preview,setPreview]=useState<TripDocument|null>(null),[deleting,setDeleting]=useState<TripDocument|null>(null);
 const [busy,setBusy]=useState(false);
 const enabled=authenticated&&cloudSaved;
 useEffect(()=>{
  let active=true;
  if(!enabled){setDocuments([]);onCountChange(0);setError('');return}
  setLoading(true);setError('');
  listTripDocuments(tripId).then(rows=>{
   if(active){setDocuments(rows);onCountChange(rows.length)}
  }).catch(e=>{
   if(active){setError((e as Error).message);onCountChange(0)}
  }).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[enabled,tripId,revision,onCountChange]);
 const reload=()=>setRevision(r=>r+1);
 const resolveRelated=(doc:TripDocument)=>{
  if(doc.related_type==='accommodation')return 'Alojamiento · '+(accommodations.find(a=>a.id===doc.related_id)?.name||'Reserva eliminada');
  if(doc.related_type==='transport'){
   const t=transports.find(t=>t.id===doc.related_id);
   return 'Transporte · '+(t?t.origin+' → '+t.destination:'Reserva eliminada');
  }
  return 'Documento general del viaje';
 };
 const confirmDelete=async()=>{
  if(!deleting||busy||readOnly)return;
  setBusy(true);setError('');
  try{await deleteTripDocument(deleting);setDeleting(null);reload()}
  catch(e){const message=(e as Error).message;setError(message);onError('No pudimos borrar el comprobante: '+message)}
  finally{setBusy(false)}
 };
 const download=async(doc:TripDocument)=>{
  try{
   const link=await signTripDocument(doc,true);
   // The signed URL is short lived. A visible anchor is necessary on iOS Safari
   // after the asynchronous signing request; use the same preview dialog.
   setPreview(doc);
   void link;
  }catch(e){onError('No pudimos autorizar la descarga: '+(e as Error).message)}
 };
 return <section className="logistics-block logistics-documents" aria-labelledby="documents-heading">
  <div className="section-heading compact"><div><h3 id="documents-heading">Documentos y comprobantes</h3><p className="subtle">Archivos privados vinculados a un viaje o reserva.</p></div>{enabled&&<button className="secondary" type="button" onClick={reload} disabled={loading}><RefreshCw size={16}/>Actualizar</button>}</div>
  <DocumentUploader tripId={tripId} accommodations={accommodations} transports={transports}
   enabled={enabled&&!readOnly} authenticated={authenticated} readOnly={readOnly}
   onUploaded={reload} onError={onError}/>
  {enabled&&(loading?<p className="documents-loading" role="status">Cargando comprobantes privados…</p>:
   error?<div className="documents-error" role="alert"><p>{error}</p><button type="button" className="secondary" onClick={reload}>Reintentar</button></div>:
   documents.length?<ul className="document-list">
    {documents.map(doc=>{
     const Icon=doc.mime_type==='application/pdf'?FileText:doc.mime_type.startsWith('image/')?FileImage:File;
     return <li key={doc.id} className="document-row">
      <span className="document-file-icon"><Icon size={22}/></span>
      <div className="document-file-details"><strong>{doc.filename}</strong><p>{resolveRelated(doc)}</p><small>{formatDocumentBytes(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString('es-ES')}</small></div>
      <div className="document-file-actions">
       <button className="secondary" type="button" onClick={()=>setPreview(doc)}><Eye size={16}/>Ver</button>
       <button className="secondary" type="button" onClick={()=>void download(doc)}><Download size={16}/>Descargar</button>
       {!readOnly&&<button className="iconbtn" type="button" aria-label={'Eliminar documento '+doc.filename} onClick={()=>setDeleting(doc)}><Trash2 size={17}/></button>}
      </div>
     </li>;
    })}
   </ul>:
   <div className="logistics-empty"><FolderOpen size={29}/><strong>No hay comprobantes todavía.</strong><p>Podés guardar billetes, reservas de hotel y archivos de calendario. Solo los miembros autorizados del viaje podrán acceder.</p></div>)}
  {authenticated&&!cloudSaved&&<div className="documents-auth-notice"><LockKeyhole size={18}/><p>Esperá a que el viaje se sincronice para consultar los documentos.</p></div>}
  <p className="document-security-footnote"><LockKeyhole size={14}/>Archivos privados en Supabase. Las vistas previas se autorizan durante 2 minutos y no aparecen en Explorar destinos.</p>
  {preview&&<DocumentPreview document={preview} onClose={()=>setPreview(null)}/>}
  <ConfirmDialog open={!!deleting} title="¿Eliminar este comprobante?"
   description={deleting?'Se borrará definitivamente el archivo privado “'+deleting.filename+'”. El viaje y la reserva no se modificarán.':''}
   confirmLabel="Eliminar archivo" busy={busy} onConfirm={()=>void confirmDelete()} onCancel={()=>setDeleting(null)}/>
 </section>;
}
