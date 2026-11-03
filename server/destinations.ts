// @ts-ignore Native Node test runner requires explicit extension
import {paris,colmar,barcelona,roma,lisboa,madrid} from './builtin-photos.ts';
import {rankCityResults,rankCountryCities,matchCountryQuery} from '../lib/city-suggestions.ts';
import {tourismPhotos,PHOTO_SOURCE_VERSION} from './tourism-photos.ts';
async function remote(url:string){const r=await fetch(url,{headers:{'User-Agent':'Viaja/1.0 (travel photo attribution; contact via site owner)'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('El proveedor no respondió.');return r.json() as Promise<any>}
export async function destinationsAPI(request:Request){
 const u=new URL(request.url);if(!['/api/cities','/api/photos'].includes(u.pathname))return null;
 if(request.method!=='GET')return Response.json({error:'Método no permitido'},{status:405});
 const name=(u.searchParams.get('q')||'').trim();if(name.length<2||name.length>120)return Response.json({error:'Ingresá entre 2 y 120 caracteres.'},{status:400});
 try{
 if(u.pathname==='/api/cities'){
  const country=matchCountryQuery(name);
  if(country){
   // A country is not a city. Return its largest cities, not e.g. Mexican
   // villages named "Italia". countries.dev sources GeoNames and sorts by population.
   let cities:ReturnType<typeof rankCountryCities>=[];
   let provider='countries.dev · GeoNames';
   try{
    const raw=await remote('https://countries.dev/cities?'+new URLSearchParams({country:country.code,limit:'30'}));
    cities=rankCountryCities(Array.isArray(raw)?raw:raw.data||raw.cities||[],country);
   }catch{}
   if(!cities.length){
    // Independent fallback for countries not yet indexed by the first provider.
    const raw=await remote('https://geodb-free-service.wirefreethought.com/v1/geo/countries/'+country.code+'/places?'+new URLSearchParams({types:'CITY',sort:'-population',limit:'10',languageCode:'es'}));
    cities=rankCountryCities(raw.data||[],country);
    provider='GeoDB · GeoNames';
   }
   if(!cities.length)throw Error('Sin ciudades para ese país');
   return Response.json({cities,mode:'country',country,attribution:provider},
    {headers:{'Cache-Control':'public, max-age=86400'}});
  }
  const data=await remote('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name,count:'50',language:'es',format:'json'}));
  const cities=rankCityResults(data.results||[],name);
  return Response.json({cities,mode:'city',attribution:'Open-Meteo · GeoNames'},
   {headers:{'Cache-Control':'public, max-age=3600'}});
 }
 const builtin=({paris,colmar,barcelona,roma,lisboa,madrid} as Record<string,typeof paris>)[name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()];
 const month=Number((u.searchParams.get('date')||'').slice(5,7)),lat=Number(u.searchParams.get('lat')||'0');
 const seasons=['winter','spring','summer','autumn'];const season=month>=1&&month<=12?seasons[(Math.floor(month%12/3)+(lat<0?2:0))%4]:'';
 // Only curated landmark collections or title-verified scenic Commons photos.
 // A city name in a news image description is never sufficient.
 const photos=builtin||await tourismPhotos(name);
 if(!photos.length)throw Error('No tourist photos verified for the destination');
 return Response.json({photos,season,seasonalCount:0,photoStrategy:PHOTO_SOURCE_VERSION,
  note:'Imágenes de lugares emblemáticos y paisajes verificadas por título, formato y licencia en Wikimedia Commons; no son fotografías de la fecha del viaje.',
  fetchedAt:new Date().toISOString()},
  {headers:{'Cache-Control':'public, max-age=86400'}});

 }catch{return Response.json({error:'No pudimos consultar el proveedor. Podés reintentar; tus datos siguen guardados.'},{status:502})}
}
