'use client';
import {useEffect,useMemo,useState} from 'react';
import {requestAPI} from './api-client';
import {paris,colmar,barcelona,roma,lisboa,madrid} from '../server/builtin-photos';
import {PHOTO_SOURCE_VERSION} from '../server/tourism-photos';
import {photo,type DestinationPhoto} from './travel';

function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
export function curatedCovers(destination:string):DestinationPhoto[]{
 const city=normalize(destination.split(',')[0].replace(/ · copia$/,'').replace(/ esencial| entre miradores| y alsacia| imprescindible/ig,''));
 const galleries:Record<string,DestinationPhoto[]>={paris,colmar,barcelona,roma,lisboa,madrid};
 const images=galleries[city]||[];
 if(city==='paris'){
  // Eiffel Tower first, then other Paris views. Never substitute another city's stock image.
  const landmarks=images.filter(p=>/eiffel|tour.eiffel/i.test(p.title));
  return [...landmarks,...images.filter(p=>!landmarks.includes(p))];
 }
 return images;
}
export function photoCacheKey(city:string,country:string=''){
 return PHOTO_SOURCE_VERSION+'|'+normalize(city)+'|'+normalize(country);
}
function uniqueImages(photos:DestinationPhoto[]){
 const used=new Set<string>();
 return photos.filter(p=>{if(!p.url?.startsWith('https://')||used.has(p.url))return false;used.add(p.url);return true});
}
export function useDestinationCover(destination:string,stored?:DestinationPhoto[],cityName?:string,photoKey?:string,countryName?:string){
 const [remote,setRemote]=useState<{key:string;photos:DestinationPhoto[]}|null>(null);
 const [bad,setBad]=useState<string[]>([]);
 const [index,setIndex]=useState(0);
 const curated=useMemo(()=>curatedCovers(destination),[destination]);
 const city=(cityName||destination.split(',')[0]).replace(/ · copia$/,'').trim();
 const country=countryName||destination.split(',').slice(1).join(',').trim();
 const key=photoCacheKey(city,country);
 // Existing accounts may contain old Commons results (including politicians).
 // Those records must be ignored unless the newer scenic strategy saved them.
 const safeStored=photoKey===key?stored||[]:[];
 const photos=useMemo(()=>uniqueImages(curated.length?curated:[...safeStored,...(remote?.key===key?remote.photos:[])]),
  [curated,safeStored,remote,key]);
 const good=useMemo(()=>photos.filter(p=>!bad.includes(p.url)),[photos,bad]);
 useEffect(()=>{setIndex(0);setBad([])},[key]);
 useEffect(()=>{
  if(curated.length||safeStored.length||city.length<2)return;
  const controller=new AbortController();
  requestAPI('/api/photos?'+new URLSearchParams({q:city,country,v:PHOTO_SOURCE_VERSION}),{signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error('Photos unavailable');return response.json() as Promise<{photos?:DestinationPhoto[]}>})
   .then(result=>{if(!controller.signal.aborted)setRemote({key,photos:result.photos||[]})})
   .catch(()=>{});
  return()=>controller.abort();
 },[key,city,country,curated.length,safeStored.length]);
 useEffect(()=>{if(good.length<2)return;const handle=window.setInterval(()=>setIndex(n=>(n+1)%good.length),6000);return()=>window.clearInterval(handle)},[good.length,key]);
 const selected=good[index%Math.max(1,good.length)];
 const fallback=photo(destination);
 // For unknown destinations show neutral artwork rather than a misleading old photo.
 return {src:selected?.url||fallback||null,alt:selected?.title||destination,credit:selected?('Foto: '+(selected.author||'Wikimedia Commons')+' · '+selected.license):null,
  onError:()=>{if(selected)setBad(current=>current.includes(selected.url)?current:[...current,selected.url])}};
}
