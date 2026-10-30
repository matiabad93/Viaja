'use client';
import {requestAPI} from '../lib/api-client';
import {curatedCovers} from '../lib/destination-covers';
import {useEffect,useState,useRef} from 'react';
import type {Plan,DestinationPhoto} from '../lib/travel';

export function DestinationGallery({plan,onChange}:{plan:Plan;onChange:(p:Plan)=>boolean}){
 const latest=useRef(plan);latest.current=plan;
 const change=useRef(onChange);change.current=onChange;
 const city=plan.trip.city?.name||plan.trip.destination.replace(/ · copia$/,'').split(',')[0].replace(/ esencial| entre miradores| y Alsacia/i,'');
 const key=city+'|'+plan.trip.start;
 const [photos,setPhotos]=useState<DestinationPhoto[]>([]);
 const [state,setState]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  const curated=curatedCovers(city);
  if(curated.length){
   setPhotos(curated);
   setState('');
   // Replace old saved responses so unrelated images (e.g. Lisbon protests)
   // are not resurrected by account sync or a return to the detail screen.
   const stored=latest.current.photos||[];
   if(stored.map(p=>p.source).join('|')!==curated.map(p=>p.source).join('|')){
    change.current({...latest.current,photos:curated,photoKey:key});
   }
   return;
  }
  if(!retry&&latest.current.photoKey===key&&latest.current.photos?.length){
   setPhotos(latest.current.photos);
   return;
  }
  const controller=new AbortController();
  setPhotos([]);setState('Buscando fotografías del destino…');
  requestAPI('/api/photos?'+new URLSearchParams({
   q:city,country:plan.trip.city?.country||'',date:plan.trip.start,
   lat:String(plan.trip.city?.latitude||0)
  }),{signal:controller.signal})
   .then(async r=>{
    const j=await r.json() as {photos:DestinationPhoto[];error?:string};
    if(!r.ok)throw Error(j.error||'No hay fotos disponibles');
    return j;
   })
   .then(j=>{
    if(controller.signal.aborted)return;
    setPhotos(j.photos);
    setState(j.photos.length<3?'Hay pocas fotografías verificadas para este destino.':'');
    change.current({...latest.current,photos:j.photos,photoKey:key});
   })
   .catch(e=>{if(!controller.signal.aborted)setState(e.message||'No se pudieron cargar las fotos.')});
  return()=>controller.abort();
 },[key,retry]);
 return <section className="destination-gallery surface">
  <div className="section-heading compact"><div><span className="eyebrow">CONOCÉ TU DESTINO</span><h3>{city} en imágenes</h3></div><button className="textbtn" onClick={()=>setRetry(n=>n+1)}>Actualizar fotos</button></div>
  <p className="subtle">Imágenes de archivo de los lugares más representativos; las condiciones de tu viaje pueden ser distintas.</p>
  {state&&<p role="status">{state}</p>}
  <div className="photo-grid">{photos.map(p=><figure key={p.source}><a href={p.source} target="_blank" rel="noopener noreferrer" aria-label={'Ver origen de '+p.title}><img src={p.url} alt={p.title.replace(/^File:/,'')} loading="lazy"/></a></figure>)}</div>
  {photos.length>0&&<details className="photo-credits"><summary>Autoría, licencias y archivos originales de estas fotos</summary><ul>{photos.map(p=><li key={p.source}>{p.author||'Autor no indicado'} · {p.license} · <a href={p.source} target="_blank" rel="noopener noreferrer">{p.title.replace(/^File:/,'')}</a></li>)}</ul><p>Las imágenes se recortan visualmente para ajustarse a las tarjetas.</p></details>}
 </section>
}
