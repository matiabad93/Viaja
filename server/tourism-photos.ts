/**
 * Scenic destination photography, not a free-text search for a city's name.
 * Wikimedia Commons File-title constraints + original-source license validation
 * ensure an unrelated news photo never becomes a trip cover.
 */
import type {DestinationPhoto} from '../lib/travel';

export const PHOTO_SOURCE_VERSION='scenic-v2';
export type ScenicTopic={term:string;label:string};
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const safe=(s:unknown)=>String(s||'').replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,' ').slice(0,400).trim();

const famous:Record<string,{term:string;label:string}[]>={
 miami:[
  {term:'Beach',label:'Miami Beach'},
  {term:'Ocean Drive',label:'Ocean Drive'},
  {term:'South Beach',label:'South Beach'},
  {term:'skyline',label:'Miami skyline'},
  {term:'Biscayne',label:'Biscayne Bay'},
  {term:'Art Deco',label:'Art Deco District'}
 ],
 'new york':[
  {term:'Manhattan skyline',label:'Manhattan skyline'},
  {term:'Brooklyn Bridge',label:'Brooklyn Bridge'},
  {term:'Central Park',label:'Central Park'},
  {term:'Statue of Liberty',label:'Statue of Liberty'}
 ],
 londres:[{term:'Tower Bridge',label:'Tower Bridge'},{term:'Westminster',label:'Westminster'},{term:'Big Ben',label:'Big Ben'},{term:'skyline',label:'London skyline'}],
 london:[{term:'Tower Bridge',label:'Tower Bridge'},{term:'Westminster',label:'Westminster'},{term:'Big Ben',label:'Big Ben'},{term:'skyline',label:'London skyline'}],
 edimburgo:[{term:'castle',label:'Edinburgh Castle'},{term:'Royal Mile',label:'Royal Mile'},{term:'Calton Hill',label:'Calton Hill'},{term:'skyline',label:'Edinburgh skyline'}],
 edinburgh:[{term:'castle',label:'Edinburgh Castle'},{term:'Royal Mile',label:'Royal Mile'},{term:'Calton Hill',label:'Calton Hill'},{term:'skyline',label:'Edinburgh skyline'}],
 rosario:[{term:'Monumento a la Bandera',label:'Monumento Nacional a la Bandera'},{term:'Parque España',label:'Parque España'},{term:'Costanera',label:'Costanera'},{term:'skyline',label:'Rosario skyline'}],
 buenosaires:[{term:'Obelisco',label:'Obelisco'},{term:'Casa Rosada',label:'Casa Rosada'},{term:'Puerto Madero',label:'Puerto Madero'},{term:'skyline',label:'Buenos Aires skyline'}],
 'buenos aires':[{term:'Obelisco',label:'Obelisco'},{term:'Casa Rosada',label:'Casa Rosada'},{term:'Puerto Madero',label:'Puerto Madero'},{term:'skyline',label:'Buenos Aires skyline'}],
 sydney:[{term:'Opera House',label:'Sydney Opera House'},{term:'Harbour Bridge',label:'Harbour Bridge'},{term:'Bondi Beach',label:'Bondi Beach'},{term:'skyline',label:'Sydney skyline'}],
 amsterdam:[{term:'canals',label:'Amsterdam canals'},{term:'historic',label:'Amsterdam historic centre'},{term:'skyline',label:'Amsterdam skyline'},{term:'bridges',label:'Amsterdam bridges'}],
 tokyo:[{term:'Skytree',label:'Tokyo Skytree'},{term:'Shibuya',label:'Shibuya'},{term:'Sensoji',label:'Senso-ji'},{term:'skyline',label:'Tokyo skyline'}],
};
const deny=/\b(politic|politician|president|governor|mayor|minister|election|campaign|congress|senator|speech|handshake|handshaking|hand shake|meeting|ceremony|conference|conference hall|summit|signing|awards?|protest|march|demonstrat|people|portrait|person|model|celebrity|actor|football|soccer|match|team|police|crime|arrest|shooting|hospital|ambulance|disaster|accident|war|fire|flags?|logos?|posters?|brochure|advertis|drawing|illustration|painting|artwork|map|diagram|infographic|icon|screenshot|stock photo|stockphoto|watermark|selfie|passport|hotel room|restaurant menu|menu|interview|press)\b/i;

