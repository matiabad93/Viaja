'use client';
import {requestAPI} from '../lib/api-client';
import {cityLabel,citySubtitle,rankCityResults,type CitySuggestion} from '../lib/city-suggestions';
import {useEffect,useId,useRef,useState} from 'react';

export type City=CitySuggestion;
type Props={
 value:string;onChange:(v:string)=>void;onSelect:(city:City)=>void;
 ariaLabel?:string;placeholder?:string;required?:boolean;
};
/** One autocomplete for origin, primary destination and every additional stop. */
export function DestinationSearch({value,onChange,onSelect,ariaLabel='Buscar ciudad',placeholder='Buscá una ciudad, por ejemplo Madrid',required=true}:Props){
 const id=useId(),[cities,setCities]=useState<City[]>([]),[open,setOpen]=useState(false),
 [active,setActive]=useState(-1),[state,setState]=useState(''),[retry,setRetry]=useState(0);
 const picked=useRef(value);
 useEffect(()=>{
  const query=value.trim();
  if(!open||query.length<2||query===picked.current){
   setCities([]);setState('');return;
  }
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setState('Buscando ciudades…');
   const deadline=setTimeout(()=>controller.abort(),18000);
   try{
    let results:City[]=[];
    try{
     const response=await requestAPI('/api/cities?'+new URLSearchParams({q:query}),{signal:controller.signal});
     if(!response.ok)throw Error('El servidor no respondió.');
     const data=await response.json() as {cities?:City[]};
     results=rankCityResults(data.cities||[],query);
    }catch(e){
     if(controller.signal.aborted)throw e;
     // Search remains available if the Cloudflare Functions endpoint is down.
     const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:query,count:'15',language:'es',format:'json'}),{signal:controller.signal});
     if(!response.ok)throw Error('No se pudo consultar las ciudades.');
     const data=await response.json() as {results?:unknown[]};
     results=rankCityResults(data.results||[],query);
    }
    if(controller.signal.aborted)return;
    setCities(results);setActive(-1);
    setState(results.length?'':'No encontramos esa ciudad. Podés escribirla manualmente.');
   }catch{
    if(!controller.signal.aborted)setState('No pudimos buscar ciudades. Reintentá o escribí el lugar.');
   }finally{clearTimeout(deadline)}
  },300);
  return()=>{clearTimeout(timer);controller.abort()};
 },[value,open,retry]);
 const select=(city:City)=>{
  const label=cityLabel(city);
  picked.current=label;
  onSelect(city);
  setOpen(false);setActive(-1);setCities([]);setState('');
 };
 const openList=open&&value.trim().length>=2&&value.trim()!==picked.current;
 return <div className="city-combobox">
  <input aria-label={ariaLabel} role="combobox" aria-autocomplete="list" aria-expanded={openList}
   aria-controls={openList?id:undefined} aria-activedescendant={openList&&active>=0?id+'-'+active:undefined}
   autoComplete="off" required={required} maxLength={120} placeholder={placeholder} value={value}
   onFocus={()=>setOpen(true)}
   onBlur={()=>setOpen(false)}
   onChange={e=>{picked.current='';onChange(e.target.value);setOpen(true)}}
   onKeyDown={e=>{
    if(e.key==='ArrowDown'&&cities.length){e.preventDefault();setOpen(true);setActive(n=>(n+1)%cities.length)}
    if(e.key==='ArrowUp'&&cities.length){e.preventDefault();setOpen(true);setActive(n=>n<=0?cities.length-1:n-1)}
    if(e.key==='Escape'){setOpen(false);setCities([])}
    if(e.key==='Enter'&&openList&&cities.length){
     e.preventDefault();select(cities[active>=0?active:0]);
    }
   }}/>
  {openList&&<div className="city-results">
   {cities.length>0&&<div id={id} role="listbox" aria-label={'Resultados de '+ariaLabel}>
    {cities.map((city,i)=><button key={city.id} type="button" role="option" id={id+'-'+i}
     aria-selected={active===i} className="city-result-option"
     onMouseDown={e=>e.preventDefault()} onPointerDown={e=>e.preventDefault()}
     onClick={()=>select(city)}>
     <span className="city-result-name">{city.name}</span>
     <span className="city-result-country">{citySubtitle(city,cities)}</span>
    </button>)}
   </div>}
   {state&&<p role="status" className="city-search-state">{state}{state.startsWith('No pudimos')&&
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setRetry(n=>n+1)}>Reintentar</button>}
   </p>}
   {cities.length>0&&<small className="city-result-source">Ciudades de Open-Meteo / GeoNames</small>}
  </div>}
 </div>;
}
