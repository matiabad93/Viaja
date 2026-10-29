import {itineraryOf,money,spent,type Plan} from './travel.ts';

// Dependency-free A4 PDF writer. Uses Helvetica/WinAnsi for Spanish punctuation.
const W=595.28,H=841.89,M=48,usable=W-2*M;
const codes:Record<number,number>={0x2013:150,0x2014:151,0x2018:145,0x2019:146,0x201c:147,0x201d:148,0x2022:149,0x20ac:128};
const escaped=(text:string)=>'('+Array.from(text).map(c=>{const n=c.charCodeAt(0),v=n<=255?n:codes[n]??63;return v===40||v===41||v===92?'\\'+String.fromCharCode(v):v<32||v>126?'\\'+v.toString(8).padStart(3,'0'):c}).join('')+')';
const wrap=(str:string,size:number,max=usable)=>{const out:string[]=[];for(const para of str.split(/\r?\n/)){const words=para.trim().split(/\s+/);let line='';if(!para.trim()){out.push('');continue}for(let word of words){const limit=Math.max(6,Math.floor(max/(size*.51)));while(word.length>limit){if(line){out.push(line);line=''}out.push(word.slice(0,limit));word=word.slice(limit)}if(line&&line.length+1+word.length>limit){out.push(line);line=''}line=line?line+' '+word:word}out.push(line)}return out};
export function buildTripPdf(plan:Plan):Uint8Array{
 const pages:string[][]=[[]];let page=pages[0],y=H-65;
 const add=(s:string)=>page.push(s);
 const newPage=()=>{page=[];pages.push(page);y=H-60};
 const room=(height:number)=>{if(y-height<65)newPage()};
 const line=(s:string,size=10,bold=false,indent=0,space=size*1.55)=>{
  for(const part of wrap(String(s||''),size,usable-indent)){room(space);if(part)add('0.12 0.26 0.21 rg BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+(M+indent)+' '+y.toFixed(1)+' Tm '+escaped(part)+' Tj ET');y-=space}
 };
 const heading=(s:string)=>{room(45);y-=16;line(s,16,true,0,24);y-=7};
 const sub=(s:string)=>{room(30);y-=5;line(s,11,true,0,18)};
 const data=(k:string,v:string)=>line(k+': '+v,10,false,0,16);
 const trip=plan.trip,days=itineraryOf(plan),expenses=plan.expenses||[];
 add('0.12 0.28 0.22 rg 0 775 596 67 re f');
 add('1 1 1 rg BT /F2 27 Tf 1 0 0 1 48 801 Tm (viaja.) Tj ET');
 y=747;line(trip.destination||'Mi viaje',24,true,0,31);
 line((trip.start||'Sin fecha')+' - '+(trip.end||'Sin regreso')+' | '+trip.travelers+' viajeros',10,false,0,18);
 heading('Resumen del viaje');
 data('Ciudad de salida',trip.origin);data('Duración',days.length+' días');data('Ritmo',trip.pace);data('Transporte',trip.transport);
 data('Presupuesto del grupo',money(trip.budget));data('Gastado',money(spent(plan)));data('Disponible',money(trip.budget-spent(plan)));
 if(trip.notes?.trim()){sub('Notas y preferencias');line(trip.notes,10)}
 heading('Itinerario completo');
 days.forEach((day,i)=>{
  const date=trip.start?new Date(Date.parse(trip.start)+i*86400000).toISOString().slice(0,10):'Fecha sin definir';
  room(70);sub('Día '+(i+1)+' · '+date);line(day.title||'Día libre',10,false,0,18);
  if(!day.activities.length)line('Sin actividades registradas.',9,false,12,15);
  day.activities.forEach((a,j)=>{room(68);sub((j+1)+'. '+(a.time||'Flexible')+' - '+a.title);
   if(a.duration)line('Duración: '+a.duration,9,false,12,14);
   if(a.location)line('Ubicación: '+a.location,9,false,12,14);
   if(a.description)line(a.description,9,false,12,14);
   if(a.price)line('Precio: '+a.price,9,false,12,14);
   if(a.reservation)line('Reserva: '+a.reservation,9,false,12,14);
   if(a.completed)line('Realizada',9,false,12,14);
   if(a.source)line('Fuente: '+a.source,8,false,12,13);
   y-=5;
  });
 });
 heading('Gastos y presupuesto');
 if(expenses.length)expenses.forEach((e,i)=>{room(40);line((i+1)+'. '+e.label+' - '+money(e.amount),10,true);line((e.date||'Sin fecha')+' · '+(e.category||'Sin categoría'),9,false,12,14)});
 else line('Sin gastos registrados.',10);
 y-=8;data('Total gastado',money(spent(plan)));data('Presupuesto total',money(trip.budget));data('Saldo',money(trip.budget-spent(plan)));
 if(plan.parts?.length){heading('Informe y recomendaciones');for(const part of plan.parts){line(part.text,9,false,0,14);y-=6}}
 heading('Fuentes y referencias');
 if(plan.sources?.length)for(const source of plan.sources){line(source.title||'Fuente',10,true);line(source.url,8,false,0,13)}
 else line('Sin fuentes verificadas asociadas.',9);
 if(trip.links?.trim()){sub('Enlaces guardados');line(trip.links,8)}
 heading('Información importante');
 line('Los horarios, precios, trayectos y actividades propuestos pueden ser orientativos. Confirmá las reservas, las condiciones y los datos actuales antes de viajar.',9);
 const objects:string[]=[];const object=(s:string)=>{objects.push(s);return objects.length};
 const f1=object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 const f2=object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const pagesId=object(''),refs:number[]=[];
 pages.forEach((commands,i)=>{
  commands.push('0.7 0.74 0.7 RG 0.5 w 48 44 m 547 44 l S');
  commands.push('0.4 0.48 0.42 rg BT /F1 8 Tf 1 0 0 1 48 29 Tm (Viaja - itinerario personal) Tj ET');
  commands.push('0.4 0.48 0.42 rg BT /F1 8 Tf 1 0 0 1 487 29 Tm '+escaped('Página '+(i+1)+'/'+pages.length)+' Tj ET');
  const stream=commands.join('\n')+'\n';
  const contentId=object('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
  refs.push(object('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+contentId+' 0 R >>'));
 });
 objects[pagesId-1]='<< /Type /Pages /Kids ['+refs.map(n=>n+' 0 R').join(' ')+'] /Count '+pages.length+' >>';
 const catalog=object('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
 let result='%PDF-1.4\n',offsets=[0];
 objects.forEach((s,i)=>{offsets.push(result.length);result+=(i+1)+' 0 obj\n'+s+'\nendobj\n'});
 const pointer=result.length;result+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<offsets.length;i++)result+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 result+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+pointer+'\n%%EOF';
 return Uint8Array.from(result,c=>c.charCodeAt(0));
}
export function downloadTripPdf(plan:Plan){
 const bytes=buildTripPdf(plan),blob=new Blob([bytes as BlobPart],{type:'application/pdf'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='viaja-'+plan.trip.destination.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').slice(0,45)+'.pdf';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
