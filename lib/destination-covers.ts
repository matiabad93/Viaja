'use client';
import {useEffect,useMemo,useState} from 'react';
import {requestAPI} from './api-client';
import {paris,colmar,barcelona,roma,lisboa,madrid} from '../server/builtin-photos';
import {photo,type DestinationPhoto} from './travel';

function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
export function curatedCovers(destination:string):DestinationPhoto[]{
 const city=normalize(destination.split(',')[0].replace(/ · copia$/,'').replace(/ esencial| entre miradores| y alsacia/ig,''));
 const galleries:Record<string,DestinationPhoto[]>={paris,colmar,barcelona,roma,lisboa,madrid};
 const images=galleries[city]||[];
 if(city==='paris'){
  // Eiffel Tower first, then other Paris views. Never substitute another city's stock image.
  const landmarks=images.filter(p=>/eiffel|tour.eiffel/i.test(p.title));
  return [...landmarks,...images.filter(p=>!landmarks.includes(p))];
 }
 return images;
}
function uniqueImages(photos:DestinationPhoto[]){
 const used=new Set<string>();
 return photos.filter(p=>{if(!p.url?.startsWith('https://')||used.has(p.url))return false;used.add(p.url);return true});
}
export function useDestinationCover(destination:string,stored?:DestinationPhoto[],cityName?:string){
 const [remote,setRemote]=useState<DestinationPhoto[]>([]);
 const [bad,setBad]=useState<string[]>([]);
 const [index,setIndex]=useState(0);
 const curated=useMemo(()=>curatedCovers(destination),[destination]);
 // Curated destinations must never cycle through legacy off-topic stored photos.
 const photos=useMemo(()=>uniqueImages(curated.length?curated:[...(stored||[]),...remote]),[curated,stored,remote]);
 const good=useMemo(()=>photos.filter(p=>!bad.includes(p.url)),[photos,bad]);
 useEffect(()=>{setIndex(0);setBad([]);setRemote([])},[destination]);
 useEffect(()=>{
  if(curated.length||stored?.length)return;
  const query=(cityName||destination.split(',')[0]).replace(/ · copia$/,'').trim();
  if(!query||query.length<2)return;
  const controller=new AbortController();
  requestAPI('/api/photos?'+new URLSearchParams({q:query}),{signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error('Photos unavailable');return response.json() as Promise<{photos?:DestinationPhoto[]}>})
   .then(result=>{if(!controller.signal.aborted)setRemote(result.photos||[])})
   .catch(()=>{});
  return()=>controller.abort();
 },[destination,cityName,curated.length,stored?.length]);
 useEffect(()=>{if(good.length<2)return;const handle=window.setInterval(()=>setIndex(n=>(n+1)%good.length),6000);return()=>window.clearInterval(handle)},[good.length,destination]);
 const selected=good[index%Math.max(1,good.length)];
 const fallback=photo(destination);
 return {src:selected?.url||fallback||null,alt:selected?.title||destination,credit:selected?('Foto: '+(selected.author||'Wikimedia Commons')+' · '+selected.license):null,
  onError:()=>{if(selected)setBad(current=>current.includes(selected.url)?current:[...current,selected.url])}};
}
