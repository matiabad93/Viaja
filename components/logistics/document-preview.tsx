'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Download,ExternalLink,FileText,LockKeyhole,RefreshCw,X} from 'lucide-react';
import {canPreviewDocument,signTripDocument,type TripDocument} from '../../lib/trip-documents';

export function DocumentPreview({document,onClose}:{document:TripDocument;onClose:()=>void}){
 const [url,setUrl]=useState(''),[downloadUrl,setDownloadUrl]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const closeRef=useRef<HTMLButtonElement>(null);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let current=true;
  setLoading(true);setError('');setUrl('');setDownloadUrl('');
  Promise.all([signTripDocument(document),signTripDocument(document,true)])
   .then(([preview,download])=>{if(current){setUrl(preview);setDownloadUrl(download);setLoading(false)}})
   .catch(e=>{if(current){setError((e as Error).message);setLoading(false)}});
  return ()=>{current=false};
 },[document.id,revision]);
 useEffect(()=>{
  const previous=documentGlobalActive();
  closeRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose()}};
  window.addEventListener('keydown',onKey);
  return ()=>{window.removeEventListener('keydown',onKey);previous?.focus()};
 },[onClose]);
 if(typeof window==='undefined'||typeof window.document==='undefined')return null;
 const image=document.mime_type.startsWith('image/'),pdf=document.mime_type==='application/pdf';
 return createPortal(<div className="document-preview-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section role="dialog" aria-modal="true" aria-label={'Vista previa de '+document.filename} className="document-preview-dialog">
   <header className="document-preview-head"><div><strong>{document.filename}</strong><small><LockKeyhole size={13}/>Documento privado · enlace temporal de 2 minutos</small></div><button ref={closeRef} className="iconbtn" type="button" aria-label="Cerrar vista previa" onClick={onClose}><X size={19}/></button></header>
   <div className="document-preview-body">
    {loading?<div role="status" className="documents-loading">Preparando vista privada…</div>:error?<div role="alert" className="documents-error">{error}</div>:url&&image?
     <img src={url} alt={'Vista previa: '+document.filename} referrerPolicy="no-referrer"/>:url&&pdf?
     <iframe src={url} title={'PDF privado: '+document.filename} referrerPolicy="no-referrer"/>:
     <div className="document-preview-unavailable"><FileText size={34}/><strong>Este calendario se descarga como archivo .ics.</strong><p>Podés abrirlo con Calendario de Apple, Google Calendar u Outlook.</p></div>}
   </div>
   <footer className="document-preview-actions">
    <button type="button" className="secondary" onClick={()=>setRevision(n=>n+1)} disabled={loading}><RefreshCw size={16}/>Renovar enlace</button>
    {url&&canPreviewDocument(document.mime_type)&&<a className="secondary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir aparte</a>}
    {downloadUrl&&<a className="primary" href={downloadUrl} download={document.filename} rel="noopener noreferrer"><Download size={16}/>Descargar archivo</a>}
   </footer>
  </section>
 </div>,window.document.body);
}
function documentGlobalActive(){return typeof window!=='undefined'&&window.document.activeElement instanceof HTMLElement?window.document.activeElement:null}
