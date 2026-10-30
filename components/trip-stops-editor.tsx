'use client';
import {useState} from 'react';
import {Plus,Trash2,ArrowUp,ArrowDown,MapPin} from 'lucide-react';
import {DestinationSearch} from './destination-search';
import {cityLabel} from '../lib/city-suggestions';
import {canAppendDestination,swapStops,swapTripStops} from '../lib/stop-editor';
import type {Trip} from '../lib/travel';

/** Each stop, including the first, is one ordered item.
 * The first item remains the canonical trip.destination for existing consumers.
 */
export function TripStopsEditor({trip,onChange}:{trip:Trip;onChange:(t:Trip)=>void}){
 const list=trip.additionalDestinations||[];
 const stops=[trip.destination,...list];
 const [confirmedMain,setConfirmedMain]=useState(()=>trip.destination.trim());
 const [confirmedExtra,setConfirmedExtra]=useState<string[]>(()=>list.map(s=>s.trim()));
 const selections=[confirmedMain,...confirmedExtra];
 const isMainSelected=!!trip.destination.trim()&&confirmedMain===trip.destination.trim();
 const allAdditionalSelected=list.every((item,i)=>!!item.trim()&&confirmedExtra[i]===item.trim());
 const allSelected=isMainSelected&&allAdditionalSelected;
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
 const moveStop=(index:number,delta:number)=>{
  const other=index+delta;
  if(!allSelected||other<0||other>=stops.length)return;
  const confirmed=swapStops(selections,index,other);
  setConfirmedMain(confirmed[0]);
  setConfirmedExtra(confirmed.slice(1));
  onChange(swapTripStops(trip,index,other));
 };
 const removeStop=(index:number)=>{
  if(index===0)return;
  updateStops(list.filter((_,i)=>i!==index-1),confirmedExtra.filter((_,i)=>i!==index-1));
 };
 const hint=!isMainSelected?'Seleccioná el destino principal en las sugerencias para continuar.':
  !allAdditionalSelected?'Elegí el último destino en las sugerencias antes de agregar otro.':
  list.length>=5?'Llegaste al máximo de 6 destinos.':'Podés añadir otra ciudad o continuar con las fechas del viaje.';

 return <section className="trip-stops-editor wide" aria-label="Destinos del viaje">
  <div className="trip-stops-heading"><strong>Destinos del recorrido</strong><span>En el orden en que querés visitarlos</span></div>
  {stops.map((name,i)=><div className={'trip-stop-row'+(i===0?' trip-stop-primary':'')} key={i===0?'primary':'stop-'+i}>
   <label>{i===0?'Destino principal':'Destino '+(i+1)}
    <div className="inputicon"><MapPin size={17}/>
     <DestinationSearch
      ariaLabel={i===0?'Destino principal':'Destino adicional '+(i+1)}
      placeholder={i===0?'Ej. París, Francia':'Buscá una ciudad'}
      value={name}
      onChange={value=>{
       if(i===0){setConfirmedMain('');onChange({...trip,destination:value,city:undefined});}
       else editStop(i-1,value);
      }}
      onSelect={city=>{
       const value=cityLabel(city);
       if(i===0){setConfirmedMain(value);onChange({...trip,destination:value,city});}
       else selectStop(i-1,value);
      }}
     />
    </div>
   </label>
   <div className="trip-stop-actions" role="group" aria-label={'Ordenar o quitar destino '+(i+1)}>
    <button type="button" title="Subir destino" aria-label={'Subir destino '+(i+1)} disabled={i===0||!allSelected} onClick={()=>moveStop(i,-1)}><ArrowUp size={17}/></button>
    <button type="button" title="Bajar destino" aria-label={'Bajar destino '+(i+1)} disabled={i===stops.length-1||!allSelected} onClick={()=>moveStop(i,1)}><ArrowDown size={17}/></button>
    <button type="button" title="Quitar destino" aria-label={'Quitar destino '+(i+1)} disabled={i===0} onClick={()=>removeStop(i)}><Trash2 size={17}/></button>
   </div>
  </div>)}
  <button type="button" className="secondary trip-add-stop" disabled={!canAdd}
   aria-describedby="trip-stop-help" onClick={()=>{if(canAdd)updateStops([...list,''],[...confirmedExtra,''])}}>
   <Plus size={17}/> Agregar otro destino
  </button>
  <p id="trip-stop-help" className="trip-step-hint" role="status">{hint}</p>
  <p className="fieldhelp">Hasta 6 destinos. Podés cambiar el orden, también el primero. La IA seguirá este recorrido; verificá las conexiones antes de reservar.</p>
 </section>;
}
