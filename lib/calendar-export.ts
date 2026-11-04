import type {Accommodation,TransportSegment} from './travel.ts';
import {localTimeToUtc} from './trip-logistics.ts';

export type CalendarEvent={id:string;title:string;start:string;end:string;timezone?:string;allDay?:boolean;location?:string;description?:string};
const nextDay=(day:string)=>new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
function accommodationEvent(id:string,title:string,date:string,time:string|undefined,timezone:string|undefined,location:string):CalendarEvent{
 if(time&&timezone){
  const start=localTimeToUtc(date+'T'+time,timezone);
  return {id,title,start:start.toISOString(),end:new Date(start.getTime()+3600000).toISOString(),location};
 }
 return {id,title,start:date,end:nextDay(date),allDay:true,location};
}
/** Never export confirmation codes, private booking links or personal notes. */
export function createAccommodationEvents(a:Accommodation):CalendarEvent[]{
 if(a.status==='cancelled')return [];
 const location=[a.name,a.address,a.city].filter(Boolean).join(' · ');
 return [
  accommodationEvent(a.id+'-checkin','Check-in · '+a.name,a.checkIn,a.checkInTime,a.timezone,location),
  accommodationEvent(a.id+'-checkout','Check-out · '+a.name,a.checkOut,a.checkOutTime,a.timezone,location)
 ];
}
export function createTransportEvent(t:TransportSegment):CalendarEvent{
 if(t.status==='cancelled')throw Error('No se exportan reservas canceladas.');
 const from=localTimeToUtc(t.departureAt,t.departureTimezone),to=localTimeToUtc(t.arrivalAt,t.arrivalTimezone);
 if(to.getTime()<=from.getTime())throw Error('La llegada debe ser posterior a la salida.');
 const labels:Record<TransportSegment['kind'],string>={flight:'Vuelo',train:'Tren',bus:'Autobús',ferry:'Ferry',transfer:'Traslado',rental_car:'Coche de alquiler',other:'Transporte'};
 return {id:t.id+'-transport',title:labels[t.kind]+' · '+t.origin+' → '+t.destination,start:from.toISOString(),end:to.toISOString(),location:t.origin,
 description:[t.company,t.serviceNumber?'Servicio '+t.serviceNumber:'','Destino: '+t.destination].filter(Boolean).join('\n')};
}
const escapeText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\n|\r/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const compact=(value:string)=>value.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function fold(line:string):string{
 const result:string[]=[];let current='',bytes=0;
 for(const codepoint of line){
  const count=new TextEncoder().encode(codepoint).length;
  if(bytes+count>75){result.push(current);current=' ';bytes=1}
  current+=codepoint;bytes+=count;
 }
 return [...result,current].join('\r\n');
}
export function serializeCalendar(events:CalendarEvent[]):string{
 const stamp=compact(new Date().toISOString()),rows=['BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','METHOD:PUBLISH','PRODID:-//Viaja//Trip Logistics//ES'];
 for(const e of events){
  rows.push('BEGIN:VEVENT','UID:'+e.id.replace(/[^a-z0-9_-]/gi,'-')+'@viaja.app','DTSTAMP:'+stamp);
  if(e.allDay)rows.push('DTSTART;VALUE=DATE:'+compact(e.start),'DTEND;VALUE=DATE:'+compact(e.end));
  else rows.push('DTSTART:'+compact(e.start.endsWith('Z')?e.start:localTimeToUtc(e.start,e.timezone||'UTC').toISOString()),
   'DTEND:'+compact(e.end.endsWith('Z')?e.end:localTimeToUtc(e.end,e.timezone||'UTC').toISOString()));
  rows.push('SUMMARY:'+escapeText(e.title));
  if(e.description)rows.push('DESCRIPTION:'+escapeText(e.description));
  if(e.location)rows.push('LOCATION:'+escapeText(e.location));
  rows.push('END:VEVENT');
 }
 return rows.concat('END:VCALENDAR').map(fold).join('\r\n')+'\r\n';
}
export function downloadCalendarFile(events:CalendarEvent[],filename:string):void{
 if(!events.length)throw Error('No hay reservas activas para exportar.');
 if(typeof document==='undefined')throw Error('El calendario puede descargarse desde Viaja en el navegador.');
 const data=serializeCalendar(events),url=URL.createObjectURL(new Blob([data],{type:'text/calendar;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;
 a.download=(filename.replace(/[^a-z0-9áéíóúñ_-]+/gi,'-').replace(/\.ics$/i,'').slice(0,85)||'viaja-calendario')+'.ics';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
