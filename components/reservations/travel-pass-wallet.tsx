'use client';
import {useId,useMemo,useState} from 'react';
import {BedDouble,Check,ClipboardCopy,FileText,LockKeyhole,Plane,QrCode,WifiOff} from 'lucide-react';
import type {ReservationFile} from '../../lib/reservation-library';
import {reservationWalletSummary,sortWalletReservations} from '../../lib/reservation-wallet';
import {ReservationPdfViewer} from './reservation-pdf-viewer';
import './travel-pass-wallet.css';

type Props = {
 items: ReservationFile[];
 title?: string;
 description?: string;
 compact?: boolean;
 limit?: number;
};

const dateForPeople = (day:string) => {
 const parts=day.split('-');
 return parts.length===3?parts[2]+'/'+parts[1]+'/'+parts[0]:day;
};

export function TravelPassWallet({
 items,title='Tus billetes a mano',
 description='Abrí un billete, encontrá el localizador y mostrá su QR desde un mismo lugar.',
 compact=false,limit=4
}:Props){
 const headingId=useId();
 const [viewing,setViewing]=useState<ReservationFile|null>(null);
 const [notice,setNotice]=useState('');
 const visible=useMemo(()=>sortWalletReservations(items).slice(0,limit),[items,limit]);
 if(!visible.length)return null;
 const copyReference=async(reference:string)=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard no disponible');
   await navigator.clipboard.writeText(reference);
   setNotice('Localizador copiado. Ya podés pegarlo donde lo necesites.');
  }catch{
   setNotice('No se pudo copiar automáticamente. Mantené pulsado el localizador para seleccionarlo.');
  }
 };
 return <section className={'travel-pass-wallet'+(compact?' travel-pass-wallet-compact':'')} aria-labelledby={headingId}>
  <header className="travel-pass-wallet-head">
   <div><span className="eyebrow">LISTO PARA EL VIAJE</span><h2 id={headingId}>{title}</h2><p>{description}</p></div>
   <span className="travel-pass-wallet-count"><LockKeyhole size={14}/>{items.length} {items.length===1?'documento privado':'documentos privados'}</span>
  </header>
  <div className="travel-pass-wallet-grid">
   {visible.map(record=>{
    const summary=reservationWalletSummary(record);
    const Icon=record.kind==='flight'?Plane:record.kind==='accommodation'?BedDouble:FileText;
    return <article className="travel-pass-card" key={record.id}>
     <div className="travel-pass-card-top">
      <span className="travel-pass-card-icon"><Icon size={21}/></span>
      <span className="travel-pass-card-type">{record.kind==='flight'?'Vuelo':record.kind==='accommodation'?'Alojamiento':'Billete / comprobante'}</span>
     </div>
     <h3>{record.title||record.filename}</h3>
     <p className="travel-pass-card-route">{summary.route}</p>
     <dl className="travel-pass-facts">
      {summary.date&&<div><dt>{summary.dateLabel}</dt><dd>{dateForPeople(summary.date)}{summary.time?' · '+summary.time:''}</dd></div>}
      {summary.secondary&&<div><dt>Detalle</dt><dd>{summary.secondary}</dd></div>}
      {summary.extraFacts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      {summary.reference&&<div className="travel-pass-reference"><dt>Localizador</dt><dd><span>{summary.reference}</span>
       <button type="button" className="travel-pass-copy" aria-label={'Copiar localizador de '+record.title} onClick={()=>void copyReference(summary.reference)}><ClipboardCopy size={16}/>Copiar</button></dd></div>}
     </dl>
     <button className="primary travel-pass-open" type="button" onClick={()=>{setNotice('');setViewing(record)}}>
      <QrCode size={19}/>Abrir billete / QR
     </button>
    </article>;
   })}
  </div>
  {items.length>visible.length&&<p className="travel-pass-more">Mostramos primero las reservas más próximas. Encontrás las demás en la biblioteca.</p>}
  <p className="travel-pass-offline"><WifiOff size={17}/>¿Vas a estar sin internet? Abrí el billete y descargá el PDF en Archivos antes de salir. Los documentos privados no se guardan en el caché público de Viaja.</p>
  <p className="travel-pass-more">Antes de embarcar, confirmá la terminal, la puerta y el asiento con la aerolínea: pueden cambiar.</p>
  {notice&&<p className="travel-pass-notice" role="status"><Check size={16}/>{notice}</p>}
  {viewing&&<ReservationPdfViewer reservation={viewing} onClose={()=>setViewing(null)}/>}
 </section>;
}
