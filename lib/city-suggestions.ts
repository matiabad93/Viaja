/** Normalized, source-independent suggestions shared by browser and Pages Functions. */
export type CitySuggestion={
 id:number;name:string;country:string;region:string;latitude:number;longitude:number;
 timezone?:string;countryCode?:string;featureCode?:string;population?:number;
};
export type CountryMatch={code:string;name:string};
export function normalizeCityName(name:string):string{
 return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
}
export function cityLabel(city:Pick<CitySuggestion,'name'|'country'>):string{
 return [city.name,city.country].filter(Boolean).join(', ');
}
/** Always show the province/state when known; a unique city name still needs context. */
export function citySubtitle(city:CitySuggestion,_options:CitySuggestion[]=[]):string{
 const region=city.region.trim();
 return [region&&normalizeCityName(region)!==normalizeCityName(city.country)?region:'',city.country].filter(Boolean).join(', ');
}
/** Country lookup is local, works offline, and recognizes translated and accented names.
 * Do not interpret a partial city query as a country unless the prefix is unambiguous.
 */
let knownCountries:Map<string,CountryMatch[]>|null=null;
function countryNames():Map<string,CountryMatch[]>{
 if(knownCountries)return knownCountries;
 const names=new Map<string,CountryMatch[]>();
 const displayNames=['es','en','pt','fr','it'].map(language=>new Intl.DisplayNames([language],{type:'region'}));
 const spanish=displayNames[0];
 const put=(label:string,code:string)=>{
  const key=normalizeCityName(label);
  if(!key||key===normalizeCityName(code))return;
  const match={code,name:spanish.of(code)||label};
  const existing=names.get(key)||[];
  if(!existing.some(item=>item.code===code))names.set(key,[...existing,match]);
 };
 for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
  const code=String.fromCharCode(a,b);
  // Intl returns the raw code for unknown regions.
  if(spanish.of(code)===code)continue;
  for(const display of displayNames){const label=display.of(code);if(label)put(label,code);}
 }
 for(const [alias,code] of Object.entries({
  'eeuu':'US','ee. uu.':'US','usa':'US','estados unidos de america':'US',
  'inglaterra':'GB','gran bretana':'GB','republica checa':'CZ',
  'paises bajos':'NL','holanda':'NL','corea del sur':'KR',
  'corea del norte':'KP','emiratos arabes unidos':'AE'
 }))put(alias,code);
 knownCountries=names;return names;
}
export function matchCountryQuery(query:string):CountryMatch|null{
 if(query.includes(',')||query.trim().length<3)return null;
 const key=normalizeCityName(query);
 const names=countryNames();
 const exact=names.get(key)||[];
 if(exact.length===1)return exact[0];
 if(key.length<4)return null;
 const possible=new Map<string,CountryMatch>();
 for(const [name,values] of names)if(name.startsWith(key))for(const match of values)possible.set(match.code,match);
 return possible.size===1?[...possible.values()][0]:null;
}
export function rankCityResults(input:unknown,query:string):CitySuggestion[]{
 if(!Array.isArray(input))return [];
 const normalized=normalizeCityName(query.split(',')[0]);
 const unique=new Set<number>();
 const items:CitySuggestion[]=[];
 for(const item of input){
  if(!item||typeof item!=='object')continue;
  const c=item as Record<string,unknown>;
  const id=Number(c.id),lat=Number(c.latitude),lon=Number(c.longitude);
  const name=String(c.name||'').trim(),country=String(c.country||'').trim();
  const featureCode=String(c.feature_code||c.featureCode||'');
  if(!Number.isFinite(id)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!name||!country||!featureCode.startsWith('PPL')||unique.has(id))continue;
  unique.add(id);
  items.push({id,name,country,region:String(c.admin1||c.region||'').trim(),latitude:lat,longitude:lon,timezone:typeof c.timezone==='string'?c.timezone:undefined,countryCode:String(c.country_code||c.countryCode||''),featureCode,population:Number(c.population)||0});
 }
 const score=(c:CitySuggestion)=>(
  (normalizeCityName(c.name)===normalized?1000000000:0)+
  (c.featureCode==='PPLC'?100000000:0)+
  Math.min(c.population||0,30000000)
 );
 return items.sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name,'es')).slice(0,10);
}
/** Only actual populated cities inside the requested country, ranked by population.
 * Accepts GeoDB (id, region) and countries.dev (geonameId, admin1Code).
 */
export function rankCountryCities(input:unknown,country:CountryMatch):CitySuggestion[]{
 if(!Array.isArray(input))return [];
 const results:CitySuggestion[]=[];
 const unique=new Set<number>();
 for(const item of input){
  if(!item||typeof item!=='object')continue;
  const c=item as Record<string,unknown>;
  const id=Number(c.geonameId??c.id),lat=Number(c.latitude),lon=Number(c.longitude);
  const name=String(c.name||'').trim();
  const cc=String(c.countryCode||c.country_code||country.code).toUpperCase();
  const population=Number(c.population)||0;
  if(!Number.isInteger(id)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!name||cc!==country.code||unique.has(id)||population<1)continue;
  unique.add(id);
  // admin1Code is an opaque administrative code: never display it as a province name.
  const region=String(c.region||c.admin1||'').trim();
  results.push({id,name,country:country.name,region,latitude:lat,longitude:lon,
   featureCode:String(c.featureCode||c.feature_code||'PPL'),population,countryCode:country.code,
   timezone:typeof c.timezone==='string'?c.timezone:undefined});
 }
 return results.sort((a,b)=>(b.population||0)-(a.population||0)||a.name.localeCompare(b.name,'es')).slice(0,10);
}
