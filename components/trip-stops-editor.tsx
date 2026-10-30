'use client';
import {useState} from 'react';
import {Plus,Trash2,ArrowUp,ArrowDown,MapPin} from 'lucide-react';
import {DestinationSearch} from './destination-search';
import {cityLabel} from '../lib/city-suggestions';
import {canAppendDestination,swapStops} from '../lib/stop-editor';
import type {Trip} from '../lib/travel';

/** Stops must be chosen in sequence. Previously saved locations remain editable.
 * Free-text entries can still be used to save a manual single-city itinerary.
 */
export function TripStopsEditor({trip,onChange}:{trip:Trip;onChange:(t:Trip)=>void}){
 const list=trip.additionalDestinations||[];
 const [confirmedMain,setConfirmedMain]=useState(()=>trip.destination.trim());
 const [confirmedExtra,setConfirmedExtra]=useState<string[]>(()=>list.map(s=>s.trim()));
 const isMainSelected=!!trip.destination.trim()&&confirmedMain===trip.destination.trim();
 const allAdditionalSelected=list.every((item,i)=>!!item.trim()&&confirmedExtra[i]===item.trim());
 const canAdd=canAppendDestination(trip.destination,confirmedMain,list,confirmedExtra);

 const updateStops=(items:string[],selected:string[])=>{
  setConfirmedExtra(selected);
  onChange({...trip,additionalDestinations:items});
 };
 const editStop=(index:number,value:string)=>{
  const next=list.map((item,i)=>i===index?value:item);
  const selected=[...confirmedExtra];selected[index]='';
  updateStops(next,selected);
 };
 const selectStop=(index:number,value:string)=>{
  const next=list.map((item,i)=>i===index?value:item);
  const selected=[...confirmedExtra];selected[index]=value.trim();
  updateStops(next,selected);
 };
 const shiftStop=(index:number,delta:number)=>{
  const other=index+delta;
  if(other<0||other>=list.length)return;
  updateStops(swapStops(list,index,other),swapStops(confirmedExtra,index,other));
 };
 const removeStop=(index:number)=>updateStops(list.filter((_,i)=>i!==index),confirmedExtra.filter((_,i)=>i!==index));
 const hint=!isMainSelected?'Seleccioná el destino principal en las sugerencias para continuar.':
  !allAdditionalSelected?'Elegí el último destino en las sugerencias antes de agregar otro.':
  list.length>=5?'Llegaste al máximo de 6 destinos.':'Podés añadir otra ciudad o continuar con las fechas del viaje.';

 return <section className="trip-stops-editor wide" aria-label="Destinos del viaje">
  <div className="trip-stops-heading"><strong>Destinos del recorrido</strong><span>En el orden en que querés visitarlos</span></div>
  <label className="wide">Destino principal
   <div className="inputicon"><MapPin size={17}/><DestinationSearch ariaLabel="Destino principal" placeholder="Ej. París, Francia" value={trip.destination}
    onChange={value=>{setConfirmedMain('');onChange({...trip,destination:value,city:undefined})}}
    onSelect={city=>{const name=cityLabel(city);setConfirmedMain(name);onChange({...trip,destination:name,city})}}/></div>
  </label>
  {list.map((name,i)=><div className="trip-stop-row" key={i}>
   <label>Destino {i+2}
    <DestinationSearch ariaLabel={'Destino adicional '+(i+2)} placeholder="Buscá una ciudad" value={name}
     onChange={value=>editStop(i,value)}
     onSelect={city=>selectStop(i,cityLabel(city))}/>
   </label>
   <div className="trip-stop-actions" role="group" aria-label={'Ordenar o quitar destino '+(i+2)}>
    <button type="button" title="Subir destino" aria-label={'Subir destino '+(i+2)} disabled={i===0} onClick={()=>shiftStop(i,-1)}><ArrowUp size={17}/></button>
    <button type="button" title="Bajar destino" aria-label={'Bajar destino '+(i+2)} disabled={i===list.length-1} onClick={()=>shiftStop(i,1)}><ArrowDown size={17}/></button>
    <button type="button" title="Quitar destino" aria-label={'Quitar destino '+(i+2)} onClick={()=>removeStop(i)}><Trash2 size={17}/></button>
   </div>
  </div>)}
  <button type="button" className="secondary trip-add-stop" disabled={!canAdd}
   aria-describedby="trip-stop-help" onClick={()=>{if(canAdd)updateStops([...list,''],[...confirmedExtra,''])}}>
   <Plus size={17}/> Agregar otro destino
  </button>
  <p id="trip-stop-help" className="trip-step-hint" role="status">{hint}</p>
  <p className="fieldhelp">Hasta 6 destinos. La IA respeta este orden. Verificá las conexiones antes de reservar.</p>
 </section>;
}
