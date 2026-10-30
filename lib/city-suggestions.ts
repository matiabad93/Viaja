/** Shared normalization for the API and the local offline geocoder fallback. */
export type CitySuggestion={
 id:number;name:string;country:string;region:string;latitude:number;longitude:number;
 timezone?:string;countryCode?:string;featureCode?:string;population?:number;
};
export function normalizeCityName(name:string):string{
 return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
}
export function cityLabel(city:Pick<CitySuggestion,'name'|'country'>):string{
 return [city.name,city.country].filter(Boolean).join(', ');
}
/** Do not show a region for a unique city/country. Show it only when needed to
 * distinguish genuinely different places called the same thing in one country.
 */
export function citySubtitle(city:CitySuggestion,options:CitySuggestion[]):string{
 const duplicate=options.some(other=>other.id!==city.id&&normalizeCityName(other.name)===normalizeCityName(city.name)&&normalizeCityName(other.country)===normalizeCityName(city.country));
 const region=duplicate&&normalizeCityName(city.region)!==normalizeCityName(city.name)?city.region:'';
 return [region,city.country].filter(Boolean).join(' · ');
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
