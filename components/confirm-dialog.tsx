'use client';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle,X} from 'lucide-react';

type Props={open:boolean;title:string;description:string;confirmLabel?:string;busy?:boolean;danger?:boolean;onConfirm:()=>void;onCancel:()=>void};
export function ConfirmDialog({open,title,description,confirmLabel='Eliminar',busy=false,danger=true,onConfirm,onCancel}:Props){
 const cancelRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const before=document.activeElement instanceof HTMLElement?document.activeElement:null;
  cancelRef.current?.focus();
  const keydown=(e:KeyboardEvent)=>{
   if(e.key==='Escape'&&!busy){e.preventDefault();onCancel()}
   if(e.key==='Tab'){
    const focusable=Array.from(document.querySelectorAll<HTMLButtonElement>('.viaja-confirm-dialog button:not(:disabled)'));
    if(!focusable.length)return;
    const first=focusable[0],last=focusable.at(-1)!;
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
  };
  document.addEventListener('keydown',keydown);
  return ()=>{document.removeEventListener('keydown',keydown);before?.focus()};
 },[open,busy,onCancel]);
 if(!open||typeof document==='undefined')return null;
 return createPortal(<div className="viaja-confirm-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onCancel()}}>
  <section className="viaja-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="viaja-confirm-title" aria-describedby="viaja-confirm-description">
   <button className="viaja-confirm-close" type="button" disabled={busy} onClick={onCancel} aria-label="Cerrar"><X size={18}/></button>
   <span className="viaja-confirm-icon"><AlertTriangle size={22}/></span>
   <h2 id="viaja-confirm-title">{title}</h2>
   <p id="viaja-confirm-description">{description}</p>
   <div className="viaja-confirm-actions">
    <button ref={cancelRef} type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
    <button type="button" className={danger?'viaja-danger-button':'primary'} disabled={busy} onClick={onConfirm}>{busy?'Procesando…':confirmLabel}</button>
   </div>
  </section>
 </div>,document.body);
}