export function tourismTopics(city:string):ScenicTopic[]{
 const n=normal(city);
 const specific=famous[n];
 if(specific)return specific.slice(0,6);
 return [
  {term:'skyline',label:'Vista panorámica'},
  {term:'panorama',label:'Panorámica de la ciudad'},
  {term:'old town',label:'Centro histórico'},
  {term:'landmark',label:'Monumento emblemático'},
  {term:'waterfront',label:'Paseo junto al agua'}
 ];
}
export function photoSearchQuery(city:string,topic:ScenicTopic):string{
 const cityPart=city.replace(/["\\]/g,'').trim().slice(0,80);
 const subject=topic.term.replace(/["\\]/g,'').trim().slice(0,60);
 // Search FILE TITLES, not the article descriptions or user names.
 return 'intitle:"'+cityPart+'" intitle:"'+subject+'" filetype:bitmap';
}

type ImageInfo={
 width?:number;height?:number;thumburl?:string;descriptionurl?:string;
 mime?:string;extmetadata?:Record<string,{value?:string}>;
};
type FilePage={title?:string;index?:number;imageinfo?:ImageInfo[]};
export function scenicCandidate(file:FilePage,city:string,topic:ScenicTopic):DestinationPhoto|null{
 const info=file.imageinfo?.[0], title=safe(file.title||'').replace(/^File:/i,'');
 if(!info||!title||deny.test(normal(title)))return null;
 const normalized=normal(title),cityName=normal(city),topicName=normal(topic.term);
 if(!normalized.includes(cityName)||!normalized.includes(topicName))return null;
 const w=Number(info.width),h=Number(info.height);
 // Landscape destinations only; no portrait collages or microscopic thumbnails.
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<900||h<500||w/h<1.22||w/h>3.5)return null;
 if(info.mime&&!/^image\/(jpeg|png|webp)$/i.test(info.mime))return null;
 if(!info.thumburl?.startsWith('https://')||!info.descriptionurl?.startsWith('https://commons.wikimedia.org/wiki/File:'))return null;
 const meta=info.extmetadata,license=safe(meta?.LicenseShortName?.value);
 if(!license||!/^(CC|Public domain|PD\b)/i.test(license))return null;
 return {url:info.thumburl,source:info.descriptionurl,title:topic.label+' · '+title,author:safe(meta?.Artist?.value)||'Autor no indicado',license};
}
async function commons(city:string,topic:ScenicTopic):Promise<DestinationPhoto[]>{
 const params=new URLSearchParams({
  action:'query',format:'json',formatversion:'2',generator:'search',
  gsrsearch:photoSearchQuery(city,topic),gsrnamespace:'6',gsrlimit:'12',
  prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'1280',maxlag:'5'
 });
 const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{
  headers:{'User-Agent':'Viaja/1.0 (https://github.com/matiabad93/Viaja; destination photo search)','Accept':'application/json'},
  signal:AbortSignal.timeout(10500),cache:'no-store'
 });
 if(!response.ok)throw Error('Commons temporarily unavailable');
 const result=await response.json() as {query?:{pages?:FilePage[]}};
 const items=Array.isArray(result.query?.pages)?result.query.pages:[];
 return items.sort((a,b)=>(a.index||0)-(b.index||0)).flatMap(file=>{
  const photo=scenicCandidate(file,city,topic);return photo?[photo]:[];
 }).slice(0,3);
}
export async function tourismPhotos(city:string):Promise<DestinationPhoto[]>{
 const subjects=tourismTopics(city);
 const buckets:DestinationPhoto[][]=[];
 // Limit concurrency to two API requests at a time.
 for(let i=0;i<subjects.length;i+=2){
  const replies=await Promise.allSettled(subjects.slice(i,i+2).map(t=>commons(city,t)));
  for(const response of replies)buckets.push(response.status==='fulfilled'?response.value:[]);
 }
 const dedupe=new Set<string>(),photos:DestinationPhoto[]=[];
 // Interleave landmarks so a cover does not cycle through six near-identical beaches.
 for(let offset=0;offset<3;offset++)for(const bucket of buckets){
  const item=bucket[offset];
  if(item&&!dedupe.has(item.source)&&!dedupe.has(item.url)){
   photos.push(item);dedupe.add(item.source);dedupe.add(item.url);
  }
 }
 return photos.slice(0,10);
}
