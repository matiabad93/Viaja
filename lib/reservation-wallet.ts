/** Read-only travel-day hints derived from private reservation metadata.
 * No PDF bytes, signed links or booking references are persisted in browser storage.
 */
import type {ReservationFile} from './reservation-library.ts';

export type WalletSummary = {
 date: string;
 time: string;
 dateLabel: string;
 route: string;
 secondary: string;
 reference: string;
 sortGroup: number;
};

function validDate(value: string): string {
 const day = value.slice(0, 10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return '';
 const d = new Date(day + 'T00:00:00Z');
 return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day ? day : '';
}

type Event = {date:string;time:string;dateLabel:string;route:string;secondary:string};

export function reservationWalletSummary(
 item: ReservationFile,
 today: string = new Date().toLocaleDateString('sv-SE')
): WalletSummary {
 const details = item.details;
 const events: Event[] = [];
 for(const flight of details.flights) {
  const date = validDate(flight.departureAt);
  if(!date)continue;
  events.push({
   date, time: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(flight.departureAt)?flight.departureAt.slice(11,16):'',
   dateLabel:'Salida',
   route:[flight.origin,flight.destination].filter(Boolean).join(' → ')||flight.company||item.title||item.filename,
   secondary:[flight.company,flight.serviceNumber].filter(Boolean).join(' · ')
  });
 }
 const lodging = details.lodging;
 if(lodging) {
  const date = validDate(lodging.checkIn);
  if(date)events.push({
   date,time:'',dateLabel:'Check-in',
   route:[lodging.name,lodging.city].filter(Boolean).join(' · ')||item.title||item.filename,
   secondary:lodging.address||lodging.provider
  });
 }
 // Upcoming events first; if all dates passed, highlight the most recent event.
 const future = events.filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
 const past = events.filter(x=>x.date<today).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
 const selected = future[0]||past[0];
 const fallbackFlight = details.flights[0];
 const route = selected?.route||
  (fallbackFlight?[fallbackFlight.origin,fallbackFlight.destination].filter(Boolean).join(' → '):'')||
  (lodging?[lodging.name,lodging.city].filter(Boolean).join(' · '):'')||
  details.provider||item.title||item.filename;
 return {
  date:selected?.date||'',time:selected?.time||'',dateLabel:selected?.dateLabel||'',
  route,secondary:selected?.secondary||details.provider||'',
  reference:details.bookingReference||'',
  sortGroup:future.length?0:selected?2:1
 };
}

export function sortWalletReservations(
 items: ReservationFile[],
 today: string = new Date().toLocaleDateString('sv-SE')
): ReservationFile[] {
 const summaries = new Map(items.map(item=>[item.id,reservationWalletSummary(item,today)]));
 return [...items].sort((a,b)=>{
  const x=summaries.get(a.id)!,y=summaries.get(b.id)!;
  if(x.sortGroup!==y.sortGroup)return x.sortGroup-y.sortGroup;
  if(x.date!==y.date)return x.sortGroup===2?y.date.localeCompare(x.date):x.date.localeCompare(y.date);
  return b.created_at.localeCompare(a.created_at);
 });
}
