'use client';
import {requestAPI} from '../lib/api-client';
import {cityLabel,citySubtitle,rankCityResults,rankCountryCities,matchCountryQuery,type CitySuggestion} from '../lib/city-suggestions';
import {useEffect,useId,useRef,useState} from 'react';

export type City=CitySuggestion;
type Props={
 value:string;onChange:(v:string)=>void;onSelect:(city:City)=>void;
 ariaLabel?:string;placeholder?:string;required?:boolean;
};
/** One autocomplete for origin, primary destination and every additional stop. */
export function DestinationSearch({value,onChange,onSelect,ariaLabel='Buscar ciudad',placeholder='Buscá una ciudad, por ejemplo Madrid',required=true}:Props){
 const id=useId(),[cities,setCities]=useState<City[]>([]),[open,setOpen]=useState(false),
 [active,setActive]=useState(-1),[state,setState]=useState(''),[retry,setRetry]=useState(0),[countryMode,setCountryMode]=useState(false);
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
   const country=matchCountryQuery(query);
   setCountryMode(Boolean(country));
   try{
    let results:City[]=[];
    try{
     const response=await requestAPI('/api/cities?'+new URLSearchParams({q:query}),{signal:controller.signal});
     if(!response.ok)throw Error('El servidor no respondió.');
     const data=await response.json() as {cities?:City[]};
     results=country?rankCountryCities(data.cities||[],country):rankCityResults(data.cities||[],query);
     if(country&&!results.length)throw Error('Sin sugerencias para el país');
    }catch(e){
     if(controller.signal.aborted)throw e;
     if(country){
      // A failed Pages Function must never turn a country into namesake villages.
      const response=await fetch('https://countries.dev/cities?'+new URLSearchParams({country:country.code,limit:'30'}),{signal:controller.signal});
      if(!response.ok)throw Error('No se pudieron consultar ciudades de ese país.');
      const data=await response.json() as unknown;
      const list=Array.isArray(data)?data:(data&&typeof data==='object'?(data as {data?:unknown;cities?:unknown}).data||(data as {cities?:unknown}).cities:[]);
      results=rankCountryCities(list,country);
     }else{
      // Search remains available if Cloudflare Functions are temporarily down.
      const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:query,count:'50',language:'es',format:'json'}),{signal:controller.signal});
      if(!response.ok)throw Error('No se pudo consultar las ciudades.');
      const data=await response.json() as {results?:unknown[]};
      results=rankCityResults(data.results||[],query);
     }
    }
    if(controller.signal.aborted)return;
    setCities(results);setActive(-1);
    setState(results.length?'':country?'No encontramos ciudades de ese país. Reintentá o buscá una ciudad específica.':'No encontramos esa ciudad. Podés escribirla manualmente.');
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
   {cities.length>0&&<small className="city-result-source">{countryMode?'Principales ciudades del país, por población · GeoNames':'Ciudades y provincias · Open-Meteo / GeoNames'}</small>}
  </div>}
 </div>;
}
