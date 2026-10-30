/** UI guard: stops can only be appended after the preceding city was chosen
 * from an autocomplete option. Existing saved values are treated as confirmed.
 */
export function canAppendDestination(
 main:string,
 confirmedMain:string,
 extras:string[],
 confirmedExtras:string[],
 maxExtra=5
):boolean {
 if(!main.trim()||confirmedMain!==main.trim()||extras.length>=maxExtra)return false;
 return extras.every((city,index)=>!!city.trim()&&confirmedExtras[index]===city.trim());
}
export function swapStops<T>(items:T[],index:number,other:number):T[]{
 if(index<0||other<0||index>=items.length||other>=items.length)return [...items];
 const result=[...items];
 [result[index],result[other]]=[result[other],result[index]];
 return result;
}

/** Preserve the ordered route when the first (canonical) destination changes.
 * Old city coordinates belong to the previous first stop, so clear them after a swap.
 */
export function swapTripStops<T extends {destination:string;additionalDestinations?:string[];city?:unknown}>(
 trip:T,index:number,other:number
):T{
 const stops=[trip.destination,...(trip.additionalDestinations||[])];
 if(index<0||other<0||index>=stops.length||other>=stops.length)return {...trip};
 const ordered=swapStops(stops,index,other);
 return {...trip,destination:ordered[0],additionalDestinations:ordered.slice(1),
  ...(ordered[0]!==trip.destination?{city:undefined}:{})};
}
