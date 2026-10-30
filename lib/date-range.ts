/** Local-calendar helpers; never derive dates from UTC midnight. */
export const todayLocal=()=>new Date().toLocaleDateString('sv-SE');
export const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00'));
export const dateFromISO=(s:string)=>new Date(s+'T12:00:00');
export const isoFromDate=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
export function normalizeTripDates(start:string,end:string){
 return {start,end:start&&end&&end<start?'':end};
}
export function formattedDate(s:string){
 return validDate(s)?dateFromISO(s).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}):'Elegí una fecha';
}
export function calendarDays(year:number,month:number){
 const first=new Date(year,month,1,12);
 const offset=(first.getDay()+6)%7;
 return Array.from({length:42},(_,i)=>isoFromDate(new Date(year,month,1-offset+i,12)));
}
