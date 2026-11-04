'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Download,ExternalLink,FileText,LockKeyhole,RefreshCw,X} from 'lucide-react';
import {signReservationPdf,type ReservationFile} from '../../lib/reservation-library';

export function ReservationPdfViewer({reservation,onClose}:{reservation:ReservationFile;onClose:()=>void}){
 const [preview,setPreview]=useState(''),[download,setDownload]=useState('');
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[rev,setRev]=useState(0);
 const closeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  let live=true;setPreview('');setDownload('');setError('');setLoading(true);
  Promise.all([signReservationPdf(reservation),signReservationPdf(reservation,true)])
  .then(([p,d])=>{if(live){setPreview(p);setDownload(d)}})
  .catch(e=>{if(live)setError((e as Error).message)})
  .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[reservation.id,rev]);
 useEffect(()=>{
  const current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  closeButton.current?.focus();
  const closeOnEsc=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose()}};
  window.addEventListener('keydown',closeOnEsc);
  return()=>{window.removeEventListener('keydown',closeOnEsc);current?.focus()};
 },[onClose]);
 if(typeof document==='undefined')return null;
 return createPortal(<div className="reservation-viewer-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <section className="reservation-viewer" role="dialog" aria-modal="true" aria-label={'Billete PDF '+reservation.filename}>
   <header><div><strong>{reservation.filename}</strong><small><LockKeyhole size={13}/>Original privado · acceso temporal de 2 minutos</small></div>
    <button ref={closeButton} type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar PDF"><X size={20}/></button></header>
   <div className="reservation-viewer-body">
    {loading?<p role="status">Preparando el PDF privado…</p>:error?<p role="alert">{error}</p>:preview?
     <iframe title={'PDF original de '+reservation.filename} src={preview} referrerPolicy="no-referrer"/>:
     <p>No se pudo obtener el PDF.</p>}
   </div>
   <footer>
    <p><FileText size={16}/>Si el billete contiene un código QR, podés verlo en el PDF original.</p>
    <div className="reservation-viewer-actions"><button type="button" className="secondary" onClick={()=>setRev(r=>r+1)} disabled={loading}><RefreshCw size={16}/>Renovar</button>
     {preview&&<a href={preview} className="secondary" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir aparte</a>}
     {download&&<a href={download} className="primary" download={reservation.filename} rel="noopener noreferrer"><Download size={16}/>Descargar</a>}</div>
   </footer>
  </section>
 </div>,document.body);
}
