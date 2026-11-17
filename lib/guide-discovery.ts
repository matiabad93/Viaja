import type {Guide} from './curated-guides';

export type GuideSort='Recomendadas'|'Destino A–Z'|'Menos días';
export type GuideCountry='Todos'|string;

const normalize=(value:string)=>String(value||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const countryOf=(guide:Guide)=>String(guide.country||({roma:'ITALIA',paris:'FRANCIA',colmar:'FRANCIA'} as Record<string,string>)[guide.id]||'OTROS').trim().toLocaleUpperCase('es');

/** Derive filters from actual published catalog data, including user-created guides. */
export function guideCountries(guides:Guide[]):string[]{
 return [...new Set(guides.filter(g=>g.published).map(countryOf))].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
}

/** Search titles, descriptions, countries and the actual places in day itineraries. */
export function selectVisibleGuides(guides:Guide[],query:string,country:GuideCountry,sort:GuideSort,favorites:string[],onlyFavorites:boolean):Guide[]{
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 const matched=guides.filter(g=>{
  if(!g.published||onlyFavorites&&!favorites.includes(g.id)||country!=='Todos'&&countryOf(g)!==country)return false;
  const haystack=normalize([g.title,countryOf(g),g.description||'',...g.days].join(' '));
  return terms.every(term=>haystack.includes(term));
 });
 if(sort==='Destino A–Z')return matched.sort((a,b)=>a.title.localeCompare(b.title,'es',{sensitivity:'base'})||a.id.localeCompare(b.id));
 if(sort==='Menos días')return matched.sort((a,b)=>a.days.length-b.days.length||a.title.localeCompare(b.title,'es',{sensitivity:'base'}));
 return matched;
}

/** Short, real stop names for visual previews; never invent destination highlights. */
export function previewGuideStops(guide:Guide,limit=3):string[]{
 return guide.days.flatMap(day=>day.split('|')).map(stop=>stop.split(':')[0].trim()).filter(Boolean).slice(0,Math.max(0,limit));
}
