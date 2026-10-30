import type {Activity} from './travel.ts';
export type MapStop={id:string;title:string;query:string;time:string};
const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
/** Use an explicitly mentioned city, otherwise the most recently identified
 * city in this day's stops. Do not append the primary city to other cities.
 * An initial explicit location anchors the day, when available.
 */
export function mapLocationQueries(activities:Activity[],destination:string,additionalDestinations:string[]=[]):string[]{
 const cities=[destination,...additionalDestinations].filter(Boolean);
 const matchCity=(value:string)=>cities.find(city=>{
  const name=normalized(city.split(',')[0].trim());
  return name.length>=3&&normalized(value).includes(name);
 });
 const initial=activities.map(a=>matchCity(a.location||a.title)).find(Boolean)||destination;
 let current=initial;
 return activities.map(a=>{
  const place=(a.location||a.title).trim();
  const match=matchCity(place);
  if(match)current=match;
  return [place,match?'':current].filter(Boolean).join(', ').slice(0,200);
 });
}
export function mapStops(activities:Activity[],destination:string,additionalDestinations:string[]=[]):MapStop[]{
 const chosen=activities.filter(a=>a.title.trim()).slice(0,8);
 const queries=mapLocationQueries(chosen,destination,additionalDestinations);
 return chosen.map((a,i)=>({id:a.id,title:a.title,query:queries[i],time:a.time||'Flexible'}));
}
export function mapRouteUrl(activities:Activity[],destination:string,mode:'walking'|'driving'|'transit'='walking',additionalDestinations:string[]=[]){
 const stops=activities.filter(a=>(a.location||a.title).trim()).slice(0,9);
 if(!stops.length)return null;
 const places=mapLocationQueries(stops,destination,additionalDestinations);
 if(stops.length===1)return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:places[0]});
 const query=new URLSearchParams({api:'1',origin:places[0],destination:places.at(-1)!,travelmode:mode});
 if(places.length>2)query.set('waypoints',places.slice(1,-1).join('|'));
 return 'https://www.google.com/maps/dir/?'+query;
}
export function pointValid(lat:number,lon:number){return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180}
export function mapBounds(points:Array<[number,number]>):[[number,number],[number,number]]{
 const valid=points.filter(p=>pointValid(p[0],p[1]));
 if(!valid.length)return [[-1,-1],[1,1]];
 let minLat=Math.min(...valid.map(p=>p[0])),maxLat=Math.max(...valid.map(p=>p[0])),minLon=Math.min(...valid.map(p=>p[1])),maxLon=Math.max(...valid.map(p=>p[1]));
 if(minLat===maxLat){minLat-=.004;maxLat+=.004}
 if(minLon===maxLon){minLon-=.004;maxLon+=.004}
 return [[minLat,minLon],[maxLat,maxLon]];
}
