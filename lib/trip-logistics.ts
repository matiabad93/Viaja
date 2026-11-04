import type {Accommodation,TransportSegment,Plan,TripLogistics} from './travel.ts';

export const emptyLogistics=():TripLogistics=>({accommodations:[],transports:[]});
export function logisticsOf(plan:Plan):TripLogistics{
 return {accommodations:Array.isArray(plan.logistics?.accommodations)?plan.logistics.accommodations:[],
 transports:Array.isArray(plan.logistics?.transports)?plan.logistics.transports:[]};
}
export function validTimezone(zone:string):boolean{
 try{new Intl.DateTimeFormat('en-GB',{timeZone:zone}).format(new Date());return true}catch{return false}
}
export function validDay(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function httpsUrl(value:string):boolean{try{return new URL(value).protocol==='https:'}catch{return false}}
/** Convert a wall-clock time in its IANA zone to UTC, across DST transitions.
    Ambiguous autumn hours take the earliest occurrence; missing spring hours fail. */
export function localTimeToUtc(local:string,zone:string):Date{
 if(!validTimezone(zone))throw Error('Elegí una zona horaria válida, por ejemplo Europe/Paris.');
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local);
 if(!match)throw Error('Ingresá una fecha y hora válidas.');
 const [y,m,d,h,min,sec]=match.slice(1).map(Number);
 const naive=Date.UTC(y,m-1,d,h,min,sec||0),check=new Date(naive);
 if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||check.getUTCHours()!==h||check.getUTCMinutes()!==min||check.getUTCSeconds()!==(sec||0))throw Error('Fecha y hora inexistentes.');
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const parts=(stamp:number)=>Object.fromEntries(formatter.formatToParts(new Date(stamp)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const offset=(stamp:number)=>{const p=parts(stamp);return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(stamp/1000)*1000)/60000)};
 const offsets=new Set([-172800000,-86400000,-43200000,0,43200000,86400000,172800000].map(delta=>offset(naive+delta)));
 const possibilities=[...offsets].map(o=>naive-o*60000).filter(stamp=>{const p=parts(stamp);return p.year===y&&p.month===m&&p.day===d&&p.hour===h&&p.minute===min&&p.second===(sec||0)}).sort((a,b)=>a-b);
 if(!possibilities.length)throw Error('Esta hora no existe en esa ciudad por el cambio de horario de verano.');
 return new Date(possibilities[0]);
}
export function validateAccommodation(a:Accommodation):string[]{
 const errors:string[]=[];
 if(!a.name.trim())errors.push('Completá el nombre del alojamiento.');
 if(!a.address.trim())errors.push('Completá la dirección.');
 if(!validDay(a.checkIn)||!validDay(a.checkOut)||a.checkOut<=a.checkIn)errors.push('El check-out debe ser posterior al check-in.');
 if(a.bookingUrl&&!httpsUrl(a.bookingUrl))errors.push('La URL de reserva debe usar HTTPS.');
 if(a.timezone&&!validTimezone(a.timezone))errors.push('La zona horaria no existe.');
 if((a.checkInTime||a.checkOutTime)&&!a.timezone)errors.push('Indicá la zona horaria para usar horarios de entrada o salida.');
 for(const [date,time] of [[a.checkIn,a.checkInTime],[a.checkOut,a.checkOutTime]]){
  if(time&&a.timezone&&validDay(date))try{localTimeToUtc(date+'T'+time,a.timezone)}catch(e){errors.push((e as Error).message)}
 }
 if(a.amount!==undefined&&(!Number.isFinite(a.amount)||a.amount<0))errors.push('El importe no es válido.');
 return errors;
}
export function validateTransport(t:TransportSegment):string[]{
 const errors:string[]=[];
 if(!t.origin.trim()||!t.destination.trim())errors.push('Completá origen y destino.');
 if(!validTimezone(t.departureTimezone)||!validTimezone(t.arrivalTimezone))errors.push('Indicá una zona horaria IANA válida para salida y llegada.');
 if(t.bookingUrl&&!httpsUrl(t.bookingUrl))errors.push('La URL de reserva debe usar HTTPS.');
 if(validTimezone(t.departureTimezone)&&validTimezone(t.arrivalTimezone))try{
  const a=localTimeToUtc(t.departureAt,t.departureTimezone);
  const b=localTimeToUtc(t.arrivalAt,t.arrivalTimezone);
  if(b.getTime()<=a.getTime())errors.push('La llegada debe ser posterior a la salida, considerando las zonas horarias.');
 }catch(e){errors.push((e as Error).message)}
 return errors;
}
export function tripDateWarning(start:string,end:string,tripStart:string,tripEnd:string):string{
 return tripStart&&tripEnd&&(start<tripStart||end>tripEnd)?
 'Las fechas no coinciden con el rango del viaje. Podés guardar la reserva, pero revisá el itinerario.':'';
}
export function chronological(a:TransportSegment,b:TransportSegment):number{
 try{return localTimeToUtc(a.departureAt,a.departureTimezone).getTime()-localTimeToUtc(b.departureAt,b.departureTimezone).getTime()}
 catch{return a.departureAt.localeCompare(b.departureAt)}
}
