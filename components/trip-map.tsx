'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {MapPin,Navigation,ExternalLink,LoaderCircle,AlertCircle} from 'lucide-react';
import type {Activity,Trip} from '../lib/travel.ts';
import {mapBounds,mapRouteUrl,mapStops,pointValid} from '../lib/map-helpers.ts';

type Coordinate={lat:number;lon:number};
type DisplayPoint={id:string;title:string;time:string;coordinate:Coordinate};
type MapInterface={setView:(at:[number,number],zoom:number)=>MapInterface;fitBounds:(bounds:[[number,number],[number,number]],options?:Record<string,unknown>)=>void;invalidateSize:(options?:{pan?:boolean;debounceMoveend?:boolean})=>MapInterface;remove:()=>void};
type LeafletApi={map:(node:HTMLElement)=>MapInterface;tileLayer:(url:string,config:Record<string,unknown>)=>{addTo:(map:MapInterface)=>unknown};marker:(at:[number,number])=>{addTo:(map:MapInterface)=>{bindPopup:(label:string)=>unknown}}};
declare global {interface Window {L?:LeafletApi}}
const MAX_STOPS=6;
let leafletPromise:Promise<LeafletApi>|null=null;
const leafletCDNs=[
 {css:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',js:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'},
 {css:'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',js:'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'}
];
function loadStyles(url:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  const previous=document.getElementById('viaja-leaflet-css') as HTMLLinkElement|null;
  if(previous?.sheet){resolve();return}
  previous?.remove();
  const link=document.createElement('link');
  link.id='viaja-leaflet-css';link.rel='stylesheet';link.href=url;
  link.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin='anonymous';
  link.onload=()=>resolve();
  link.onerror=()=>{link.remove();reject(Error('No se pudieron cargar los estilos del mapa'))};
  document.head.appendChild(link);
 });
}
function loadLeafletScript(url:string):Promise<LeafletApi>{
 return new Promise((resolve,reject)=>{
  if(window.L){resolve(window.L);return}
  const script=document.createElement('script');
  script.src=url;
  script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  script.crossOrigin='anonymous';
  script.onload=()=>window.L?resolve(window.L):reject(Error('La biblioteca del mapa no se inicializó'));
  script.onerror=()=>{script.remove();reject(Error('No se pudo cargar la biblioteca del mapa'))};
  document.head.appendChild(script);
 });
}
function ensureLeaflet():Promise<LeafletApi>{
 if(leafletPromise)return leafletPromise;
 leafletPromise=(async()=>{
  for(const cdn of leafletCDNs){
   try{await loadStyles(cdn.css);return await loadLeafletScript(cdn.js)}catch{}
  }
  throw Error('No se pudo descargar Leaflet desde los proveedores de respaldo');
 })().catch(e=>{leafletPromise=null;throw e});
 return leafletPromise;
}
const safeText=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
function readCache(query:string):Coordinate|null{
 try{const raw=localStorage.getItem('viaja-place-v1:'+query.toLowerCase());if(!raw)return null;const d=JSON.parse(raw);if(d.saved>Date.now()-30*86400000&&pointValid(d.lat,d.lon))return {lat:d.lat,lon:d.lon}}catch{}
 return null;
}
function cache(query:string,coord:Coordinate){try{localStorage.setItem('viaja-place-v1:'+query.toLowerCase(),JSON.stringify({...coord,saved:Date.now()}))}catch{}}
async function lookup(query:string):Promise<Coordinate|null>{
 const cached=readCache(query);if(cached)return cached;
 const endpoint='https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q:query,format:'json',limit:'1'});
 const response=await fetch(endpoint,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(response.status===429?'El proveedor de ubicaciones está ocupado.':'No se pudo consultar el servicio de ubicaciones.');
 const data=await response.json() as Array<{lat:string;lon:string}>;
 const lat=Number(data[0]?.lat),lon=Number(data[0]?.lon);
 if(!data.length||!pointValid(lat,lon))return null;
 const value={lat,lon};cache(query,value);return value;
}
export function TripMap({trip,activities}:{trip:Trip;activities:Activity[]}){
 const element=useRef<HTMLDivElement>(null),map=useRef<MapInterface|null>(null),generation=useRef(0);
 const [mapReady,setMapReady]=useState(false),[points,setPoints]=useState<DisplayPoint[]>([]),[missing,setMissing]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0),[mode,setMode]=useState<'walking'|'driving'|'transit'>('walking');
 const stops=mapStops(activities,trip.destination);
 const fallback=trip.city&&pointValid(trip.city.latitude,trip.city.longitude)?{lat:trip.city.latitude,lon:trip.city.longitude}:null;
 const pinStops=useCallback(async()=>{
  const ticket=++generation.current;setBusy(true);setError('');setPoints([]);setMissing([]);
  const output:DisplayPoint[]=[],unlocated:string[]=[];
  try{
   // Geocoding is opt-in, sequential and capped; no automatic bulk lookups.
   const candidates=stops.slice(0,MAX_STOPS);
   for(let i=0;i<candidates.length;i++){
    const stop=candidates[i];
    if(i&&(!readCache(stop.query)))await wait(1250);
    let location:Coordinate|null=null;
    try{location=await lookup(stop.query)}catch{unlocated.push(stop.title);continue}
    if(ticket!==generation.current)return;
    if(location)output.push({id:stop.id,title:stop.title,time:stop.time,coordinate:location});else unlocated.push(stop.title);
   }
   if(ticket!==generation.current)return;
   setPoints(output);setMissing(unlocated);
   if(!output.length)setError('No pudimos ubicar automáticamente las actividades. Revisá sus ubicaciones o abrí el recorrido en Google Maps.');
  }finally{if(ticket===generation.current)setBusy(false)}
 },[activities,trip.destination]);
 useEffect(()=>{generation.current++;setPoints([]);setMissing([]);setError('');return()=>{generation.current++}},[trip.destination,activities]);
 useEffect(()=>{
  let cancelled=false;
  setLoadError('');
  let observer:ResizeObserver|undefined;
  let frame=0,settledFrame=0;
  const refreshSize=()=>{
   cancelAnimationFrame(frame);
   cancelAnimationFrame(settledFrame);
   frame=requestAnimationFrame(()=>{
    settledFrame=requestAnimationFrame(()=>{
     if(!cancelled)map.current?.invalidateSize({pan:false,debounceMoveend:true});
    });
   });
  };
  if(!element.current)return;
  (async()=>{
   try{
    const L=await ensureLeaflet();if(cancelled||!element.current)return;
    if(map.current){map.current.remove();map.current=null}
    const initial=fallback?[fallback.lat,fallback.lon] as [number,number]:[45,9] as [number,number];
    const m=L.map(element.current).setView(initial,fallback?11:4);
    map.current=m;
    setMapReady(true);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',maxZoom:19}).addTo(m);
    if(!fallback){const center=readCache(trip.destination);if(center)m.setView([center.lat,center.lon],12)}
    // A tab opening, font/layout reflow or iPhone viewport change can
    // resize the container after Leaflet cached its original dimensions.
    if(typeof ResizeObserver!=='undefined'){
     observer=new ResizeObserver(refreshSize);
     observer.observe(element.current);
    }
    window.addEventListener('resize',refreshSize);
    window.addEventListener('pageshow',refreshSize);
    refreshSize();
   }catch(e){if(!cancelled)setLoadError('No pudimos cargar el mapa integrado. Podés reintentar o abrir la ruta en Google Maps.')}
  })();
  return()=>{
   cancelled=true;
   observer?.disconnect();
   cancelAnimationFrame(frame);
   cancelAnimationFrame(settledFrame);
   window.removeEventListener('resize',refreshSize);
   window.removeEventListener('pageshow',refreshSize);
   setMapReady(false);
   map.current?.remove();
   map.current=null;
  };
 },[trip.destination,fallback?.lat,fallback?.lon,loadAttempt]);
 useEffect(()=>{
  if(!mapReady||!points.length||!map.current||!window.L)return;
  // Refresh the map when pin collection changes.
  const L=window.L,m=map.current;
  // Leave the existing map for tiles, recreate only marker overlays via layer group if available.
  for(const p of points)L.marker([p.coordinate.lat,p.coordinate.lon]).addTo(m).bindPopup('<strong>'+safeText(p.title)+'</strong><div>'+safeText(p.time)+'</div>');
  m.fitBounds(mapBounds(points.map(p=>[p.coordinate.lat,p.coordinate.lon])),{padding:[35,35],maxZoom:14});
 },[points,mapReady]);
 const link=mapRouteUrl(activities,trip.destination,mode);
 const mapCenter=fallback||points[0]?.coordinate;
 const iframeSource=mapCenter?'https://www.openstreetmap.org/export/embed.html?'+new URLSearchParams({bbox:[mapCenter.lon-.02,mapCenter.lat-.012,mapCenter.lon+.02,mapCenter.lat+.012].join(','),layer:'mapnik',marker:mapCenter.lat+','+mapCenter.lon}):null;
 return <section className="viaja-map-section">
  <div className="calendar-intro"><MapPin size={22}/><div><h3>Tu recorrido en el mapa</h3><p>Explorá los lugares de este día. Los puntos son ubicaciones aproximadas; comprobá las direcciones antes de desplazarte.</p></div></div>
  <div className="viaja-map-toolbar"><button className="primary" onClick={()=>void pinStops()} disabled={busy||!stops.length}>{busy?<LoaderCircle className="spin" size={17}/>:<MapPin size={17}/>} {busy?'Buscando ubicaciones…':'Mostrar lugares en el mapa'}</button>
   <label>Cómo moverte <select aria-label="Medio de transporte para el recorrido" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="walking">A pie</option><option value="driving">En coche</option><option value="transit">Transporte público</option></select></label>
   {link&&<a className="secondary" href={link} target="_blank" rel="noopener noreferrer"><Navigation size={16}/>Abrir ruta en Google Maps <ExternalLink size={14}/></a>}
  </div>
  {error&&<p role="alert" className="error">{error}</p>}
  {loadError&&<div role="alert" className="error">{loadError} <button type="button" className="secondary" onClick={()=>setLoadAttempt(n=>n+1)}>Reintentar mapa</button></div>}
  <div ref={element} className="viaja-osm-map" role="region" aria-label={'Mapa de '+trip.destination} style={{display:loadError?'none':undefined}}/>
  {loadError&&iframeSource&&<iframe className="viaja-osm-map" loading="lazy" title={'Mapa alternativo de '+trip.destination} src={iframeSource} referrerPolicy="no-referrer-when-downgrade"/>}
  <div className="viaja-map-list">{stops.map((stop,i)=><div key={stop.id} className="viaja-map-stop"><span className="viaja-map-stop-number">{i+1}</span><div><strong>{stop.title}</strong><small>{stop.time} · {stop.query}</small></div><a href={'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:stop.query})} target="_blank" rel="noopener noreferrer" aria-label={'Buscar '+stop.title+' en Google Maps'}><ExternalLink size={17}/></a></div>)}</div>
  {stops.length>MAX_STOPS&&<p className="subtle">Por respeto a los límites de geocodificación, se ubican hasta {MAX_STOPS} puntos por consulta. Podés abrir el resto individualmente en Google Maps.</p>}
  {missing.length>0&&<p className="subtle"><AlertCircle size={14}/> No se pudieron localizar: {missing.join(', ')}. Podés corregir las ubicaciones en Itinerario.</p>}
  <p className="viaja-map-attribution">Mapa: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>. Ubicaciones: <a href="https://nominatim.org/" target="_blank" rel="noopener noreferrer">Nominatim</a>, bajo demanda y con caché local. El mapa no calcula tiempos de desplazamiento ni rutas automáticamente.</p>
 </section>;
}
