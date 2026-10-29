import type {Activity} from './travel.ts';
export type MapStop={id:string;title:string;query:string;time:string};
export function mapStops(activities:Activity[],destination:string):MapStop[]{
 return activities.filter(a=>a.title.trim()).map(a=>({
  id:a.id,title:a.title,
  query:[a.location?.trim()||a.title,destination.trim()].filter(Boolean).join(', ').slice(0,200),
  time:a.time||'Flexible'
 })).slice(0,8);
}
export function mapRouteUrl(activities:Activity[],destination:string,mode:'walking'|'driving'|'transit'='walking'){
 const stops=activities.filter(a=>(a.location||a.title).trim());
 if(stops.length===0)return null;
 const place=(a:Activity)=>[a.location||a.title,destination].filter(Boolean).join(', ');
 const group=stops.slice(0,9);
 const query=new URLSearchParams({api:'1',origin:place(group[0]),destination:place(group.at(-1)!),travelmode:mode});
 if(group.length>2)query.set('waypoints',group.slice(1,-1).map(place).join('|'));
 if(group.length===1)return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:place(group[0])});
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
