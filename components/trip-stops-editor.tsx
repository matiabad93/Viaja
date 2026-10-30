'use client';
import {Plus,Trash2,ArrowUp,ArrowDown,MapPin} from 'lucide-react';
import {DestinationSearch} from './destination-search';
import type {Trip} from '../lib/travel';

export function TripStopsEditor({trip,onChange}:{trip:Trip;onChange:(t:Trip)=>void}){
 const list=trip.additionalDestinations||[];
 const change=(items:string[])=>onChange({...trip,additionalDestinations:items});
 return <section className="trip-stops-editor wide" aria-label="Destinos del viaje">
  <div className="trip-stops-heading"><strong>Destinos del recorrido</strong><span>En el orden en que querés visitarlos</span></div>
  <label className="wide">Destino principal
   <div className="inputicon"><MapPin size={17}/><DestinationSearch value={trip.destination} onChange={v=>onChange({...trip,destination:v,city:undefined})} onSelect={c=>onChange({...trip,destination:c.name+', '+c.country,city:c})}/></div>
  </label>
  {list.map((name,i)=><div className="trip-stop-row" key={i}>
   <label>Destino {i+2}<input value={name} required maxLength={120} onChange={e=>change(list.map((x,j)=>i===j?e.target.value:x))} placeholder="Ej. Toledo, España" aria-label={'Destino adicional '+(i+2)}/></label>
   <div className="trip-stop-actions">
    <button type="button" title="Subir destino" aria-label={'Subir destino '+(i+2)} disabled={i===0} onClick={()=>{const next=[...list];[next[i-1],next[i]]=[next[i],next[i-1]];change(next)}}><ArrowUp size={17}/></button>
    <button type="button" title="Bajar destino" aria-label={'Bajar destino '+(i+2)} disabled={i===list.length-1} onClick={()=>{const next=[...list];[next[i+1],next[i]]=[next[i],next[i+1]];change(next)}}><ArrowDown size={17}/></button>
    <button type="button" title="Quitar destino" aria-label={'Quitar destino '+(i+2)} onClick={()=>change(list.filter((_,j)=>i!==j))}><Trash2 size={17}/></button>
   </div>
  </div>)}
  <button type="button" className="secondary trip-add-stop" disabled={list.length>=5} onClick={()=>change([...list,''])}><Plus size={17}/> Agregar otro destino</button>
  <p className="fieldhelp">Hasta 6 destinos. La IA organizará días y conexiones según este orden. Los traslados interurbanos necesitan comprobación antes de reservar.</p>
 </section>
}
