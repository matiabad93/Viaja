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
