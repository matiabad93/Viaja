// @ts-ignore Native Node test runner requires explicit extension
import {paris,colmar,barcelona,roma,lisboa,madrid} from './builtin-photos.ts';
import {rankCityResults,rankCountryCities,matchCountryQuery} from '../lib/city-suggestions.ts';
const clean=(s:unknown)=>String(s||'').replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,' ').slice(0,500);
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
   let cities= [];
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
 const search=async(term:string)=>{
 const data=await remote('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:term+' filetype:bitmap -map -logo -portrait -diagram',gsrnamespace:'6',gsrlimit:'20',prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'1200'}));
 return Object.values(data.query?.pages||{}).sort((a:any,b:any)=>(a.index||0)-(b.index||0)).flatMap((p:any)=>{const i=p.imageinfo?.[0],m=i?.extmetadata;if(!i?.thumburl||!m?.LicenseShortName?.value||i.width<700||i.height<400||i.width/i.height>3||i.height/i.width>2)return [];return [{url:i.thumburl,source:i.descriptionurl,title:clean(p.title.replace(/^File:/,'')),author:clean(m.Artist?.value),license:clean(m.LicenseShortName?.value)}]});
 };
 const country=(u.searchParams.get('country')||'').slice(0,80).replace(/[^\p{L}\s]/gu,'');
 const query='"'+name.replace(/["\\]/g,'')+'" '+country;
 const results=builtin?[]:await Promise.allSettled([search(query),season?search(query+' '+season):Promise.resolve([])]);
 const general=builtin||(results[0]?.status==='fulfilled'?results[0].value:[]),seasonal=results[1]?.status==='fulfilled'?results[1].value:[];
 if(!general.length&&!seasonal.length)throw Error('No encontramos fotos disponibles para este destino.');
 const rejected=/protest|demonstrat|manifest|climate|palestin|antifascis|politic|insect|millipede|cockroach|spider|reptile|dead |killed|accident|traffic jam|advert|graffiti|poster|flag|logo|map|diagram|painting|drawing|sketch|cartoon|screenshot|infographic|stock photo/i;
 const city=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const seen=new Set<string>();
 const photos=[...general,...seasonal].filter(p=>{
  if(seen.has(p.source)||rejected.test(p.title))return false;
  // Free-text Commons matches can be any subject. For uncurated locations,
  // require the destination name in the filename instead of taking random results.
  if(!builtin&&!p.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(city))return false;
  seen.add(p.source);return true;
 }).slice(0,10);
 if(!photos.length)throw Error('Ninguna fotografía verificada para este destino.');
 return Response.json({photos,season,seasonalCount:Math.min(seasonal.length,10),note:'Fotos de archivo del destino. La estación es un criterio de búsqueda, no una garantía del aspecto en las fechas de tu viaje.',fetchedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=86400'}});
 }catch{return Response.json({error:'No pudimos consultar el proveedor. Podés reintentar; tus datos siguen guardados.'},{status:502})}
}
